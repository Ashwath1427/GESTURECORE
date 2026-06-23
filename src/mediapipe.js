import { AppState } from './app-state.js';
import { GESTURE_STATES } from './constants.js';

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export class MediaPipeRunner {
    constructor() {
        this.video = document.getElementById('webcam-video');
        this.canvasElement = document.getElementById('webcam-canvas');
        this.canvasCtx = this.canvasElement.getContext('2d');
        this.webcamContainer = document.getElementById('webcam-container');
        
        this.handLandmarker = null;
        this.webcamRunning = false;
        this.lastVideoTime = -1;
        this.animationFrameId = null;
        
        this.onLandmarks = null;
        this.onButtonStateChange = null;
        this.currentRawGesture = 'None';
    }

    setCurrentRawGesture(rawGesture) {
        this.currentRawGesture = rawGesture;
    }

    setButtonState(stateMsg, disabled = false) {
        if (this.onButtonStateChange) {
            this.onButtonStateChange(stateMsg, disabled);
        }
    }

    async initMediaPipe() {
        // Dynamic import from package ROOT
        const vision = await import(MEDIAPIPE_CDN);
        const { FilesetResolver, HandLandmarker } = vision;

        if (!FilesetResolver) throw new Error('FilesetResolver not found in MediaPipe package');
        if (!HandLandmarker) throw new Error('HandLandmarker not found in MediaPipe package');

        const filesetResolver = await FilesetResolver.forVisionTasks(
            `${MEDIAPIPE_CDN}/wasm`
        );

        this.handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: MODEL_URL,
                delegate: 'CPU' // CPU as the safe default
            },
            runningMode: 'VIDEO',
            numHands: 1
        });

        return this.handLandmarker;
    }

    async start() {
        this.setButtonState('Requesting Camera...', true);
        this.webcamContainer.classList.remove('hidden');

        try {
            // Camera first
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.video.srcObject = stream;

            await new Promise((resolve, reject) => {
                this.video.addEventListener('loadedmetadata', resolve, { once: true });
                this.video.addEventListener('error', reject, { once: true });
            });

            await this.video.play();
            console.log('[Gesture] Camera ready');
            
            // Match canvas size to video
            this.canvasElement.width = this.video.videoWidth;
            this.canvasElement.height = this.video.videoHeight;

            // MediaPipe second
            this.setButtonState('Loading Model...', true);
            await this.initMediaPipe();
            console.log('[Gesture] HandLandmarker ready');

            // Detection loop third
            this.webcamRunning = true;
            this.startDetectionLoop();
            console.log('[Gesture] Detection loop started');
            
            this.setButtonState('Gesture Mode: Active', false);
            AppState.setTrackingStatus('Active');

        } catch (err) {
            console.error('[Gesture] INIT FAILED:', err);
            const msg = err.message || String(err);
            AppState.setTrackingStatus(`Error: ${msg}`);
            this.setButtonState('Error: ' + msg.slice(0, 30), false);
            this.forceDisableGestureMode();
        }
    }

    forceDisableGestureMode() {
        this.webcamRunning = false;
        if (this.animationFrameId) {
            window.cancelAnimationFrame(this.animationFrameId);
        }
        
        this.webcamContainer.classList.add('hidden');
        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
        }

        if (this.handLandmarker) {
            this.handLandmarker.close();
            this.handLandmarker = null;
        }
        
        AppState.setGestureState(GESTURE_STATES.IDLE);
        AppState.setHandDetected(false);
    }

    stop() {
        this.forceDisableGestureMode();
        AppState.setTrackingStatus('Offline');
        this.setButtonState('Gesture Mode: OFF', false);
    }

    startDetectionLoop() {
        const loop = () => {
            if (!this.webcamRunning) return;
            
            if (this.video.readyState >= 2 && this.handLandmarker) {
                let startTimeMs = performance.now();
                if (this.lastVideoTime !== this.video.currentTime) {
                    this.lastVideoTime = this.video.currentTime;
                    
                    const results = this.handLandmarker.detectForVideo(this.video, startTimeMs);
                    this.drawLandmarks(results);
                    
                    if (this.onLandmarks) {
                        this.onLandmarks(results);
                    }
                }
            }
            
            this.animationFrameId = window.requestAnimationFrame(loop);
        };
        this.animationFrameId = window.requestAnimationFrame(loop);
    }

    drawLandmarks(results) {
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            
            const connections = [
                [0,1], [1,2], [2,3], [3,4], // Thumb
                [0,5], [5,6], [6,7], [7,8], // Index
                [5,9], [9,10], [10,11], [11,12], // Middle
                [9,13], [13,14], [14,15], [15,16], // Ring
                [13,17], [17,18], [18,19], [19,20], // Pinky
                [0,17] // Palm base connection
            ];

            let skeletonColor = "rgba(255, 255, 255, 0.7)"; // White by default
            if (this.currentRawGesture === 'OpenPalm') skeletonColor = "rgba(0, 255, 0, 0.7)"; // Green
            else if (this.currentRawGesture === 'ClosedFist') skeletonColor = "rgba(255, 0, 0, 0.7)"; // Red

            this.canvasCtx.strokeStyle = skeletonColor;
            this.canvasCtx.lineWidth = 2;
            
            for (const [startIdx, endIdx] of connections) {
                const start = landmarks[startIdx];
                const end = landmarks[endIdx];
                
                this.canvasCtx.beginPath();
                this.canvasCtx.moveTo(start.x * this.canvasElement.width, start.y * this.canvasElement.height);
                this.canvasCtx.lineTo(end.x * this.canvasElement.width, end.y * this.canvasElement.height);
                this.canvasCtx.stroke();
            }

            this.canvasCtx.fillStyle = "rgba(255, 0, 0, 0.9)";
            for (const lm of landmarks) {
                this.canvasCtx.beginPath();
                this.canvasCtx.arc(lm.x * this.canvasElement.width, lm.y * this.canvasElement.height, 3, 0, 2 * Math.PI);
                this.canvasCtx.fill();
            }
        }
        this.canvasCtx.restore();
    }
}
