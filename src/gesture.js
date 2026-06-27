import * as THREE from 'three';
import { AppState } from './app-state.js';
import { GESTURE, GESTURE_RAW, GESTURE_STATES } from './constants.js';
import { GESTURE_CONFIG, GESTURE_MOTION_CONFIG } from './config.js';

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const MIRROR_X = true;

class GestureSystem {
    constructor() {
        this.video = document.getElementById('webcam-video');
        this.canvasElement = document.getElementById('webcam-canvas');
        this.canvasCtx = this.canvasElement.getContext('2d');
        this.webcamContainer = document.getElementById('webcam-container');
        this.toggleBtn = document.getElementById('btn-toggle-gesture');
        this.badge = document.getElementById('gesture-badge');
        
        this.isActive = false;
        this.handLandmarker = null;
        this.webcamRunning = false;
        this.lastVideoTime = -1;
        this.animationFrameId = null;

        // Gesture state
        this.state = GESTURE_STATES.IDLE;
        this.smoothedLandmarks = null;
        this.lastHandTime = performance.now();
        this.candidateGesture = GESTURE_RAW.NONE;
        this.candidateStartTime = 0;
        this.prevWrist = null;
        this.zoomCooldownUntil = 0;
        this.twoPalmsStartTime = 0;
        this.twoPalmsCooldownUntil = 0;
        
        this.toggleBtn.onclick = () => this.toggleGestureMode();
        
        // Remove disabled state once this script loads safely
        this.toggleBtn.textContent = 'Gesture Mode: OFF';
        this.toggleBtn.disabled = false;
    }

    async toggleGestureMode() {
        if (this.isActive) {
            this.stopTracking();
        } else {
            await this.startTracking();
        }
    }

    async startTracking() {
        this.isActive = true;
        this.toggleBtn.textContent = 'Requesting Camera...';
        this.webcamContainer.classList.remove('hidden');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.video.srcObject = stream;
            
            await new Promise((resolve, reject) => {
                this.video.onloadedmetadata = () => resolve();
                this.video.onerror = (e) => reject(e);
            });
            await this.video.play();
            
            this.canvasElement.width = this.video.videoWidth;
            this.canvasElement.height = this.video.videoHeight;
            
            this.toggleBtn.textContent = 'Loading MediaPipe...';
            
            // Dynamic import to prevent main bundle crashes
            const vision = await import(MEDIAPIPE_CDN);
            const { FilesetResolver, HandLandmarker } = vision;
            
            const filesetResolver = await FilesetResolver.forVisionTasks(`${MEDIAPIPE_CDN}/wasm`);
            this.handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath: MODEL_URL,
                    delegate: 'CPU'
                },
                runningMode: 'VIDEO',
                numHands: 2,
                minHandDetectionConfidence: GESTURE_CONFIG.minDetectionConfidence,
                minHandPresenceConfidence: GESTURE_CONFIG.minTrackingConfidence,
                minTrackingConfidence: GESTURE_CONFIG.minTrackingConfidence
            });
            
            this.webcamRunning = true;
            this.toggleBtn.textContent = 'Gesture Mode: Active';
            this.toggleBtn.classList.add('active');
            AppState.setTrackingStatus('Active');
            
            this.startDetectionLoop();
            
        } catch (err) {
            console.error('[GestureSystem] Init failed:', err);
            AppState.setTrackingStatus(`Error: ${err.message}`);
            this.toggleBtn.textContent = 'Error: ' + err.message.slice(0, 20);
            this.stopTracking();
        }
    }

    stopTracking() {
        this.isActive = false;
        this.webcamRunning = false;
        this.webcamContainer.classList.add('hidden');
        this.toggleBtn.classList.remove('active');
        
        if (!this.toggleBtn.textContent.startsWith('Error')) {
            this.toggleBtn.textContent = 'Gesture Mode: OFF';
            AppState.setTrackingStatus('Offline');
        }
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(t => t.stop());
            this.video.srcObject = null;
        }
        
        if (this.handLandmarker) {
            this.handLandmarker.close();
            this.handLandmarker = null;
        }
        
        this.hideBadge();
        this.state = GESTURE_STATES.IDLE;
        AppState.setGestureState(GESTURE_STATES.IDLE);
        AppState.setHandDetected(false);
        
        if (window.app && window.app.uiManager) {
            window.app.uiManager.updateSimpleStatus('None', 'Idle', 'Not Detected');
        }
    }

    startDetectionLoop() {
        const loop = () => {
            if (!this.webcamRunning) return;
            
            if (this.video.readyState >= 2 && this.handLandmarker) {
                let startTimeMs = performance.now();
                if (this.lastVideoTime !== this.video.currentTime) {
                    this.lastVideoTime = this.video.currentTime;
                    const results = this.handLandmarker.detectForVideo(this.video, startTimeMs);
                    this.processResults(results);
                }
            }
            this.animationFrameId = requestAnimationFrame(loop);
        };
        this.animationFrameId = requestAnimationFrame(loop);
    }

    isHandOpenPalm(lms) {
        if (!lms) return false;
        const indexUp = lms[8].y < lms[6].y;
        const middleUp = lms[12].y < lms[10].y;
        const ringUp = lms[16].y < lms[14].y;
        const pinkyUp = lms[20].y < lms[18].y;
        const distThumbIndex = Math.hypot(lms[4].x - lms[5].x, lms[4].y - lms[5].y, lms[4].z - lms[5].z);
        const thumbAway = distThumbIndex > 0.09;
        return indexUp && middleUp && ringUp && pinkyUp;
    }

    isHandClosedFist(lms) {
        if (!lms) return false;
        const indexDown = lms[8].y > lms[6].y;
        const middleDown = lms[12].y > lms[10].y;
        const ringDown = lms[16].y > lms[14].y;
        const pinkyDown = lms[20].y > lms[18].y;
        const distThumbIndexBase = Math.hypot(lms[4].x - lms[5].x, lms[4].y - lms[5].y, lms[4].z - lms[5].z);
        const thumbAway = distThumbIndexBase > 0.09;
        return indexDown && middleDown && ringDown && pinkyDown && !thumbAway;
    }

    isIndexOnly(lms) {
        if (!lms) return false;
        const indexUp = lms[8].y < lms[6].y;
        const middleDown = lms[12].y > lms[10].y;
        const ringDown = lms[16].y > lms[14].y;
        const pinkyDown = lms[20].y > lms[18].y;
        return indexUp && middleDown && ringDown && pinkyDown;
    }

    isIndexAndMiddleOnly(lms) {
        if (!lms) return false;
        const indexUp = lms[8].y < lms[6].y;
        const middleUp = lms[12].y < lms[10].y;
        const ringDown = lms[16].y > lms[14].y;
        const pinkyDown = lms[20].y > lms[18].y;
        return indexUp && middleUp && ringDown && pinkyDown;
    }

    getFingersUpCount(lms) {
        if (!lms) return 0;
        const indexUp = lms[8].y < lms[6].y;
        const middleUp = lms[12].y < lms[10].y;
        const ringUp = lms[16].y < lms[14].y;
        const pinkyUp = lms[20].y < lms[18].y;
        return (indexUp ? 1 : 0) + (middleUp ? 1 : 0) + (ringUp ? 1 : 0) + (pinkyUp ? 1 : 0);
    }

    cycleSelection() {
        if (!window.app) return;
        const registry = window.app.objectRegistry;
        const ts = window.app.transformSystem;
        
        const objects = registry.objects;
        if (objects.length === 0) return;

        const currentSelected = ts.selectedObject;
        let nextIndex = 0;
        
        if (currentSelected) {
            const currentIndex = objects.indexOf(currentSelected);
            if (currentIndex !== -1) {
                nextIndex = (currentIndex + 1) % objects.length;
            }
        }
        
        ts.selectObject(objects[nextIndex]);
    }

    classifyCustomZoomGesture(lms) {
        const indexUp = lms[8].y < lms[6].y;
        const middleUp = lms[12].y < lms[10].y;
        const ringUp = lms[16].y < lms[14].y;
        const pinkyUp = lms[20].y < lms[18].y;
        
        const distThumbIndex = Math.hypot(lms[4].x - lms[5].x, lms[4].y - lms[5].y, lms[4].z - lms[5].z);
        const thumbExtended = distThumbIndex > 0.14; 
        
        // Robust 2-finger vs 3-finger logic.
        // A peace sign (2 fingers) often lifts the ring finger slightly due to connected tendons.
        // We measure if the ring finger is "significantly lower" than the middle finger tip.
        const ringIsLowerThanMiddle = lms[16].y > (lms[12].y + 0.03); 
        const isPeaceSign = indexUp && middleUp && ringIsLowerThanMiddle && !pinkyUp;
        const isThreeFingers = indexUp && middleUp && ringUp && !ringIsLowerThanMiddle && !pinkyUp;

        if (isPeaceSign) {
            return GESTURE_RAW.ZOOM_IN_GESTURE;
        }

        if (isThreeFingers) {
            return GESTURE_RAW.ZOOM_OUT_GESTURE;
        }

        // Menu Mode Gestures (Index only)
        if (indexUp && !middleUp && !ringUp && !pinkyUp) {
            return GESTURE_RAW.ONE_FINGER;
        }
        
        // 4 Fingers (all but thumb)
        if (indexUp && middleUp && ringUp && pinkyUp && !thumbExtended) {
            return GESTURE_RAW.FOUR_FINGERS;
        }

        return GESTURE_RAW.NONE;
    }

    drawDebugOverlay(ctx, lms, classifiedGesture, holdMs) {
        const indexUp = lms[8].y < lms[6].y;
        const middleUp = lms[12].y < lms[10].y;
        const ringUp = lms[16].y < lms[14].y;
        const pinkyUp = lms[20].y < lms[18].y;
        
        let upCount = 0;
        if (indexUp) upCount++;
        if (middleUp) upCount++;
        if (ringUp) upCount++;
        if (pinkyUp) upCount++;

        const ts = window.app ? window.app.transformSystem : null;
        let camDist = 'N/A';
        if (ts && ts.camera && ts.orbitControls) {
            camDist = ts.camera.position.distanceTo(ts.orbitControls.target).toFixed(2);
        }

        const distThumbIndex = Math.hypot(lms[4].x - lms[5].x, lms[4].y - lms[5].y, lms[4].z - lms[5].z);

        ctx.fillStyle = 'white';
        ctx.font = '9px Arial';
        const lines = [
            `Gesture: ${classifiedGesture} [${window.app && window.app.lastScore ? window.app.lastScore : 'N/A'}/100]`,
            `FingersUp: ${upCount}`,
            `IndexUp: ${indexUp}`,
            `MiddleUp: ${middleUp}`,
            `RingUp: ${ringUp}`,
            `PinkyUp: ${pinkyUp}`,
            `ThumbIdxDst: ${distThumbIndex.toFixed(3)}`,
            `HoldMs: ${Math.floor(holdMs)}`,
            `CamDist: ${camDist}`
        ];

        if (this.lastRawDeltaX !== undefined) {
            lines.push(`RawDeltaX: ${this.lastRawDeltaX.toFixed(5)}`);
            lines.push(`CorrectedDeltaX: ${this.lastCorrectedDeltaX.toFixed(5)}`);
            lines.push(`MirrorX: ${MIRROR_X}`);
        }

        lines.forEach((line, i) => {
            ctx.fillText(line, 5, 12 + (i * 10));
        });
    }

    processResults(results) {
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        const now = performance.now();
        
        if (!results.landmarks || results.landmarks.length === 0) {
            if (now - this.lastHandTime > GESTURE.HAND_LOST_MS) {
                this.state = GESTURE_STATES.IDLE;
                this.smoothedLandmarks = null;
                this.candidateGesture = GESTURE_RAW.NONE;
                this.prevWrist = null;
                this.hideBadge();
                AppState.setGestureState(GESTURE_STATES.IDLE);
                AppState.setHandDetected(false);
                if (window.app && window.app.uiManager) {
                    window.app.uiManager.updateSimpleStatus('None', 'Idle', 'Not Detected');
                }
            }
            this.canvasCtx.restore();
            return;
        }
        
        this.lastHandTime = now;
        AppState.setHandDetected(true);

        // --- EMA SMOOTHING ---
        if (!this.smoothedLandmarks || this.smoothedLandmarks.length !== results.landmarks.length) {
            this.smoothedLandmarks = results.landmarks;
        } else {
            const alpha = 0.6; // Smoothing factor
            this.smoothedLandmarks = results.landmarks.map((handLms, hIdx) => {
                const prevHand = this.smoothedLandmarks[hIdx];
                return handLms.map((lm, lIdx) => {
                    const prevLm = prevHand[lIdx];
                    return {
                        x: prevLm.x + alpha * (lm.x - prevLm.x),
                        y: prevLm.y + alpha * (lm.y - prevLm.y),
                        z: prevLm.z + alpha * (lm.z - prevLm.z)
                    };
                });
            });
        }
        
        // Use smoothed landmarks for all subsequent logic
        const activeLandmarks = this.smoothedLandmarks;

        // Identify Left and Right hands explicitly
        let leftHand = null;
        let rightHand = null;
        if (activeLandmarks && activeLandmarks.length > 0) {
            for (let i = 0; i < activeLandmarks.length; i++) {
                if (results.handednesses && results.handednesses[i]) {
                    if (results.handednesses[i][0].categoryName === 'Left') {
                        leftHand = activeLandmarks[i];
                    } else if (results.handednesses[i][0].categoryName === 'Right') {
                        rightHand = activeLandmarks[i];
                    }
                }
            }
            // Fallback for single hand if handedness is glitching
            if (activeLandmarks.length === 1) {
                if (this.state === GESTURE_STATES.ROTATION_MENU_MODE) {
                    leftHand = activeLandmarks[0];
                    rightHand = null;
                } else if (this.state === GESTURE_STATES.ROTATION_ACTIVE_MODE) {
                    rightHand = activeLandmarks[0];
                    leftHand = null;
                } else if (!leftHand && !rightHand) {
                    rightHand = activeLandmarks[0]; // Assume right if unknown
                }
            }
        }

        // Confidence logic
        let leftConfidence = 0;
        let rightConfidence = 0;
        if (results.handednesses) {
            results.handednesses.forEach(h => {
                const score = Math.round(h[0].score * 100);
                if (h[0].categoryName === 'Left') leftConfidence = score;
                if (h[0].categoryName === 'Right') rightConfidence = score;
            });
        }
        window.app.lastScore = Math.max(leftConfidence, rightConfidence);
        if (window.app.lastScore > 0 && window.app.lastScore < GESTURE_CONFIG.minGestureScore) {
            // Score too low
            this.canvasCtx.restore();
            return;
        }

        const leftUpCount = leftHand ? this.getFingersUpCount(leftHand) : 0;
        const rightUpCount = rightHand ? this.getFingersUpCount(rightHand) : 0;
        const leftIsOpen = leftHand ? this.isHandOpenPalm(leftHand) : false;
        const rightIsOpen = rightHand ? this.isHandOpenPalm(rightHand) : false;
        const leftIsFist = leftHand ? this.isHandClosedFist(leftHand) : false;
        const rightIsFist = rightHand ? this.isHandClosedFist(rightHand) : false;
        const rightIsIndexOnly = rightHand ? this.isIndexOnly(rightHand) : false;
        const leftIsDefaultView = leftHand ? this.isIndexAndMiddleOnly(leftHand) : false;

        // --- NEW: LEFT HAND DEFAULT VIEW GESTURE ---
        if (leftIsDefaultView && !rightHand) {
            if (!this.defaultViewCooldownUntil) this.defaultViewCooldownUntil = 0;
            if (now < this.defaultViewCooldownUntil) {
                this.canvasCtx.restore();
                return;
            }
            if (!this.defaultViewStartTime || this.defaultViewStartTime === 0) {
                this.defaultViewStartTime = now;
            } else if (now - this.defaultViewStartTime > GESTURE_CONFIG.stableHoldMs) {
                this.defaultViewStartTime = 0;
                if (window.app && window.app.sceneManager && typeof window.app.sceneManager.resetCameraToDefaultView === 'function') {
                    window.app.sceneManager.resetCameraToDefaultView();
                    this.showBadge('🎥 Camera Reset to Default View');
                }
            }
            this.canvasCtx.restore();
            return;
        } else {
            this.defaultViewStartTime = 0;
        }

        // --- ROTATION STATE MACHINE OVERRIDES ---
        if (leftHand && !rightHand && leftUpCount === 3 && this.state === GESTURE_STATES.IDLE) {
            if (this.twoPalmsStartTime === 0) {
                this.twoPalmsStartTime = now;
            } else if (now - this.twoPalmsStartTime > 300) {
                this.state = GESTURE_STATES.ROTATION_MENU_MODE;
                document.getElementById('rotation-menu').classList.remove('hidden');
                this.twoPalmsStartTime = 0;
                this.showBadge('🔄 Rotation Axis Menu');
            }
            this.candidateGesture = GESTURE_RAW.NONE;
            this.canvasCtx.restore();
            return;
        }

        if (this.state === GESTURE_STATES.ROTATION_MENU_MODE) {
            if (leftIsOpen) {
                this.state = GESTURE_STATES.IDLE;
                document.getElementById('rotation-menu').classList.add('hidden');
                this.hideBadge();
            } else if (leftHand) {
                if (leftUpCount === 1 || leftUpCount === 2 || leftUpCount === 4) {
                    if (this.candidateGesture !== leftUpCount) {
                        this.candidateGesture = leftUpCount;
                        this.candidateStartTime = now;
                    } else if (now - this.candidateStartTime > 800) {
                        this.rotationAxis = leftUpCount === 1 ? 'x' : (leftUpCount === 2 ? 'y' : 'z');
                        this.state = GESTURE_STATES.ROTATION_ACTIVE_MODE;
                        document.getElementById('rotation-menu').classList.add('hidden');
                        this.prevWrist = null;
                        this.showBadge(`🔄 Rotating ${this.rotationAxis.toUpperCase()}-Axis (Right Fist to Stop)`);
                    }
                } else {
                    this.candidateGesture = GESTURE_RAW.NONE;
                }
            }
            this.canvasCtx.restore();
            return;
        }

        if (this.state === GESTURE_STATES.ROTATION_ACTIVE_MODE) {
            if (rightIsFist) {
                this.state = GESTURE_STATES.IDLE;
                this.hideBadge();
                this.prevWrist = null;
            } else if (rightHand && rightIsOpen) {
                const wrist = rightHand[0];
                if (this.prevWrist) {
                    let deltaX = wrist.x - this.prevWrist.x;
                    let deltaY = wrist.y - this.prevWrist.y;
                    if (MIRROR_X) deltaX = -deltaX;
                    if (Math.abs(deltaX) < GESTURE.DEAD_ZONE) deltaX = 0;
                    if (Math.abs(deltaY) < GESTURE.DEAD_ZONE) deltaY = 0;
                    this.applyRotationGestureDelta(deltaX, deltaY);
                }
                this.prevWrist = { x: wrist.x, y: wrist.y };
            } else {
                this.prevWrist = null; // Right hand lost or not open
            }
            this.canvasCtx.restore();
            return;
        }

        // --- TWO HAND LOGIC (Instant Triggers) ---
        if (leftHand && rightHand) {
            // 1. Lock Screen Gesture: Both hands exactly 2 fingers
            if (leftUpCount === 2 && rightUpCount === 2) {
                if (this.twoPalmsStartTime === 0) {
                    this.twoPalmsStartTime = now;
                } else if (now - this.twoPalmsStartTime > GESTURE.TWO_PALMS_HOLD_MS) {
                    this.twoPalmsStartTime = 0;
                    window.dispatchEvent(new Event('app-lock-requested'));
                }
            } 
            // Demo Mode Gesture: Both hands exactly 1 finger (index)
            else if (leftUpCount === 1 && rightUpCount === 1) {
                if (this.twoPalmsStartTime === 0) {
                    this.twoPalmsStartTime = now;
                    this.showBadge('🎬 Hold for Demo Mode...');
                } else if (now - this.twoPalmsStartTime > GESTURE.TWO_PALMS_HOLD_MS) {
                    if (now > this.twoPalmsCooldownUntil) {
                        if (window.app && window.app.startDemo) {
                            window.app.startDemo();
                            this.showBadge('🎬 Starting Demo!');
                        } else {
                            this.showBadge('⚠️ App not ready for demo');
                        }
                        this.twoPalmsCooldownUntil = now + 5000;
                    }
                }
            }
            // 2. Cycle Selection: Both hands open palms
            else if (leftIsOpen && rightIsOpen) {
                if (this.twoPalmsStartTime === 0) {
                    this.twoPalmsStartTime = now;
                } else if (now - this.twoPalmsStartTime > GESTURE.TWO_PALMS_HOLD_MS) {
                    if (now > this.twoPalmsCooldownUntil) {
                        this.cycleSelection();
                        this.twoPalmsCooldownUntil = now + 1000;
                        this.showBadge('🔄 Select Next Object');
                    }
                }
            }
            // Voice Activation: Left Fist + Right Index Only
            else if (leftIsFist && rightIsIndexOnly) {
                if (this.twoPalmsStartTime === 0) {
                    this.twoPalmsStartTime = now;
                } else if (now - this.twoPalmsStartTime > 400) {
                    if (now > this.twoPalmsCooldownUntil) {
                        window.dispatchEvent(new Event('voice-activation-triggered'));
                        this.showBadge('🎙️ Voice Command Triggered');
                        this.twoPalmsCooldownUntil = now + 1000;
                    }
                }
            }
            // 3. Duplicate: Both closed fists
            else if (leftIsFist && rightIsFist) {
                if (this.twoPalmsStartTime === 0) {
                    this.twoPalmsStartTime = now;
                } else if (now - this.twoPalmsStartTime > GESTURE.TWO_PALMS_HOLD_MS) {
                    if (now > this.twoPalmsCooldownUntil) {
                        window.dispatchEvent(new Event('app-duplicate-requested'));
                        this.twoPalmsCooldownUntil = now + 1000;
                        this.showBadge('✨ Duplicated');
                    }
                }
            }
            // 4. Delete: Left Open, Right Fist
            else if (leftIsOpen && rightIsFist) {
                if (this.twoPalmsStartTime === 0) {
                    this.twoPalmsStartTime = now;
                } else if (now - this.twoPalmsStartTime > GESTURE.TWO_PALMS_HOLD_MS) {
                    if (now > this.twoPalmsCooldownUntil) {
                        window.dispatchEvent(new Event('app-delete-requested'));
                        this.twoPalmsCooldownUntil = now + 1000;
                        this.showBadge('🗑️ Deleted');
                    }
                }
            }
            // 5. Save: Right Open, Left Fist
            else if (rightIsOpen && leftIsFist) {
                if (this.twoPalmsStartTime === 0) {
                    this.twoPalmsStartTime = now;
                } else if (now - this.twoPalmsStartTime > GESTURE.TWO_PALMS_HOLD_MS) {
                    if (now > this.twoPalmsCooldownUntil) {
                        window.dispatchEvent(new Event('app-save-requested'));
                        this.twoPalmsCooldownUntil = now + 1000;
                        this.showBadge('💾 Saved');
                    }
                }
            }
            else {
                this.twoPalmsStartTime = 0;
            }
            
            // ALWAYS prevent single-hand logic from running when 2 hands are in frame.
            this.state = GESTURE_STATES.IDLE;
            this.candidateGesture = GESTURE_RAW.NONE;
            this.canvasCtx.restore();
            return;
        } else {
            this.twoPalmsStartTime = 0;
        }

        // --- SINGLE HAND LOGIC ---
        // If we reach here, there is only exactly 1 hand detected (either left or right)
        const landmarks = leftHand || rightHand;    
        
        // Min Score Threshold
        let score = 0;
        if (results.handednesses && results.handednesses.length > 0) {
            score = Math.round(results.handednesses[0][0].score * 100);
            if (window.app) window.app.lastScore = score;
        }
        if (score < 65) {
            this.canvasCtx.restore();
            return;
        }
        
        // 1. Ring Buffer Smoothing
        if (!this.landmarkHistory) this.landmarkHistory = [];
        this.landmarkHistory.push(JSON.parse(JSON.stringify(landmarks)));
        if (this.landmarkHistory.length > 5) this.landmarkHistory.shift();
        
        let smoothed = JSON.parse(JSON.stringify(landmarks));
        for(let i=0; i<21; i++) {
            smoothed[i].x = this.landmarkHistory.reduce((sum, l) => sum + l[i].x, 0) / this.landmarkHistory.length;
            smoothed[i].y = this.landmarkHistory.reduce((sum, l) => sum + l[i].y, 0) / this.landmarkHistory.length;
            smoothed[i].z = this.landmarkHistory.reduce((sum, l) => sum + l[i].z, 0) / this.landmarkHistory.length;
        }
        const lms = smoothed;
        this.smoothedLandmarks = lms; // save for debug overlay

        
        // 2. Gesture Detection
        const indexUp = lms[8].y < lms[6].y;
        const middleUp = lms[12].y < lms[10].y;
        const ringUp = lms[16].y < lms[14].y;
        const pinkyUp = lms[20].y < lms[18].y;
        const distThumbIndexBase = Math.hypot(lms[4].x - lms[5].x, lms[4].y - lms[5].y, lms[4].z - lms[5].z);
        
        // Binary split: > 0.12 is Open Palm, <= 0.12 is Four Fingers (Tucked)
        const thumbAway = distThumbIndexBase > 0.12;
        const thumbTucked = !thumbAway;
        
        const isOpenPalm = indexUp && middleUp && ringUp && pinkyUp && thumbAway;
        
        const indexDown = lms[8].y > lms[6].y;
        const middleDown = lms[12].y > lms[10].y;
        const ringDown = lms[16].y > lms[14].y;
        const pinkyDown = lms[20].y > lms[18].y;
        
        const isClosedFist = indexDown && middleDown && ringDown && pinkyDown && !thumbAway;
        
        const isThumbsGesture = indexDown && middleDown && ringDown && pinkyDown && thumbAway;
        const isThumbsUp = isThumbsGesture && (lms[4].y < lms[2].y);
        const isThumbsDown = isThumbsGesture && (lms[4].y > lms[2].y);
        
        const palmWidth = Math.hypot(lms[0].x - lms[5].x, lms[0].y - lms[5].y, lms[0].z - lms[5].z);
        const pinchDist = Math.hypot(lms[4].x - lms[8].x, lms[4].y - lms[8].y, lms[4].z - lms[8].z);
        const isPinch = pinchDist < (palmWidth * 0.35);

        const customZoomRaw = this.classifyCustomZoomGesture(lms);

        let detectedRaw = GESTURE_RAW.NONE;
        let singleHandLabel = 'Unknown';
        if (results.handednesses && results.handednesses.length > 0) {
            singleHandLabel = results.handednesses[0][0].categoryName;
        }
        // Because the webcam is mirrored, the user's actual LEFT hand is classified as 'Right' by MediaPipe.
        const isUserLeftHand = singleHandLabel === 'Right';

        const fingersUp = (indexUp?1:0) + (middleUp?1:0) + (ringUp?1:0) + (pinkyUp?1:0);

        if (isPinch) {
            detectedRaw = 'Pinch';
        } else if (isOpenPalm) {
            detectedRaw = GESTURE_RAW.OPEN_PALM;
        } else if (isUserLeftHand && fingersUp === 4 && thumbTucked) {
            detectedRaw = 'LEFT_FOUR_FINGERS';
        } else if (!isUserLeftHand && fingersUp === 4 && thumbTucked) {
            detectedRaw = 'FOUR_FINGERS';
        } else if (customZoomRaw !== GESTURE_RAW.NONE) {
            if (isUserLeftHand && customZoomRaw === GESTURE_RAW.ZOOM_IN_GESTURE) {
                detectedRaw = 'LEFT_TWO_FINGERS';
            } else if (isUserLeftHand && customZoomRaw === GESTURE_RAW.FOUR_FINGERS) {
                detectedRaw = 'LEFT_FOUR_FINGERS';
            } else if (!isUserLeftHand && customZoomRaw === GESTURE_RAW.FOUR_FINGERS) {
                detectedRaw = GESTURE_RAW.FOUR_FINGERS;
            } else {
                detectedRaw = customZoomRaw;
            }
        } else {
            if (isThumbsUp) detectedRaw = GESTURE_RAW.THUMBS_UP;
            else if (isThumbsDown) detectedRaw = GESTURE_RAW.THUMBS_DOWN;
            else if (isClosedFist) detectedRaw = GESTURE_RAW.CLOSED_FIST;
        }
        
        if (detectedRaw !== this.candidateGesture) {
            this.candidateGesture = detectedRaw;
            this.candidateStartTime = now;
        }
        
        // Debounce the raw gesture (require 350ms hold to change the "smoothed" raw gesture)
        let smoothedRaw = this.smoothedRaw || GESTURE_RAW.NONE;
        const timeHeld = now - this.candidateStartTime;
        if (timeHeld >= 350 || detectedRaw === GESTURE_RAW.NONE) {
            smoothedRaw = this.candidateGesture;
            this.smoothedRaw = smoothedRaw;
        }
        
        const previousState = this.state;

        // Mode switches
        if (this.state === GESTURE_STATES.OBJECT_MODE) {
            // MODE LOCK: Do not switch out unless explicitly released
            // We consider it released if hand is open palm, or no gesture for a short time
            if ((smoothedRaw === GESTURE_RAW.OPEN_PALM || smoothedRaw === GESTURE_RAW.NONE) && timeHeld >= GESTURE_MOTION_CONFIG.releaseDelayMs) {
                this.state = GESTURE_STATES.IDLE;
                this.objectMovementArmed = false;
            }
        } else if (this.state === GESTURE_STATES.CAMERA_MODE) {
            // MODE LOCK: Do not switch to other gestures (like playing video) while actively panning.
            // Must release (drop hand or stop open palm) to exit camera mode.
            if (smoothedRaw !== GESTURE_RAW.OPEN_PALM && timeHeld >= GESTURE_MOTION_CONFIG.releaseDelayMs) {
                this.state = GESTURE_STATES.IDLE;
            }
        } else if (this.state === GESTURE_STATES.SCALE_UP_MODE || this.state === GESTURE_STATES.SCALE_DOWN_MODE) {
            // MODE LOCK: Must release thumbs gesture
            if (smoothedRaw !== GESTURE_RAW.THUMBS_UP && smoothedRaw !== GESTURE_RAW.THUMBS_DOWN && timeHeld >= GESTURE_MOTION_CONFIG.releaseDelayMs) {
                this.state = GESTURE_STATES.IDLE;
            }
        } else if (this.state === GESTURE_STATES.ZOOM_IN_MODE || this.state === GESTURE_STATES.ZOOM_OUT_MODE) {
            // Mode cancellation rules at the bottom will return to IDLE. Do nothing here.
        } else if (this.state === GESTURE_STATES.IDLE) {
            if (smoothedRaw === 'LEFT_FOUR_FINGERS' && timeHeld >= 1500) {
                if (now >= this.zoomCooldownUntil) {
                    window.dispatchEvent(new Event('app-play-dps-video'));
                    this.zoomCooldownUntil = now + 5000;
                    this.showBadge('▶️ Video Triggered');
                }
            } else if (smoothedRaw === 'LEFT_TWO_FINGERS' && timeHeld >= GESTURE.ZOOM_HOLD_MS) {
                if (now >= this.zoomCooldownUntil) {
                    window.dispatchEvent(new Event('app-center-cam-requested'));
                    this.zoomCooldownUntil = now + 700;
                    this.showBadge('🎯 Centered');
                }
            } else if (smoothedRaw === 'Pinch' && timeHeld >= GESTURE.MENU_HOLD_MS) {
                if (now >= this.zoomCooldownUntil) {
                    this.zoomCooldownUntil = now + 700;
                    this.showBadge('🤏 Pinch Detected');
                }
            } else if (smoothedRaw === GESTURE_RAW.ONE_FINGER && timeHeld >= GESTURE.MENU_HOLD_MS) {
                this.state = GESTURE_STATES.MENU_MODE;
                document.getElementById('gesture-menu').classList.remove('hidden');
            } else if (smoothedRaw === GESTURE_RAW.ZOOM_OUT_GESTURE && timeHeld >= GESTURE.ZOOM_HOLD_MS) {
                if (now >= this.zoomCooldownUntil) this.state = GESTURE_STATES.ZOOM_OUT_MODE;
            } else if (smoothedRaw === GESTURE_RAW.ZOOM_IN_GESTURE && timeHeld >= GESTURE.ZOOM_HOLD_MS) {
                if (now >= this.zoomCooldownUntil) this.state = GESTURE_STATES.ZOOM_IN_MODE;
            } else if (smoothedRaw === GESTURE_RAW.OPEN_PALM && timeHeld >= GESTURE.OPEN_PALM_HOLD_MS) {
                this.state = GESTURE_STATES.CAMERA_MODE;
            } else if (smoothedRaw === GESTURE_RAW.CLOSED_FIST && timeHeld >= GESTURE_MOTION_CONFIG.stableHoldMs) {
                this.state = GESTURE_STATES.OBJECT_MODE;
            } else if (smoothedRaw === GESTURE_RAW.THUMBS_UP && timeHeld >= GESTURE.CLOSED_FIST_HOLD_MS) {
                this.state = GESTURE_STATES.SCALE_UP_MODE;
            } else if (smoothedRaw === GESTURE_RAW.THUMBS_DOWN && timeHeld >= GESTURE.CLOSED_FIST_HOLD_MS) {
                this.state = GESTURE_STATES.SCALE_DOWN_MODE;
            }
        } else if (this.state === GESTURE_STATES.MENU_MODE) {
            // Inside MENU_MODE
            if (smoothedRaw === GESTURE_RAW.OPEN_PALM && timeHeld >= 250) {
                // Cancel menu
                this.state = GESTURE_STATES.IDLE;
                document.getElementById('gesture-menu').classList.add('hidden');
                this.candidateStartTime = now;
            } else if (smoothedRaw === GESTURE_RAW.NONE && timeHeld >= 1000) {
                // Auto-cancel menu if hand is dropped
                this.state = GESTURE_STATES.IDLE;
                document.getElementById('gesture-menu').classList.add('hidden');
                this.candidateStartTime = now;
            } else if (timeHeld >= 250) {
                let shapeToSpawn = null;
                if (smoothedRaw === GESTURE_RAW.ZOOM_IN_GESTURE || smoothedRaw === 'LEFT_TWO_FINGERS') shapeToSpawn = 'cube';      // 2 fingers
                if (smoothedRaw === GESTURE_RAW.ZOOM_OUT_GESTURE) shapeToSpawn = 'sphere';   // 3 fingers
                if (smoothedRaw === GESTURE_RAW.FOUR_FINGERS || smoothedRaw === 'LEFT_FOUR_FINGERS') shapeToSpawn = 'cylinder';     // 4 fingers

                if (shapeToSpawn) {
                    window.dispatchEvent(new CustomEvent('gesture-add-shape', { detail: { type: shapeToSpawn } }));
                    this.state = GESTURE_STATES.IDLE;
                    document.getElementById('gesture-menu').classList.add('hidden');
                    this.candidateStartTime = now; // reset to avoid immediate re-trigger
                    this.zoomCooldownUntil = now + 1000; // heavy cooldown
                }
            }
        }

        // Mode cancellation rules (with stability delay)
        if (this.state === GESTURE_STATES.ZOOM_OUT_MODE) {
            if (smoothedRaw !== GESTURE_RAW.ZOOM_OUT_GESTURE && timeHeld >= GESTURE_MOTION_CONFIG.releaseDelayMs) {
                this.state = GESTURE_STATES.IDLE;
                this.zoomCooldownUntil = now + GESTURE.ZOOM_COOLDOWN_MS;
            }
        }
        if (this.state === GESTURE_STATES.ZOOM_IN_MODE) {
            if (smoothedRaw !== GESTURE_RAW.ZOOM_IN_GESTURE && timeHeld >= GESTURE_MOTION_CONFIG.releaseDelayMs) {
                this.state = GESTURE_STATES.IDLE;
                this.zoomCooldownUntil = now + GESTURE.ZOOM_COOLDOWN_MS;
            }
        }
        
        // Reset motion history if gesture state just changed
        if (this.state !== previousState) {
            this.prevWrist = null;
            if (this.state === GESTURE_STATES.OBJECT_MODE) {
                this.objectMovementArmed = true;
                this.translationAnchorWrist = { x: lms[0].x, y: lms[0].y };
                if (window.app && window.app.transformSystem && window.app.transformSystem.selectedObject) {
                    this.translationAnchorObject = window.app.transformSystem.selectedObject.position.clone();
                } else {
                    this.translationAnchorObject = null;
                }
            }
        }

        
        // 3. Draw Skeleton Overlay (ALWAYS visible)
        let skeletonColor = "rgba(255, 255, 255, 0.7)";
        if (detectedRaw === GESTURE_RAW.OPEN_PALM) skeletonColor = "rgba(0, 255, 0, 0.7)";
        else if (detectedRaw === GESTURE_RAW.CLOSED_FIST) skeletonColor = "rgba(255, 0, 0, 0.7)";
        else if (detectedRaw === GESTURE_RAW.THUMBS_UP) skeletonColor = "rgba(255, 215, 0, 0.9)";
        else if (detectedRaw === GESTURE_RAW.THUMBS_DOWN) skeletonColor = "rgba(255, 140, 0, 0.9)";
        
        this.canvasCtx.strokeStyle = skeletonColor;
        this.canvasCtx.lineWidth = 2;
        const connections = [
            [0,1], [1,2], [2,3], [3,4],
            [0,5], [5,6], [6,7], [7,8],
            [5,9], [9,10], [10,11], [11,12],
            [9,13], [13,14], [14,15], [15,16],
            [13,17], [17,18], [18,19], [19,20],
            [0,17]
        ];
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
        this.canvasCtx.restore();

        // 3.5 Draw debug info only if debug is enabled
        if (GESTURE_MOTION_CONFIG.debug) {
            this.drawDebugOverlay(this.canvasCtx, landmarks, detectedRaw, timeHeld);
        }

        if (window.app && window.app.uiManager) {
            let uiGesture = 'None';
            if (detectedRaw === GESTURE_RAW.OPEN_PALM) uiGesture = 'OpenPalm';
            if (detectedRaw === GESTURE_RAW.CLOSED_FIST) uiGesture = 'ClosedFist';
            if (detectedRaw === GESTURE_RAW.THUMBS_UP) uiGesture = 'ThumbsUp';
            if (detectedRaw === GESTURE_RAW.THUMBS_DOWN) uiGesture = 'ThumbsDown';
            if (detectedRaw === GESTURE_RAW.ZOOM_IN_GESTURE) uiGesture = 'ZoomIn';
            if (detectedRaw === GESTURE_RAW.ZOOM_OUT_GESTURE) uiGesture = 'ZoomOut';

            let uiMode = 'Idle';
            if (this.state === GESTURE_STATES.CAMERA_MODE) uiMode = 'Camera';
            if (this.state === GESTURE_STATES.OBJECT_MODE) uiMode = 'Object';
            if (this.state === GESTURE_STATES.SCALE_UP_MODE) uiMode = 'ScaleUp';
            if (this.state === GESTURE_STATES.SCALE_DOWN_MODE) uiMode = 'ScaleDown';
            if (this.state === GESTURE_STATES.ZOOM_IN_MODE) uiMode = 'ZoomIn';
            if (this.state === GESTURE_STATES.ZOOM_OUT_MODE) uiMode = 'ZoomOut';
            if (this.state === GESTURE_STATES.MENU_MODE) uiMode = 'Menu';

            window.app.uiManager.updateSimpleStatus(uiGesture, uiMode, 'Detected');
        }

        // 4. Calculate Frame Delta (for camera/rotation)
        const wrist = lms[0];
        let deltaX = 0;
        let deltaY = 0;

        if (this.prevWrist) {
            const rawDeltaX = wrist.x - this.prevWrist.x;
            const rawDeltaY = wrist.y - this.prevWrist.y;
            this.lastRawDeltaX = rawDeltaX; // For debug

            // Apply Exponential Moving Average (EMA) smoothing to camera deltas for flawless motion
            if (this.smoothedDeltaX === undefined) this.smoothedDeltaX = rawDeltaX;
            if (this.smoothedDeltaY === undefined) this.smoothedDeltaY = rawDeltaY;

            // alpha 0.4 offers a good balance between responsiveness and buttery smoothness
            const alpha = 0.4;
            this.smoothedDeltaX = (alpha * rawDeltaX) + ((1 - alpha) * this.smoothedDeltaX);
            this.smoothedDeltaY = (alpha * rawDeltaY) + ((1 - alpha) * this.smoothedDeltaY);

            deltaX = this.smoothedDeltaX;
            deltaY = this.smoothedDeltaY;

            if (MIRROR_X) {
                deltaX = -deltaX;
            }

            this.lastCorrectedDeltaX = deltaX; // For debug

            // 5. Apply Dead Zone for Frame Deltas
            if (Math.abs(deltaX) < GESTURE.DEAD_ZONE) {
                deltaX = 0;
                this.smoothedDeltaX *= 0.5; // Quick decay when returning to deadzone
            }
            if (Math.abs(deltaY) < GESTURE.DEAD_ZONE) {
                deltaY = 0;
                this.smoothedDeltaY *= 0.5; // Quick decay when returning to deadzone
            }
        }

        // Clone the coordinates to avoid reference mutation during the next frame's EMA calculation!
        this.prevWrist = { x: wrist.x, y: wrist.y };

        // 5.5 Anchor-Based Calculation for Object Movement
        let anchorOffsetX = 0;
        let anchorOffsetY = 0;
        if (this.state === GESTURE_STATES.OBJECT_MODE && this.translationAnchorWrist) {
            let rawOffsetX = wrist.x - this.translationAnchorWrist.x;
            let rawOffsetY = wrist.y - this.translationAnchorWrist.y;
            
            if (MIRROR_X) rawOffsetX = -rawOffsetX;
            
            // EMA Smoothing for offset
            if (this.smoothedOffsetX === undefined) this.smoothedOffsetX = rawOffsetX;
            if (this.smoothedOffsetY === undefined) this.smoothedOffsetY = rawOffsetY;
            
            const alpha = GESTURE_MOTION_CONFIG.smoothingAlpha;
            this.smoothedOffsetX = (alpha * rawOffsetX) + ((1 - alpha) * this.smoothedOffsetX);
            this.smoothedOffsetY = (alpha * rawOffsetY) + ((1 - alpha) * this.smoothedOffsetY);
            
            anchorOffsetX = this.smoothedOffsetX;
            anchorOffsetY = this.smoothedOffsetY;
            
            // Apply deadzone
            if (Math.abs(anchorOffsetX) < GESTURE_MOTION_CONFIG.movementDeadzoneNormalized) {
                anchorOffsetX = 0;
                this.smoothedOffsetX *= 0.5; // Crisp stop
            }
            if (Math.abs(anchorOffsetY) < GESTURE_MOTION_CONFIG.movementDeadzoneNormalized) {
                anchorOffsetY = 0;
                this.smoothedOffsetY *= 0.5; // Crisp stop
            }
            
            // We now have a clean, smoothed, deadzoned offset from the anchor.
        }

        // Debug Logs
        if (this.state !== GESTURE_STATES.IDLE && (deltaX !== 0 || deltaY !== 0 || anchorOffsetX !== 0 || anchorOffsetY !== 0 || this.state.includes('ZOOM'))) {
            const ts = window.app ? window.app.transformSystem : null;
            console.log('[GestureAction]', this.state, { deltaX, deltaY, anchorOffsetX, anchorOffsetY, selected: ts ? !!ts.selectedObject : false });
        }
        
        // 6. Apply mapped interaction using specific layers
        if (this.state === GESTURE_STATES.CAMERA_MODE) {
            this.showBadge('📷 Camera Mode');
            this.applyCameraGestureDelta(deltaX, deltaY);
        } else if (this.state === GESTURE_STATES.OBJECT_MODE) {
            this.applyObjectGestureOffset(anchorOffsetX, anchorOffsetY);
        } else if (this.state === GESTURE_STATES.SCALE_UP_MODE) {
            this.showBadge('👍 Scale Up');
            this.applyScaleStep('up');
        } else if (this.state === GESTURE_STATES.SCALE_DOWN_MODE) {
            this.showBadge('👎 Scale Down');
            this.applyScaleStep('down');
        } else if (this.state === GESTURE_STATES.ZOOM_OUT_MODE) {
            this.showBadge('🔍 Zoom Out');
            this.applyZoomStep('out');
        } else if (this.state === GESTURE_STATES.ZOOM_IN_MODE) {
            this.showBadge('🔍 Zoom In');
            this.applyZoomStep('in');
        } else {
            this.hideBadge();
        }

        this.updateAdvancedDebugPanel(detectedRaw, score, singleHandLabel, deltaX, deltaY, anchorOffsetX, anchorOffsetY);
    }

    applyZoomStep(direction) {
        if (!window.app) return;
        const ts = window.app.transformSystem;
        const orbitControls = ts.orbitControls;
        const camera = ts.camera;
        if (!orbitControls || !camera) return;

        const ZOOM_FACTOR = 1.025; // Slightly stronger for responsiveness
        const MIN_DIST = 2;
        const MAX_DIST = 50;

        // Use Spherical to safely modify radius, respecting OrbitControls math
        const offset = new THREE.Vector3().copy(camera.position).sub(orbitControls.target);
        const spherical = new THREE.Spherical().setFromVector3(offset);

        if (direction === 'in') {
            spherical.radius = Math.max(MIN_DIST, spherical.radius / ZOOM_FACTOR);
        } else {
            spherical.radius = Math.min(MAX_DIST, spherical.radius * ZOOM_FACTOR);
        }

        offset.setFromSpherical(spherical);
        camera.position.copy(orbitControls.target).add(offset);
        orbitControls.update();
    }

    applyCameraGestureDelta(deltaX, deltaY) {
        if (!window.app) return;
        const ts = window.app.transformSystem;
        const orbitControls = ts.orbitControls;
        const camera = ts.camera;
        if (!orbitControls || !camera) return;

        const azimuthSpeed = 2.5;
        const polarSpeed = 2.0;

        if (typeof orbitControls.rotateLeft === 'function') {
            orbitControls.rotateLeft(deltaX * azimuthSpeed);
            orbitControls.rotateUp(deltaY * polarSpeed);
        } else {
            // Safe mathematical fallback interacting directly with Spherical coordinates around the target
            const offset = new THREE.Vector3().copy(camera.position).sub(orbitControls.target);
            const spherical = new THREE.Spherical().setFromVector3(offset);
            
            spherical.theta -= deltaX * azimuthSpeed;
            spherical.phi -= deltaY * polarSpeed;
            
            // Clamp phi to avoid flipping over the poles
            spherical.phi = Math.max(orbitControls.minPolarAngle, Math.min(orbitControls.maxPolarAngle, spherical.phi));
            spherical.makeSafe();
            
            offset.setFromSpherical(spherical);
            camera.position.copy(orbitControls.target).add(offset);
            camera.lookAt(orbitControls.target);
        }
        orbitControls.update();
    }

    applyObjectGestureOffset(offsetX, offsetY) {
        if (!window.app) return;
        const ts = window.app.transformSystem;
        const ui = window.app.uiManager;
        const selectedObject = ts.selectedObject;
        const camera = ts.camera;

        if (!selectedObject || !this.translationAnchorObject || !camera) {
            this.showBadge('Select an object first');
            return;
        }

        if (ts.isTransformDragging) {
            // Ignore gesture while gizmo is actively being dragged by mouse
            return;
        }

        this.showBadge('✊ Move Mode');

        // Camera-Relative Mapping
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

        // Compute Target Position based on anchor
        const targetPosition = this.translationAnchorObject.clone();
        
        const sensitivity = GESTURE_MOTION_CONFIG.movementSensitivity;
        
        // offsetX moves right/left relative to camera
        targetPosition.add(right.multiplyScalar(offsetX * GESTURE.SCENE_WIDTH * sensitivity));
        
        // offsetY moves up/down relative to camera (y is inverted in hand coords, so -offsetY)
        targetPosition.add(up.multiplyScalar(-offsetY * GESTURE.SCENE_HEIGHT * sensitivity));

        // Clamping to boundaries
        targetPosition.x = Math.max(-10, Math.min(10, targetPosition.x));
        targetPosition.y = Math.max(-5, Math.min(10, targetPosition.y));
        targetPosition.z = Math.max(-10, Math.min(10, targetPosition.z));

        // Smooth Glide (max delta per frame constraint)
        const movementVector = new THREE.Vector3().subVectors(targetPosition, selectedObject.position);
        if (movementVector.length() > GESTURE_MOTION_CONFIG.maxDeltaPerFrame) {
            movementVector.setLength(GESTURE_MOTION_CONFIG.maxDeltaPerFrame);
        }
        
        selectedObject.position.add(movementVector);

        if (ts.transformControl && ts.transformControl.object === selectedObject) {
            ts.transformControl.attach(selectedObject);
        }

        ui.setSelectedObject(selectedObject);
    }

    applyRotationGestureDelta(deltaX, deltaY) {
        if (!window.app) return;
        const ts = window.app.transformSystem;
        const ui = window.app.uiManager;
        const selectedObject = ts.selectedObject;

        if (!selectedObject) {
            this.showBadge('Select an object first');
            return;
        }

        if (ts.isTransformDragging) return;

        // Apply rotation to the chosen axis using deltaX (horizontal palm movement)
        const rotationSpeed = Math.PI; 
        
        if (this.rotationAxis === 'x') {
            selectedObject.rotation.x += deltaX * rotationSpeed;
        } else if (this.rotationAxis === 'y') {
            selectedObject.rotation.y += deltaX * rotationSpeed;
        } else if (this.rotationAxis === 'z') {
            selectedObject.rotation.z += deltaX * rotationSpeed;
        }

        ui.setSelectedObject(selectedObject);
    }

    applyScaleStep(direction) {
        if (!window.app) return;
        const ts = window.app.transformSystem;
        const ui = window.app.uiManager;
        const selectedObject = ts.selectedObject;

        if (!selectedObject) {
            this.showBadge('Select an object first');
            return;
        }

        if (ts.isTransformDragging) return;

        const SCALE_FACTOR = 1.025; // Smooth scaling amount per frame
        const currentScale = selectedObject.scale.x;
        let newScale;

        if (direction === 'up') {
            newScale = Math.min(20.0, currentScale * SCALE_FACTOR);
        } else {
            newScale = Math.max(0.1, currentScale / SCALE_FACTOR);
        }

        selectedObject.scale.set(newScale, newScale, newScale);

        if (ts.transformControl && ts.transformControl.object === selectedObject) {
            ts.transformControl.attach(selectedObject);
        }

        ui.setSelectedObject(selectedObject);
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

    updateAdvancedDebugPanel(rawGesture, score, handedness, deltaX, deltaY, anchorOffsetX, anchorOffsetY) {
        if (!document.getElementById('advanced-debug-panel') || document.getElementById('advanced-debug-panel').classList.contains('hidden')) return;

        // Gesture state
        const elState = document.getElementById('dbg-gesture-state');
        if (elState) elState.textContent = this.state;

        const elRaw = document.getElementById('dbg-gesture-raw');
        if (elRaw) elRaw.textContent = rawGesture;

        const elScore = document.getElementById('dbg-gesture-score');
        if (elScore) elScore.textContent = `(${score}%)`;

        const elHand = document.getElementById('dbg-handedness');
        if (elHand) elHand.textContent = handedness;

        const elArmed = document.getElementById('dbg-anchor-status');
        if (elArmed) elArmed.textContent = this.objectMovementArmed ? 'YES' : 'NO';

        const elRawDelta = document.getElementById('dbg-raw-delta');
        if (elRawDelta) elRawDelta.textContent = `${(this.lastRawDeltaX || 0).toFixed(3)}, ${(deltaY || 0).toFixed(3)}`;

        const elSmooth = document.getElementById('dbg-smooth-delta');
        if (elSmooth) elSmooth.textContent = `${(this.smoothedOffsetX || 0).toFixed(3)}, ${(this.smoothedOffsetY || 0).toFixed(3)}`;

        const elObj = document.getElementById('dbg-obj-delta');
        if (elObj) elObj.textContent = `${(anchorOffsetX || 0).toFixed(3)}, ${(anchorOffsetY || 0).toFixed(3)}`;

        // System state
        const ts = window.app ? window.app.transformSystem : null;
        const elSel = document.getElementById('dbg-sys-selection');
        if (elSel) elSel.textContent = ts && ts.selectedObject ? ts.selectedObject.name : 'None';

        const sm = window.app ? window.app.sceneManager : null;
        const elCam = document.getElementById('dbg-sys-camera');
        if (elCam) elCam.textContent = sm && sm.controls ? 'Orbiting' : 'Unknown';
    }

    drawDebugOverlay(ctx, landmarks, detectedRaw, timeHeld) {
        if (!GESTURE_MOTION_CONFIG.debug) return;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(10, 10, 280, 180);

        ctx.fillStyle = 'white';
        ctx.font = '12px monospace';
        let y = 25;
        const line = (text) => {
            ctx.fillText(text, 15, y);
            y += 15;
        };

        line(`State: ${this.state}`);
        line(`Raw: ${detectedRaw}`);
        line(`Hold: ${timeHeld}ms`);
        line(`Armed: ${this.objectMovementArmed ? 'YES' : 'NO'}`);

        if (this.state === GESTURE_STATES.OBJECT_MODE) {
            line(`Anchor Off X: ${(this.smoothedOffsetX || 0).toFixed(4)}`);
            line(`Anchor Off Y: ${(this.smoothedOffsetY || 0).toFixed(4)}`);
        } else {
            line(`Delta X: ${(this.lastCorrectedDeltaX || 0).toFixed(4)}`);
            line(`Delta Y: ${(this.lastRawDeltaY || 0).toFixed(4)}`);
        }

        ctx.restore();
    }
}

// Export GestureSystem for manual initialization by login orchestrator
export { GestureSystem };
