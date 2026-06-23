import { runLoginGate } from './login.js';

class LockScreen {
    constructor() {
        this.overlay = document.getElementById('lock-screen-overlay');
        this.appContainer = document.getElementById('app');
        this.slider = document.getElementById('unlock-slider');
        
        this.setupEvents();
    }

    setupEvents() {
        // Handle slider release (snap back if not fully unlocked)
        this.slider.addEventListener('mouseup', () => this.handleSliderRelease());
        this.slider.addEventListener('touchend', () => this.handleSliderRelease());
        
        // Handle slider dragging (check for unlock threshold)
        this.slider.addEventListener('input', () => this.checkUnlock());
    }

    handleSliderRelease() {
        if (parseInt(this.slider.value) < 100) {
            // Snap back to 0 with a smooth animation
            this.slider.style.transition = 'value 0.3s ease';
            this.slider.value = 0;
            setTimeout(() => {
                this.slider.style.transition = '';
            }, 300);
        }
    }

    async checkUnlock() {
        if (parseInt(this.slider.value) >= 100) {
            // Slider reached the end -> proceed to login gate
            this.slider.disabled = true; // prevent interacting
            
            // Hide lock screen overlay
            this.overlay.classList.add('hidden');
            
            try {
                // Restart the cinematic login gate
                const authenticated = await runLoginGate();
                
                if (authenticated) {
                    // Success -> restore app
                    this.appContainer.classList.remove('hidden');
                    // Reset slider for next time
                    this.slider.value = 0;
                    this.slider.disabled = false;
                } else {
                    // Should not happen unless error, but just in case, relock
                    this.lockApp();
                }
            } catch (err) {
                console.error('[LockScreen] Unlock failed:', err);
                this.lockApp();
            }
        }
    }

    lockApp() {
        // 1. Hide the editor
        this.appContainer.classList.add('hidden');
        
        // 2. Stop gesture tracking (release webcam)
        if (window.gestureSystem) {
            window.gestureSystem.stopTracking();
        }
        
        // 3. Show lock screen overlay
        this.slider.value = 0;
        this.slider.disabled = false;
        this.overlay.classList.remove('hidden');
    }
}

// Global instance
export const lockScreenSystem = new LockScreen();
