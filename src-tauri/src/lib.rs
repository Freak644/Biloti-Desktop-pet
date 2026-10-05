use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use tauri::Emitter;

#[derive(Clone, serde::Serialize, Debug)]
struct MutterMonitor {
    connector: String,
    vendor: String,
    product: String,
    serial: String,
    x: i32,
    y: i32,
    scale: f64,
    transform: u32,
    primary: bool,
}

#[derive(Clone, serde::Serialize)]
struct InputEvent {
    event_type: String,
    code: u16,
    value: i32,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct CursorPosition {
    x: i32,
    y: i32,
}

#[tauri::command]
fn get_mutter_monitors() -> Result<Vec<MutterMonitor>, String> {
    use std::collections::HashMap;

    use zbus::blocking::{Connection, Proxy};
    use zbus::zvariant::OwnedValue;

    let connection =
        Connection::session().map_err(|e| e.to_string())?;

    let proxy = Proxy::new(
        &connection,
        "org.gnome.Mutter.DisplayConfig",
        "/org/gnome/Mutter/DisplayConfig",
        "org.gnome.Mutter.DisplayConfig",
    )
    .map_err(|e| e.to_string())?;

    let reply = proxy
        .call_method("GetCurrentState", &())
        .map_err(|e| e.to_string())?;

    let (
        _serial,
        monitors,
        logical_monitors,
        _properties,
    ): (
        u32,
        Vec<(
            (String, String, String, String),
            Vec<(
                String,
                i32,
                i32,
                f64,
                f64,
                Vec<f64>,
                HashMap<String, OwnedValue>,
            )>,
            HashMap<String, OwnedValue>,
        )>,
        Vec<(
            i32,
            i32,
            f64,
            u32,
            bool,
            Vec<(String, String, String, String)>,
            HashMap<String, OwnedValue>,
        )>,
        HashMap<String, OwnedValue>,
    ) = reply
        .body()
        .deserialize()
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();

    for (
        x,
        y,
        scale,
        transform,
        primary,
        physical_monitors,
        _logical_properties,
    ) in logical_monitors
    {
        for physical in physical_monitors {
            let exists = monitors
                .iter()
                .any(|monitor| monitor.0 == physical);

            if exists {
                result.push(MutterMonitor {
                    connector: physical.0.clone(),
                    vendor: physical.1.clone(),
                    product: physical.2.clone(),
                    serial: physical.3.clone(),
                    x,
                    y,
                    scale,
                    transform,
                    primary,
                });
            }
        }
    }

    Ok(result)
}

#[tauri::command]
fn set_cursor_position(
    position: CursorPosition,
    cursor_position: tauri::State<'_, Arc<Mutex<CursorPosition>>>,
) {
    if let Ok(mut cursor) = cursor_position.lock() {
        cursor.x = position.x;
        cursor.y = position.y;
    }
}

fn start_evdev_tracker(
    app_handle: tauri::AppHandle,
    cursor_position: Arc<Mutex<CursorPosition>>,
) {
    thread::spawn(move || {
        let mut enumerator = match udev::Enumerator::new() {
            Ok(enumerator) => enumerator,

            Err(error) => {
                eprintln!(
                    "UDEV: failed to create enumerator: {}",
                    error
                );

                return;
            }
        };

        if let Err(error) = enumerator.match_subsystem("input") {
            eprintln!(
                "UDEV: failed to match input subsystem: {}",
                error
            );

            return;
        }

        let devices = match enumerator.scan_devices() {
            Ok(devices) => devices,

            Err(error) => {
                eprintln!(
                    "UDEV: failed to scan input devices: {}",
                    error
                );

                return;
            }
        };

        for device in devices {
            let is_keyboard = device
                .property_value("ID_INPUT_KEYBOARD")
                .and_then(|value| value.to_str())
                == Some("1");

            let is_mouse = device
                .property_value("ID_INPUT_MOUSE")
                .and_then(|value| value.to_str())
                == Some("1");

            let is_touchpad = device
                .property_value("ID_INPUT_TOUCHPAD")
                .and_then(|value| value.to_str())
                == Some("1");

            if !is_keyboard && !is_mouse && !is_touchpad {
                continue;
            }

            let Some(path) = device.devnode() else {
                continue;
            };

            if !path
                .file_name()
                .and_then(|name| name.to_str())
                .map(|name| name.starts_with("event"))
                .unwrap_or(false)
            {
                continue;
            }

            let path = path.to_path_buf();
            let app_handle = app_handle.clone();
            let cursor_position = Arc::clone(&cursor_position);

            thread::spawn(move || {
                let mut device = match evdev::Device::open(&path) {
                    Ok(device) => device,

                    Err(error) => {
                        eprintln!(
                            "EVDEV: failed to open {}: {}",
                            path.display(),
                            error
                        );

                        return;
                    }
                };

                eprintln!(
                    "EVDEV: tracking {} ({})",
                    path.display(),
                    device.name().unwrap_or("unknown")
                );

                loop {
                    match device.fetch_events() {
                        Ok(events) => {
                            for event in events {
                                let event_type = event.event_type();
                                let code = event.code();
                                let value = event.value();

                                app_handle
                                    .emit(
                                        "global-input",
                                        InputEvent {
                                            event_type: format!(
                                                "{:?}",
                                                event_type
                                            ),
                                            code,
                                            value,
                                        },
                                    )
                                    .ok();

                                if event_type
                                    == evdev::EventType::RELATIVE
                                {
                                    if let Ok(mut cursor) =
                                        cursor_position.lock()
                                    {
                                        match code {
                                            // REL_X
                                            0 => {
                                                cursor.x += value;
                                            }

                                            // REL_Y
                                            1 => {
                                                cursor.y += value;
                                            }

                                            _ => {}
                                        }

                                        let position = cursor.clone();

                                        app_handle
                                            .emit(
                                                "cursor-moved",
                                                position,
                                            )
                                            .ok();
                                    }
                                }
                            }
                        }

                        Err(error) => {
                            eprintln!(
                                "EVDEV: {}: {}",
                                path.display(),
                                error
                            );

                            thread::sleep(
                                Duration::from_millis(10),
                            );
                        }
                    }
                }
            });
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {

    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WINIT_UNIX_BACKEND", "x11");
        std::env::set_var("GDK_BACKEND", "x11");
    }

    let cursor_position =
        Arc::new(Mutex::new(CursorPosition {
            x: 0,
            y: 0,
        }));

    tauri::Builder::default()
        
        .manage(Arc::clone(&cursor_position))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(
            tauri::generate_handler![
                get_mutter_monitors,
                set_cursor_position
            ]
        )
        .setup(move |app| {
            start_evdev_tracker(
                app.handle().clone(),
                Arc::clone(&cursor_position),
            );

            tauri::WebviewWindowBuilder::new(
                app,
                "biloti",
                tauri::WebviewUrl::App("biloti.html".into()),
            )
            .title("Biloti")
            .inner_size(200.0, 200.0)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .build()
            .expect("failed to create Biloti window");

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}