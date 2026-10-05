import { availableMonitors} from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

function normalizeMonitor(monitor, index, primary) {
    const position = monitor.position;
    const size = monitor.size;

    return {
        id: createMonitorId(monitor, index),

        name: monitor.name ?? `Display ${index + 1}`,

        primary,

        position: {
            x: position.x,
            y: position.y,
        },

        size: {
            width: size.width,
            height: size.height,
        },

        scaleFactor: monitor.scaleFactor,

        assignedPet: null,
    };
}



function createMonitorId(monitor, index) {
    if (monitor.name) {
        return `display:${monitor.name}`;
    }

    return `display:runtime-${index}`;
}


function sameMonitor(a, b) {
    return (
        a.name === b.name &&
        a.position.x === b.position.x &&
        a.position.y === b.position.y &&
        a.size.width === b.size.width &&
        a.size.height === b.size.height &&
        a.scaleFactor === b.scaleFactor
    );
}


function sameDisplayList(a, b) {
    if (a.length !== b.length) {
        return false;
    }

    return a.every((monitor, index) =>
        sameMonitor(monitor, b[index])
    );
}


class DisplayManager {

    constructor() {
        this.displays = [];
        this.listeners = new Set();
        this.interval = null;
    }


async getDisplays() {
    const monitors = await availableMonitors();

    const mutterMonitors =
        await invoke("get_mutter_monitors");

    return monitors.map((monitor, index) => {
        const position = monitor.position;
        const size = monitor.size;

        const mutterMonitor =
            mutterMonitors.find((mutter) => {
                return (
                    mutter.x === position.x &&
                    mutter.y === position.y
                );
            });

        return normalizeMonitor(
            monitor,
            index,
            mutterMonitor?.primary ?? false
        );
    });
}


    async refresh() {

        try {

            const nextDisplays =
                await this.getDisplays();

            const changed =
                !sameDisplayList(
                    this.displays,
                    nextDisplays
                );

            if (changed) {

                nextDisplays.forEach((nextDisplay) => {

                    const previousDisplay =
                        this.displays.find(
                            (display) =>
                                display.id === nextDisplay.id
                        );

                    if (previousDisplay) {
                        nextDisplay.assignedPet =
                            previousDisplay.assignedPet;
                    }

                });

                this.displays = nextDisplays;

                this.listeners.forEach(
                    (listener) => listener(this.displays)
                );
            }

            return this.displays;

        } catch (error) {

           

            return this.displays;
        }
    }


    subscribe(listener) {

        this.listeners.add(listener);

        return () => {
            this.listeners.delete(listener);
        };
    }


    start(interval = 1000) {

        if (this.interval) {
            return;
        }

        this.refresh();

        this.interval = setInterval(
            () => this.refresh(),
            interval
        );
    }


    stop() {

        if (!this.interval) {
            return;
        }

        clearInterval(this.interval);

        this.interval = null;
    }

    assignPet(displayId, petId) {

        const display = this.displays.find(
            (display) => display.id === displayId
        );

        if (!display) {
   

            return false;
        }

        display.assignedPet = petId;

        this.listeners.forEach(
            (listener) => listener(this.displays)
        );

        return true;
    }

    getCurrentDisplays() {
        return this.displays;
    }

    // Finds the display whose bounds contain the given point.
    // x/y are expected in the same physical-pixel, desktop-relative
    // space as Tauri's cursorPosition()/outerPosition() and the
    // monitor list from availableMonitors().
    getDisplayAtPoint(x, y) {
        return (
            this.displays.find((display) => {
                const { position, size } = display;
                return (
                    x >= position.x &&
                    x < position.x + size.width &&
                    y >= position.y &&
                    y < position.y + size.height
                );
            }) ?? null
        );
    }

    // Finds which display a given window currently lives on, using
    // the window's center point (safer than top-left when a window
    // straddles a boundary while being dragged).
    getDisplayForWindow(windowPosition, windowSize) {
        const centerX = windowPosition.x + windowSize.width / 2;
        const centerY = windowPosition.y + windowSize.height / 2;
        return this.getDisplayAtPoint(centerX, centerY);
    }
}


export const displayManager =
    new DisplayManager();