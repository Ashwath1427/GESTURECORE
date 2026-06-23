import { AUTH_CONFIG } from './config.js';

export class PinAuth {
    constructor(ui) {
        this.ui = ui;
        this.isLocked = false;
        
        // Expose promise resolution
        this.resolveSuccess = null;
        this.rejectFailure = null;
    }

    waitForPinSuccess() {
        return new Promise((resolve, reject) => {
            this.resolveSuccess = resolve;
            this.rejectFailure = reject;
            
            this.ui.showPinPanel();
            this.ui.setAuthStatus('PIN Required', 'waiting');
            
            // Attach event listener once
            this.ui.pinInput.oninput = () => this.handleInput();
        });
    }

    handleInput() {
        if (this.isLocked) return;
        
        const val = this.ui.pinInput.value;
        if (val.length === 7) {
            this.verifyPin(val);
        } else {
            this.ui.showPinError(null);
        }
    }

    verifyPin(inputPin) {
        this.isLocked = true;
        this.ui.pinInput.disabled = true;
        
        if (inputPin === AUTH_CONFIG.pin) {
            this.ui.showPinError(null);
            this.ui.setAuthStatus('PIN Accepted', 'success');
            if (this.resolveSuccess) {
                this.resolveSuccess(true);
            }
        } else {
            this.ui.showPinError('Incorrect PIN. Please wait...');
            this.ui.pinInput.value = '';
            
            setTimeout(() => {
                this.isLocked = false;
                this.ui.pinInput.disabled = false;
                this.ui.pinInput.focus();
                this.ui.showPinError(null);
            }, AUTH_CONFIG.pinRetryDelayMs);
        }
    }
}
