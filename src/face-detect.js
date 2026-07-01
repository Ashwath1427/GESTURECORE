import { AUTH_CONFIG } from './config.js';

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

export class FaceDetectorSystem {
    constructor(ui) {
        this.ui = ui;
        this.video = document.getElementById('login-video');
        this.canvas = document.getElementById('login-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.faceDetector = null;
        this.isActive = false;
        this.lastVideoTime = -1;
        this.stableFaceSince = 0;
        
        this.onStableFaceDetected = null; // Callback for orchestrator
    }

    async initialize() {
        this.ui.setCameraStatus('Loading AI...', 'waiting');
        
        // Import the explicit ESM bundle (package "main" is CommonJS, which can
        // resolve to undefined named exports when imported as the bare package URL).
        const vision = await import(`${MEDIAPIPE_CDN}/vision_bundle.mjs`);
        const { FilesetResolver, FaceDetector } = vision;

        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );

        this.faceDetector = await FaceDetector.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: MODEL_URL,
                delegate: "CPU"
            },
            runningMode: "VIDEO"
        });
    }

    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 640 }, height: { ideal: 480 } } 
            });
            this.video.srcObject = stream;
            
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => resolve();
            });
            await this.video.play();
            
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            
            this.ui.setCameraStatus('Ready', 'success');
            return true;
        } catch (err) {
            console.error('[FaceDetect] Camera error:', err);
            this.ui.setCameraStatus('Denied/Error', 'error');
            return false;
        }
    }

    stopCamera() {
        this.isActive = false;
        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(t => t.stop());
            this.video.srcObject = null;
        }
    }

    startDetectionLoop() {
        this.isActive = true;
        this.ui.showScanLine(true);
        this.stableFaceSince = 0;
        
        let lastDetectTime = 0;
        const loop = () => {
            if (!this.isActive) return;
            
            if (this.video.readyState >= 2 && this.faceDetector) {
                let startTimeMs = performance.now();
                if (startTimeMs - lastDetectTime > 150) { // Throttle to ~6 FPS
                    if (this.lastVideoTime !== this.video.currentTime) {
                        this.lastVideoTime = this.video.currentTime;
                        const results = this.faceDetector.detectForVideo(this.video, startTimeMs);
                        this.processResults(results, startTimeMs);
                        lastDetectTime = startTimeMs;
                    }
                }
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    processResults(results, now) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!results.detections || results.detections.length === 0) {
            this.ui.setFaceStatus('Not Detected');
            this.stableFaceSince = 0;
            return;
        }

        if (results.detections.length > 1) {
            this.ui.setFaceStatus('Multiple Faces Found', 'error');
            this.stableFaceSince = 0;
            return;
        }

        // Draw bounding box
        const detection = results.detections[0];
        const bbox = detection.boundingBox;
        
        this.ctx.strokeStyle = '#4ade80';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(bbox.originX, bbox.originY, bbox.width, bbox.height);
        
        this.ui.setFaceStatus('Detected', 'active');

        // Check stability
        if (this.stableFaceSince === 0) {
            this.stableFaceSince = now;
        } else if (now - this.stableFaceSince >= AUTH_CONFIG.faceStableMs) {
            this.isActive = false; // Stop loop to freeze frame for recognition
            this.ui.showScanLine(false);
            if (this.onStableFaceDetected) {
                this.onStableFaceDetected();
            }
        }
    }
}
