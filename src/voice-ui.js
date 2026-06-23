export class VoiceUIManager {
    constructor() {
        this.btnToggle = document.getElementById('btn-toggle-voice');
        this.panel = document.getElementById('voice-panel');
        
        this.samplesCountEl = document.getElementById('voice-samples-count');
        this.speakerScoreEl = document.getElementById('voice-speaker-score');
        this.statusTextEl = document.getElementById('voice-status-text');
        this.transcriptTextEl = document.getElementById('voice-transcript-text');
        this.lastActionEl = document.getElementById('voice-last-action');
        
        this.statusVoiceEl = document.getElementById('status-voice');
        this.statusSpeakerEl = document.getElementById('status-speaker');
        this.statusTranscriptEl = document.getElementById('status-transcript');

        // Visualizer Panel
        this.visualizerPanel = document.getElementById('voice-visualizer-panel');
        this.visualizerCanvas = document.getElementById('voice-wave-canvas');
        this.visualizerStatus = document.getElementById('voice-panel-status');
        this.visualizerLevel = document.getElementById('voice-panel-level');
        this.visualizerMicDot = document.querySelector('.voice-mic-dot');

        // Debug UI
        this.debugRecStateEl = document.getElementById('debug-rec-state');
        this.debugRecErrorEl = document.getElementById('debug-rec-error');
        this.debugParsedCmdEl = document.getElementById('debug-parsed-cmd');
    }

    setModeState(isActive) {
        if (isActive) {
            this.btnToggle.textContent = 'Voice Mode: ACTIVE';
            this.btnToggle.classList.add('active');
            this.panel.classList.remove('hidden');
            this.visualizerPanel.classList.remove('hidden');
            this.visualizerStatus.textContent = 'Mic ready';
        } else {
            this.btnToggle.textContent = 'Voice Mode: OFF';
            this.btnToggle.classList.remove('active');
            this.panel.classList.add('hidden');
            this.visualizerPanel.classList.add('hidden');
            this.setStatus('OFF');
        }
    }

    setVisualizerError(errorMsg) {
        this.visualizerStatus.textContent = errorMsg;
        this.visualizerMicDot.style.background = '#ef4444';
        this.visualizerMicDot.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.6)';
    }

    setSamplesCount(count) {
        this.samplesCountEl.textContent = count;
        if (count < 3) {
            this.statusSpeakerEl.textContent = 'Unverified';
            this.statusSpeakerEl.className = ''; // Neutral state, not offline/red
        } else {
            this.statusSpeakerEl.textContent = 'Ready';
            this.statusSpeakerEl.className = 'online';
        }
    }

    setSpeakerScore(score, passed = null) {
        if (score === null || score === undefined) {
            this.speakerScoreEl.textContent = '-';
            return;
        }
        this.speakerScoreEl.textContent = (score * 100).toFixed(1) + '%';
        if (passed === true) {
            this.speakerScoreEl.style.color = '#4ade80';
            this.statusSpeakerEl.textContent = 'Verified ✓';
            this.statusSpeakerEl.className = 'online';
        } else if (passed === false) {
            this.speakerScoreEl.style.color = '#ef4444';
            this.statusSpeakerEl.textContent = 'Rejected ✗';
            this.statusSpeakerEl.className = 'offline';
        }
    }

    setStatus(status) {
        this.statusTextEl.textContent = status;
        this.statusVoiceEl.textContent = status;
        
        if (status === 'OFF' || status === 'UNSUPPORTED' || status === 'REJECTED') {
            this.statusVoiceEl.className = 'offline';
        } else if (status === 'READY') {
            this.statusVoiceEl.className = '';
        } else {
            this.statusVoiceEl.className = 'online';
        }
    }

    setTranscript(text) {
        if (!text) {
            this.transcriptTextEl.innerHTML = '<span class="placeholder">Waiting for voice...</span>';
            this.statusTranscriptEl.textContent = '';
        } else {
            this.transcriptTextEl.textContent = text;
            this.statusTranscriptEl.textContent = text.length > 20 ? text.substring(0, 20) + '...' : text;
        }
    }

    setLastAction(actionText, isError = false) {
        this.lastActionEl.textContent = actionText;
        this.lastActionEl.style.color = isError ? '#ef4444' : '#94a3b8';
    }

    setDebugState(state) {
        if (this.debugRecStateEl) this.debugRecStateEl.textContent = state;
    }

    setDebugError(error) {
        if (this.debugRecErrorEl) this.debugRecErrorEl.textContent = error;
    }

    setDebugCmd(cmd) {
        if (this.debugParsedCmdEl) this.debugParsedCmdEl.textContent = cmd;
    }
}
