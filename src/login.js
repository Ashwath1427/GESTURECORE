import { App } from './main.js';
import { GestureSystem } from './gesture.js';
import { LoginUI } from './login-ui.js';
import { FaceDetectorSystem } from './face-detect.js';
import { FaceRecognitionSystem } from './face-recognition.js';
import { PinAuth } from './pin-auth.js';

export async function runLoginGate() {
    const ui = new LoginUI();
    const faceDetect = new FaceDetectorSystem(ui);
    const faceRec = new FaceRecognitionSystem(ui);
    const pinAuth = new PinAuth(ui);

    ui.setAuthStatus('Waiting', 'waiting');

    // 1. Try to start camera and load models
    const camPromise = faceDetect.startCamera();
    const modelPromise = faceRec.loadModels();
    
    // We can load models in background while camera starts
    const camStarted = await camPromise;
    
    // Setup manual PIN override
    let forcePin = false;
    let manualPinPromiseResolver = null;
    const manualPinPromise = new Promise(resolve => {
        manualPinPromiseResolver = resolve;
    });

    ui.btnPin.onclick = () => {
        forcePin = true;
        faceDetect.stopCamera();
        manualPinPromiseResolver(false); // abort face matching
    };

    if (!camStarted || forcePin) {
        // Fallback directly to PIN
        faceDetect.stopCamera();
        ui.setFaceStatus('Camera unavailable', 'error');
        const pinOk = await pinAuth.waitForPinSuccess();
        return pinOk;
    }

    // Camera is running, wait for models
    try {
        await modelPromise;
    } catch (err) {
        console.warn('Face models failed to load:', err);
        faceDetect.stopCamera();
        ui.setFaceStatus('Models unavailable', 'error');
        const pinOk = await pinAuth.waitForPinSuccess();
        return pinOk;
    }
    await faceDetect.initialize(); // load MediaPipe

    // If no face enrolled yet, force enrollment flow first
    if (!faceRec.enrolledDescriptor) {
        ui.showEnrollPanel();
        
        await new Promise((resolve) => {
            ui.btnEnroll.textContent = 'Authenticate to Enroll';
            ui.btnEnroll.onclick = async () => {
                ui.btnEnroll.disabled = true;
                
                // 1. Require PIN authentication first to close TOFU vulnerability
                ui.setAuthStatus('PIN Required for Enrollment', 'waiting');
                const pinOk = await pinAuth.waitForPinSuccess();
                if (!pinOk) {
                    ui.setAuthStatus('PIN Failed. Enrollment Aborted.', 'error');
                    forcePin = true;
                    resolve();
                    return;
                }
                
                // 2. PIN successful, proceed to face capture
                ui.setAuthStatus('PIN Accepted. Scanning Face...', 'waiting');
                ui.btnEnroll.textContent = 'Look at the camera...';
                
                // Start tracking to ensure face is visible
                faceDetect.startDetectionLoop();
                
                // Wait for stable face
                await new Promise(res => {
                    faceDetect.onStableFaceDetected = res;
                });
                
                // Stable face achieved, freeze frame and capture
                const success = await faceRec.enrollFace();
                if (success) {
                    ui.btnEnroll.textContent = 'Enrolled!';
                    setTimeout(resolve, 1000);
                } else {
                    ui.btnEnroll.textContent = 'Failed. Try again';
                    ui.btnEnroll.disabled = false;
                }
            };
            
            // Allow PIN fallback even during enrollment
            ui.btnPin.onclick = () => {
                forcePin = true;
                resolve();
            };
        });
        
        if (forcePin) {
            faceDetect.stopCamera();
            const pinOk = await pinAuth.waitForPinSuccess();
            return pinOk;
        }

        // Restore standard UI for actual login attempt
        ui.cameraPanel.classList.remove('hidden');
        ui.enrollPanel.classList.add('hidden');
        ui.btnStart.classList.remove('hidden');
        ui.btnPin.classList.remove('hidden');
    }

    // Standard Face Login Flow
    return new Promise((resolve) => {
        const attemptFaceLogin = async () => {
            ui.btnStart.disabled = true;
            ui.btnStart.textContent = 'Scanning...';
            
            faceDetect.startDetectionLoop();
            
            // Wait for stable face OR manual PIN override
            let stable = false;
            
            faceDetect.onStableFaceDetected = () => { stable = true; manualPinPromiseResolver(true); };
            
            const faceFound = await Promise.race([
                new Promise(res => { faceDetect.onStableFaceDetected = () => res(true); }),
                manualPinPromise
            ]);

            if (!faceFound || forcePin) {
                // Aborted or switched to PIN
                const pinOk = await pinAuth.waitForPinSuccess();
                resolve(pinOk);
                return;
            }

            // Face was stable, try recognition
            try {
                const matchResult = await faceRec.attemptMatch();
                if (matchResult && matchResult.success) {
                    const welcomeName = matchResult.personId.charAt(0).toUpperCase() + matchResult.personId.slice(1);
                    const greeting = document.getElementById('login-greeting');
                    if (greeting) greeting.textContent = `Welcome, ${welcomeName}`;
                    resolve(true);
                } else {
                    // Fallback to PIN after failure
                    ui.setFaceStatus('Face not confidently recognized. Use PIN.', 'error');
                    setTimeout(async () => {
                        const pinOk = await pinAuth.waitForPinSuccess();
                        resolve(pinOk);
                    }, 1500);
                }
            } catch (err) {
                console.error('Face recognition error:', err);
                const pinOk = await pinAuth.waitForPinSuccess();
                resolve(pinOk);
            }
        };

        ui.btnStart.onclick = attemptFaceLogin;
        
        // Auto-start scan
        attemptFaceLogin();
    }).then(async (success) => {
        faceDetect.stopCamera();
        if (success) {
            await ui.playLoginSuccessAnimation();
        }
        return success;
    });
}

// Start Login Gate when DOM is ready
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const authenticated = await runLoginGate();
        if (authenticated) {
            // Boot the editor
            window.app = new App();
            window.gestureSystem = new GestureSystem();
        }
    } catch (err) {
        console.error('Login failed catastrophically:', err);
    }
});
