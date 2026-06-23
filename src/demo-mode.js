import { demoSteps } from './demo-script.js';

export class DemoMode {
    constructor(app) {
        this.app = app;
        this.state = 'IDLE'; // IDLE, STARTING, BUILDING, DEMONSTRATING, CAMERA_SWEEP, COMPLETE, CANCELLED
        this.currentStep = 0;
        this.demoCancelled = false;
        
        this.uiOverlay = document.getElementById('demo-overlay');
        this.uiTitle = document.getElementById('demo-title');
        this.uiStatus = document.getElementById('demo-status-text');
        this.uiStep = document.getElementById('demo-step-text');
        this.btnStop = document.getElementById('btn-stop-demo');
        this.btnClose = document.getElementById('btn-close-demo');

        if (this.btnStop) {
            this.btnStop.addEventListener('click', () => this.abort());
        }
        if (this.btnClose) {
            this.btnClose.addEventListener('click', () => this._cleanup());
        }
    }

    async start() {
        if (this.state !== 'IDLE' && this.state !== 'CANCELLED' && this.state !== 'COMPLETE') return;
        
        console.log('[DemoMode] Starting scripted sequence...');
        this.state = 'STARTING';
        this.currentStep = 0;
        this.demoCancelled = false;

        // Lock User Input
        this._disableUserInput();

        // Show UI
        if (this.uiOverlay) {
            this.uiOverlay.classList.remove('hidden');
            if (this.uiTitle) this.uiTitle.textContent = 'DEMO MODE RUNNING';
            if (this.btnStop) this.btnStop.classList.remove('hidden');
            if (this.btnClose) this.btnClose.classList.add('hidden');
        }

        try {
            for (let i = 0; i < demoSteps.length; i++) {
                if (this.demoCancelled) break;

                this.currentStep = i + 1;
                const step = demoSteps[i];
                
                // Update UI
                if (this.uiStep) this.uiStep.textContent = `Step ${this.currentStep} of ${demoSteps.length}`;
                if (this.uiStatus) this.uiStatus.textContent = step.label;
                console.log(`[DemoMode] Step ${this.currentStep}: ${step.label}`);

                // Execute step
                await step.run(this.app, this);
                if (this.demoCancelled) break;

                // Wait specified time
                if (step.pauseAfter > 0) {
                    await this.wait(step.pauseAfter);
                }
            }

            if (!this.demoCancelled) {
                this.state = 'COMPLETE';
                if (this.uiTitle) this.uiTitle.textContent = '✅ Demo Complete';
                if (this.uiStatus) this.uiStatus.textContent = 'DPS Nadergul Campus — Ready to Edit';
                if (this.uiStep) this.uiStep.textContent = '';
                if (this.btnStop) this.btnStop.classList.add('hidden');
                if (this.btnClose) this.btnClose.classList.remove('hidden');

                // Auto-dismiss after 4 seconds
                await this.wait(4000);
                if (!this.demoCancelled && this.state === 'COMPLETE') {
                    this._cleanup();
                }
            }
        } catch (err) {
            console.error('[DemoMode] Error:', err);
            this.state = 'CANCELLED';
            if (this.uiTitle) this.uiTitle.textContent = 'Demo Error';
            if (this.uiStatus) this.uiStatus.textContent = 'An error occurred.';
            await this.wait(2000);
            this._cleanup();
        }
    }

    abort() {
        if (this.state !== 'IDLE' && this.state !== 'COMPLETE' && this.state !== 'CANCELLED') {
            console.log('[DemoMode] Aborted by user.');
            this.demoCancelled = true;
            this.state = 'CANCELLED';
            if (this.uiTitle) this.uiTitle.textContent = 'Demo Cancelled';
            if (this.uiStatus) this.uiStatus.textContent = 'Stopping...';
            
            // Give it a tiny moment to exit loops then cleanup
            setTimeout(() => this._cleanup(), 500);
        }
    }

    async wait(ms) {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (this.demoCancelled) {
                    clearInterval(checkInterval);
                    clearTimeout(timeoutId);
                    resolve();
                }
            }, 50);

            const timeoutId = setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, ms);
        });
    }

    _disableUserInput() {
        // Disable orbit controls
        if (this.app.transformSystem && this.app.transformSystem.orbitControls) {
            this.app.transformSystem.orbitControls.enabled = false;
        }
        
        window.app.isDemoRunning = true; 
        
        // Hide standard UI panels to focus on demo
        const rightPanel = document.getElementById('right-inspector');
        if (rightPanel) rightPanel.style.opacity = '0.3';
        if (rightPanel) rightPanel.style.pointerEvents = 'none';
        
        const toolsPanel = document.getElementById('tools-sidebar');
        if (toolsPanel) toolsPanel.style.opacity = '0.3';
        if (toolsPanel) toolsPanel.style.pointerEvents = 'none';
    }

    _cleanup() {
        // Re-enable orbit controls
        if (this.app.transformSystem && this.app.transformSystem.orbitControls) {
            this.app.transformSystem.orbitControls.enabled = true;
        }

        window.app.isDemoRunning = false;
        
        const rightPanel = document.getElementById('right-inspector');
        if (rightPanel) rightPanel.style.opacity = '1';
        if (rightPanel) rightPanel.style.pointerEvents = 'auto';

        const toolsPanel = document.getElementById('tools-sidebar');
        if (toolsPanel) toolsPanel.style.opacity = '1';
        if (toolsPanel) toolsPanel.style.pointerEvents = 'auto';

        if (this.uiOverlay) {
            this.uiOverlay.classList.add('hidden');
        }
        
        if (this.state !== 'CANCELLED') {
            this.state = 'IDLE';
        }
    }
}

