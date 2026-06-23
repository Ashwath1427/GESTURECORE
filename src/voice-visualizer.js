export class VoiceVisualizer {
    constructor(canvas, statusEl, levelEl, micDot) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.statusEl = statusEl;
        this.levelEl = levelEl;
        this.micDot = micDot;
        
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.rafId = null;
        this.running = false;
        
        this.silenceTimer = 0;
    }

    start(stream) {
        if (this.running) return;
        this.running = true;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 1024;

            this.source = this.audioContext.createMediaStreamSource(stream);
            this.source.connect(this.analyser);
        } catch (err) {
            console.error('Failed to initialize AudioContext for visualizer', err);
            this.statusEl.textContent = 'Voice error';
            return;
        }

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!this.running) return;
            this.rafId = requestAnimationFrame(draw);

            // Time domain for waveform
            this.analyser.getByteTimeDomainData(dataArray);

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'rgba(255,255,255,0.03)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = '#60a5fa';
            this.ctx.beginPath();

            const sliceWidth = this.canvas.width / bufferLength;
            let x = 0;
            let sumLevel = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * this.canvas.height) / 2;

                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);

                x += sliceWidth;
                sumLevel += Math.abs(dataArray[i] - 128);
            }

            this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
            this.ctx.stroke();

            // Calculate live level percent
            const avgLevel = sumLevel / bufferLength;
            const levelPercent = Math.min(100, Math.round((avgLevel / 40) * 100));
            this.levelEl.textContent = `${levelPercent}%`;

            // Adjust UI based on level
            if (levelPercent > 5) {
                this.micDot.style.boxShadow = `0 0 ${10 + levelPercent}px rgba(74, 222, 128, 0.8)`;
                this.micDot.style.background = '#4ade80';
                this.statusEl.textContent = 'Listening...';
                this.silenceTimer = 0;
            } else {
                this.micDot.style.boxShadow = `0 0 5px rgba(74, 222, 128, 0.4)`;
                this.micDot.style.background = 'rgba(74, 222, 128, 0.5)';
                this.silenceTimer++;
                
                // roughly ~1 second of silence at 60fps
                if (this.silenceTimer > 60) {
                    this.statusEl.textContent = 'No input detected';
                }
            }
        };

        draw();
    }

    stop() {
        this.running = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        
        if (this.source) {
            try { this.source.disconnect(); } catch(e) {}
        }
        if (this.analyser) {
            try { this.analyser.disconnect(); } catch(e) {}
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
            try { this.audioContext.close(); } catch(e) {}
        }
        
        this.source = null;
        this.analyser = null;
        this.audioContext = null;
        
        // Reset canvas & UI
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.levelEl.textContent = '0%';
        this.statusEl.textContent = 'Voice off';
        this.micDot.style.boxShadow = 'none';
        this.micDot.style.background = 'gray';
    }
}
