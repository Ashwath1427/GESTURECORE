import { GESTURE_STATES } from './constants.js';

class AppStateCore {
    constructor() {
        this.trackingStatus = 'Offline'; // Offline, Initializing, Active, Lost, Error: <reason>
        this.gestureState = GESTURE_STATES.IDLE;
        this.handDetected = false;
        this.transformMode = 'Select'; // Select, Translate, Rotate, Scale
        this.selectedObject = null;
        
        // Callbacks for UI updates
        this.listeners = [];
    }

    subscribe(callback) {
        this.listeners.push(callback);
    }

    notify() {
        this.listeners.forEach(cb => cb(this));
    }

    setTrackingStatus(status) {
        if(this.trackingStatus !== status) {
            this.trackingStatus = status;
            this.notify();
        }
    }

    setGestureState(state) {
        if(this.gestureState !== state) {
            this.gestureState = state;
            this.notify();
        }
    }

    setHandDetected(detected) {
        if(this.handDetected !== detected) {
            this.handDetected = detected;
            this.notify();
        }
    }

    setTransformMode(mode) {
        if(this.transformMode !== mode) {
            this.transformMode = mode;
            this.notify();
        }
    }

    setSelectedObject(obj) {
        if(this.selectedObject !== obj) {
            this.selectedObject = obj;
            this.notify();
        }
    }
}

// Export singleton
export const AppState = new AppStateCore();
