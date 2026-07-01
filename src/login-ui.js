import { AUTH_CONFIG } from './config.js';

export class LoginUI {
    constructor() {
        this.overlay = document.getElementById('login-overlay');
        this.appContainer = document.getElementById('app');
        this.cameraPanel = document.getElementById('login-camera-panel');
        this.pinPanel = document.getElementById('login-pin-panel');
        this.enrollPanel = document.getElementById('login-enroll-panel');
        this.scanLine = document.getElementById('scan-line');
        
        this.btnStart = document.getElementById('btn-login-start');
        this.btnPin = document.getElementById('btn-login-pin');
        this.btnRegister = document.getElementById('btn-login-register');
        this.btnEnroll = document.getElementById('btn-login-enroll');
        this.pinInput = document.getElementById('login-pin-input');
        this.pinError = document.getElementById('login-pin-error');
        
        this.statusCamera = document.getElementById('login-status-camera');
        this.statusFace = document.getElementById('login-status-face');
        this.statusAuth = document.getElementById('login-status-auth');
        
        // Reset overlay visibility if it was hidden previously
        this.overlay.classList.remove('hidden');
        this.overlay.style.opacity = '1';
        this.overlay.style.transform = 'none';
        this.overlay.style.background = 'radial-gradient(circle at center, #1e1e24 0%, #0a0a0c 100%)';
        
        // Ensure panels are in default state
        this.cameraPanel.classList.remove('hidden');
        this.pinPanel.classList.add('hidden');
        this.enrollPanel.classList.add('hidden');
        this.btnStart.classList.remove('hidden');
        this.btnPin.classList.remove('hidden');
        // "Register Face (Admin)" only belongs on the PIN screen, not the face-scan screen.
        if (this.btnRegister) this.btnRegister.classList.add('hidden');
        this.pinInput.value = '';
        this.pinError.classList.add('hidden');
        
        // Reset disabled states for when UI is re-initialized (e.g. after lock/unlock)
        this.pinInput.disabled = false;
        this.btnStart.disabled = false;
        this.btnPin.disabled = false;
        this.btnEnroll.disabled = false;
        
        // Reset text contents
        this.btnStart.textContent = 'Start Face Scan';
        this.btnEnroll.textContent = 'Enroll Face Now';



        // Init user name
        const greeting = document.getElementById('login-greeting');
        if (greeting) greeting.textContent = `Welcome, ${AUTH_CONFIG.userName}`;
    }

    setCameraStatus(text, type = '') {
        this.statusCamera.textContent = text;
        this.statusCamera.className = type;
    }

    setFaceStatus(text, type = '') {
        this.statusFace.textContent = text;
        this.statusFace.className = type;
    }

    setAuthStatus(text, type = '') {
        this.statusAuth.textContent = text;
        this.statusAuth.className = type;
        
        // Update clean status message for users
        const cleanMsg = document.getElementById('clean-status-message');
        if (cleanMsg) {
            if (text.includes('Analyzing') || text.includes('Waiting for Face')) {
                cleanMsg.textContent = 'Scanning face...';
                cleanMsg.style.color = '#a78bfa'; // violet glow
            } else if (text.includes('PASS')) {
                cleanMsg.textContent = 'Face matched. Verifying securely...';
                cleanMsg.style.color = '#10b981'; // green
            } else if (text.includes('REJECT') || text.includes('high')) {
                cleanMsg.textContent = 'Face not recognized. Adjust position.';
                cleanMsg.style.color = '#ef4444'; // red
            } else if (text.includes('Failed') || text.includes('PIN')) {
                cleanMsg.textContent = 'Face not confidently recognized. Use PIN.';
                cleanMsg.style.color = '#ef4444'; // red
            } else if (text.includes('Successfully')) {
                cleanMsg.textContent = 'Secure Access Granted';
                cleanMsg.style.color = '#10b981';
            } else {
                cleanMsg.textContent = text.replace(/\[Diag\].*?->/, '').trim();
            }
        }
    }

    showScanLine(show) {
        if (show) this.scanLine.classList.remove('hidden');
        else this.scanLine.classList.add('hidden');
    }

    showPinPanel() {
        this.cameraPanel.classList.add('hidden');
        this.enrollPanel.classList.add('hidden');
        this.pinPanel.classList.remove('hidden');
        this.pinInput.focus();

        this.btnStart.classList.add('hidden');
        this.btnPin.classList.add('hidden');
        // The admin registration entry point lives on the PIN screen only.
        if (this.btnRegister) this.btnRegister.classList.remove('hidden');
    }

    showEnrollPanel() {
        this.cameraPanel.classList.add('hidden');
        this.pinPanel.classList.add('hidden');
        this.enrollPanel.classList.remove('hidden');

        this.btnStart.classList.add('hidden');
        this.btnPin.classList.add('hidden');
        if (this.btnRegister) this.btnRegister.classList.add('hidden');
    }

    showPinError(text) {
        if (text) {
            this.pinError.textContent = text;
            this.pinError.classList.remove('hidden');
        } else {
            this.pinError.classList.add('hidden');
        }
    }

    async playLoginSuccessAnimation() {
        // Green pulse on auth
        this.overlay.style.background = 'radial-gradient(circle at center, #0f2a1a 0%, #0a0a0c 100%)';
        this.setAuthStatus('Success', 'success');
        
        // Wait briefly for user to see success
        await new Promise(r => setTimeout(r, 800));
        
        // Fade out overlay
        this.overlay.style.opacity = '0';
        this.overlay.style.transform = 'scale(1.05)';
        
        // Wait for CSS transition
        await new Promise(r => setTimeout(r, 500));
        
        this.overlay.classList.add('hidden');
        this.appContainer.classList.remove('hidden');
    }
}
