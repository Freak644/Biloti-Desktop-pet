# 🐈 Desktop Pet

A tiny desktop companion powered by **Tauri + React + Rust**.

Meet **Biloti** — a pixel-art cat that lives on your desktop, watches your cursor, reacts to keyboard input, gets curious when you come close, and sleeps when you're away.

> 🚧 **Version 1.0 — Linux release**

---

## ✨ Features

- 🐈 Pixel-art desktop pet named **Biloti**
- 👀 Eyes follow the cursor
- 🖱️ Cursor proximity reactions
- ⌨️ Reacts to keyboard input with alternating paw animations
- 😴 Goes to sleep after inactivity
- ⚡ Wakes up when interacted with
- 😌 Random idle animations
- 💨 Subtle breathing animation while idle
- 😉 Random blinking
- 🖱️ Drag Biloti around the desktop
- 🖥️ Multi-monitor support
- 📏 Adjustable pet size
- 👻 Show/hide Biloti from the settings app
- 🔝 Keeps Biloti above other windows
- 🌐 Global keyboard and mouse tracking on Linux

---

## 🛠️ Tech Stack

- **Tauri 2**
- **React**
- **Vite**
- **Rust**
- **evdev** — global Linux input events
- **udev** — Linux input-device discovery and permissions
- **zbus** — GNOME/Mutter monitor information
- **Tailwind CSS**

---

## 🐧 Linux

Desktop Pet currently targets Linux.

The application uses Linux input devices to detect global keyboard and mouse activity.

During installation, the Debian package installs the required udev configuration so the application can access the relevant input devices without requiring the user to launch the app with `sudo`.

Biloti also uses the X11 backend on Linux so that the desktop "always on top" behavior works correctly.

---

## 📦 Installation

Download the latest `.deb` package from the **Releases** page.

Install it with:

```bash
sudo apt install ./desktop-pet_*.deb
```

After installation, launch **Desktop Pet** from your application menu.

---

## 🧑‍💻 Development

### Requirements

- Node.js
- npm
- Rust
- Cargo
- Tauri 2 dependencies
- Linux desktop environment

### Clone
```bash
git clone https://github.com/Freak644/desktop-pet.git
cd desktop-pet
```

### Install dependencies
```bash
npm install
```

### Development
```bash
npm run tauri dev
```

For Linux input development, your user needs permission to access the required `/dev/input/event*` devices.

### Build
```bash
npm run tauri build
```

Build only the Debian package:
```bash
npm run tauri build -- --bundles deb
```

The generated package will be available under:
```text
src-tauri/target/release/bundle/deb/
```

---

## 🎮 How Biloti Behaves

### Cursor

Biloti tracks the cursor and moves its eyes toward it.

When the cursor gets close, Biloti can trigger a small curiosity animation.

### Keyboard

Global keyboard activity can trigger Biloti's paw animation.

The paw alternates between left and right.

### Interaction

Clicking Biloti makes it blink and allows it to be dragged around the desktop.

### Sleep

After a period of inactivity, Biloti goes to sleep.

Keyboard or mouse interaction wakes it back up.

---

## 🖥️ Project Structure
```text
desktop-pet/
├── src/
│   ├── ...
│   └── petMain.jsx
│
├── src-tauri/
│   ├── src/
│   │   └── lib.rs
│   ├── deb/
│   │   ├── postinst
│   │   └── postremove
│   ├── resources/
│   │   └── 70-desktop-pet-input.rules
│   ├── tauri.conf.json
│   └── tauri.linux.conf.json
│
├── biloti.html
├── index.html
├── vite.config.js
└── package.json
```

---

## 🔐 Permissions

Desktop Pet needs access to Linux input devices for global keyboard and mouse tracking.

The application only targets devices identified by udev as:

- Keyboard
- Mouse
- Touchpad

The Debian installer configures the required udev access automatically.

---

## 🚧 Current Version

### V1

The first version focuses on making Biloti a simple desktop companion.

Current focus:

- stable desktop presence
- global input tracking
- cursor tracking
- animations
- sleeping/waking
- dragging
- multi-monitor support
- settings

More pets, behaviors, customization, and platform support can come later.

---

## 📸 Screenshots

Add screenshots here:
```markdown
![Desktop Pet](screenshots/desktop-pet.png)
```

---

## 🤝 Contributing

Contributions, ideas, bug reports, and feature requests are welcome.

Feel free to open an issue or submit a pull request.

---

## 📄 License

Add your license here.

For example:
```text
MIT License
```

---

## ❤️ About

Desktop Pet is a small project built to create a fun little companion that lives directly on your desktop.

**Say hello to Biloti. 🐈‍⬛**

