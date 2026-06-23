import { MediaPipeRunner } from './mediapipe.js';
import { GestureClassifier } from './gesture.js';
import { ViewportMapper } from './viewport-mapper.js';
import { AppState } from './app-state.js';
import { GESTURE_STATES, GESTURE_RAW, GESTURE } from './constants.js';

export class GesturePipeline {
    constructor(transformSystem, uiManager, container) {
        this.transformSystem = transformSystem;
        this.uiManager = uiManager;
        this.container = container;
        
        this.mediaPipe = new MediaPipeRunner();
        this.classifier = new GestureClassifier();
        this.viewportMapper = new ViewportMapper(container);
        
        this.isActive = false;
        this.toggleBtn = document.getElementById('btn-toggle-gesture');
        this.badge = document.getElementById('gesture-badge');
        
        this.prevWrist = null;

        this.setupUI();
    }

    setupUI() {
        this.mediaPipe.onButtonStateChange = (msg, disabled) => {
            this.toggleBtn.textContent = msg;
            this.toggleBtn.style.pointerEvents = disabled ? 'none' : 'auto';
            if (msg.includes('Active')) {
                this.toggleBtn.classList.add('active');
            } else {
                this.toggleBtn.classList.remove('active');
            }
        };

        this.toggleBtn.onclick = () => {
            if (this.toggleBtn.style.pointerEvents === 'none') return;
            if (this.toggleBtn.textContent.includes('Error')) {
                this.isActive = false;
            }

            this.isActive = !this.isActive;
            if (this.isActive) {
                this.startTracking();
            } else {
                this.stopTracking();
            }
        };

        this.mediaPipe.onLandmarks = (results) => {
            this.processFrame(results);
        };
    }

    async startTracking() {
        await this.mediaPipe.start();
        if (!this.mediaPipe.webcamRunning) {
            this.isActive = false;
        }
    }

    stopTracking() {
        this.isActive = false;
        this.mediaPipe.stop();
        this.hideBadge();
        
        // Reset state
        AppState.setGestureState(GESTURE_STATES.IDLE);
        AppState.setHandDetected(false);
        this.uiManager.updateSimpleStatus('None', 'Idle', 'Not Detected');
    }

    showBadge(text) {
        if (!this.badge) return;
        this.badge.textContent = text;
        this.badge.classList.remove('hidden');
    }

    hideBadge() {
        if (!this.badge) return;
        this.badge.classList.add('hidden');
    }

    processFrame(results) {
        const payload = this.classifier.processLandmarks(
            results.landmarks && results.landmarks.length > 0 ? results.landmarks[0] : null
        );
        
        // Update MediaPipe renderer coloring
        this.mediaPipe.setCurrentRawGesture(payload.rawGesture);

        AppState.setHandDetected(payload.landmarks !== null);

        if (!payload.landmarks) {
            this.prevWrist = null;
            this.hideBadge();
            this.uiManager.updateSimpleStatus('None', 'Idle', 'Not Detected');
            return;
        }

        this.uiManager.updateSimpleStatus(payload.rawGesture, payload.state, 'Detected');

        // Calculate Delta using smoothed normalized coordinates directly
        const wrist = payload.landmarks[0]; // Already EMA smoothed by gesture.js
        let delta = { dx: 0, dy: 0 };
        if (this.prevWrist) {
            // Note: X is inverted in MediaPipe compared to screen CSS if mirrored
            // But user blueprint requests: deltaX = smoothWrist.x - prev.x
            // Hand moves LEFT -> deltaX is positive (since normalized 0 is right in mirrored). 
            // We just follow the raw delta computation blueprint.
            delta.dx = wrist.x - this.prevWrist.x;
            delta.dy = wrist.y - this.prevWrist.y;
        }
        this.prevWrist = wrist;

        // Apply Dead Zone
        if (Math.abs(delta.dx) < GESTURE.DEAD_ZONE) delta.dx = 0;
        if (Math.abs(delta.dy) < GESTURE.DEAD_ZONE) delta.dy = 0;

        this.handleInteraction(payload.state, delta);
    }

    handleInteraction(state, delta) {
        const selectedObj = this.transformSystem.selectedObject;

        switch (state) {
            case GESTURE_STATES.CAMERA_MODE:
                this.showBadge('📷 Camera Mode');
                if (this.transformSystem.orbitControls) {
                    const controls = this.transformSystem.orbitControls;
                    controls.setAzimuthalAngle(controls.getAzimuthalAngle() - delta.dx * GESTURE.CAMERA_SENSITIVITY);
                    controls.setPolarAngle(controls.getPolarAngle() - delta.dy * GESTURE.CAMERA_SENSITIVITY);
                    controls.update(); // Force immediate re-render sync
                }
                break;

            case GESTURE_STATES.OBJECT_MODE:
                if (selectedObj) {
                    this.showBadge('✊ Move Mode');
                    
                    selectedObj.position.x += delta.dx * GESTURE.SCENE_WIDTH;
                    selectedObj.position.y -= delta.dy * GESTURE.SCENE_HEIGHT;
                    
                    // Clamp bounds
                    selectedObj.position.x = Math.max(-10, Math.min(10, selectedObj.position.x));
                    selectedObj.position.y = Math.max(-5, Math.min(10, selectedObj.position.y));
                    selectedObj.position.z = Math.max(-10, Math.min(10, selectedObj.position.z));

                    // Update UI inspector in real-time
                    this.uiManager.setSelectedObject(selectedObj);
                } else {
                    this.showBadge('Select an object first');
                }
                break;

            case GESTURE_STATES.IDLE:
            default:
                this.hideBadge();
                break;
        }
    }
}
