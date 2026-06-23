import { VoiceUIManager } from './voice-ui.js';
import { createSpeechRecognizer } from './voice-recognition.js';
import { discoverEnrollmentSamples, buildEnrollmentProfile, recordCommandAudio, extractSimpleVoiceFeatures, extractSpectralBands, compareVoiceProfiles } from './voice-print.js';
import { parseVoiceCommand, executeVoiceCommand } from './voice-commands.js';
import { VoiceVisualizer } from './voice-visualizer.js';

class VoiceMode {
    constructor() {
        this.ui = new VoiceUIManager();
        this.isActive = false;
        this.isVerifying = false;
        this.enrolledProfile = null;
        
        this.micStream = null;
        this.visualizer = null;
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        this.recognizer = createSpeechRecognizer({
            onTranscript: this.handleTranscript.bind(this),
            onError: this.handleSpeechError.bind(this),
            onStateChange: (state) => {
                this.ui.setDebugState(state);
                if (state === 'Hearing Speech') {
                    this.ui.setStatus('LISTENING');
                    this.playAudioFeedback('start');
                }
            },
            onEnd: this.handleSpeechEnd.bind(this)
        });

        this.setupEvents();
    }

    async setupEvents() {
        this.ui.btnToggle.addEventListener('click', () => {
            this.toggleMode();
        });

        window.addEventListener('voice-activation-triggered', async () => {
            if (!this.isActive || this.isVerifying) return;
            await this.handleActivation();
        });
    }

    async toggleMode() {
        if (!this.isActive) {
            this.ui.setModeState(true);
            this.ui.setStatus('Initializing...');
            
            if (!this.recognizer.supported) {
                this.ui.setStatus('UNSUPPORTED');
                this.ui.setLastAction('Speech Recognition API not supported in this browser.', true);
                return;
            }

            // Explicitly request microphone permission and keep stream open
            this.ui.setStatus('Requesting Mic...');
            try {
                this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                // Initialize and start visualizer
                this.visualizer = new VoiceVisualizer(
                    this.ui.visualizerCanvas,
                    this.ui.visualizerStatus,
                    this.ui.visualizerLevel,
                    this.ui.visualizerMicDot
                );
                this.visualizer.start(this.micStream);
            } catch (err) {
                this.ui.setStatus('REJECTED');
                this.ui.setLastAction('Microphone permission denied.', true);
                this.ui.setVisualizerError('Permission denied');
                return;
            }

            // Bypass blocking discoverEnrollmentSamples to fix 404 stalls
            this.enrolledProfile = null;
            this.ui.setSamplesCount(0);
            this.ui.setStatus('READY');
            this.ui.setLastAction('Ready for commands');
            this.isActive = true;
            this.ui.statusSpeakerEl.textContent = 'Verification Disabled';

            // Start recognition loop immediately
            this.handleActivation();

            // Optionally run enrollment discovery in background (non-blocking)
            discoverEnrollmentSamples().then(async samples => {
                this.ui.setSamplesCount(samples.length);
                if (samples.length >= 3) {
                    this.enrolledProfile = await buildEnrollmentProfile(samples, this.audioContext);
                }
                // Leave verification disabled even if samples load
                this.ui.statusSpeakerEl.textContent = 'Verification Disabled';
            }).catch(e => console.warn("Background enrollment check failed:", e));

        } else {
            this.isActive = false;
            this.ui.setModeState(false);
            this.recognizer.stop();

            // Clean up visualizer and mic stream
            if (this.visualizer) {
                this.visualizer.stop();
                this.visualizer = null;
            }
            if (this.micStream) {
                this.micStream.getTracks().forEach(t => t.stop());
                this.micStream = null;
            }
        }
    }

    async handleActivation() {
        if (!this.isActive) return;

        this.ui.setStatus('READY');
        this.ui.setTranscript('');
        this.ui.setLastAction('Listening...');
        this.ui.setDebugError('None');
        this.ui.setDebugCmd('None');

        this.lastTranscript = null;
        this.transcriptReceived = false;

        // 1. Mic / Recognizer Start
        this.recognizer.start();

        // Start background audio capture for optional verification
        this.liveAudioPromise = null;
        if (this.enrolledProfile) {
            this.liveAudioPromise = recordCommandAudio(this.micStream, 2000).catch(err => {
                console.warn('Failed to record live audio', err);
                return null;
            });
        }
    }

    async handleTranscript({ text, confidence }) {
        this.transcriptReceived = true;
        this.lastTranscript = text;
        this.ui.setTranscript(text);
        
        // 3. Command Parse
        const cmd = parseVoiceCommand(text);
        this.ui.setDebugCmd(`${cmd.type} (${cmd.score || 0})`);

        if (cmd.type === 'UNKNOWN') {
            this.ui.setLastAction(`Unknown command: ${text}`, true);
            this.ui.setStatus('READY');
            this.playAudioFeedback('error');
            return;
        }

        // 4. Optional Speaker Verification (runs AFTER transcript is acquired)
        let speakerVerified = true; // default fail-open
        const VERIFICATION_ENABLED = false; // TEMPORARY: verification disabled for presentation
        
        if (VERIFICATION_ENABLED && this.enrolledProfile && this.liveAudioPromise) {
            this.ui.setStatus('VERIFYING');
            try {
                const liveAudioBlob = await this.liveAudioPromise;
                if (liveAudioBlob) {
                    const buf = await liveAudioBlob.arrayBuffer();
                    const audioBuffer = await this.audioContext.decodeAudioData(buf);
                    const basic = extractSimpleVoiceFeatures(audioBuffer);
                    const bands = extractSpectralBands(audioBuffer);
                    const liveProfile = { ...basic, bands };
                    
                    const score = compareVoiceProfiles(this.enrolledProfile, liveProfile);
                    speakerVerified = score > 0.3; // Lenient
                    
                    this.ui.setSpeakerScore(score, speakerVerified);

                    if (!speakerVerified) {
                        this.ui.setStatus('REJECTED');
                        this.ui.setLastAction('Speaker verification failed.', true);
                    }
                }
            } catch (err) {
                console.warn('[VoicePrint] Speaker verification failed, allowing command:', err);
                speakerVerified = true;
            }
        } else {
             // If disabled, just update status
             this.ui.statusSpeakerEl.textContent = 'Verification Disabled';
             this.ui.statusSpeakerEl.className = '';
        }

        // 5. Execution
        if (speakerVerified) {
            this.ui.setStatus('VERIFIED');
            const success = executeVoiceCommand(cmd);
            if (success) {
                this.ui.setLastAction(`Executed: ${cmd.type}`);
                this.playAudioFeedback('success');
            } else {
                this.ui.setLastAction(`Failed to execute: ${cmd.type}`, true);
                this.playAudioFeedback('error');
            }
        }

        setTimeout(() => {
            if (this.isActive) this.ui.setStatus('READY');
        }, 1500);
    }

    handleSpeechEnd() {
        this.ui.setDebugState('Idle');
        
        if (!this.transcriptReceived) {
            console.log('[VoiceDebug] no speech detected');
            this.ui.setStatus('READY');
            this.ui.setLastAction('No speech detected - Ready');
        }
        
        this.transcriptReceived = false;

        // Restart recognition loop if Voice Mode is still active
        if (this.isActive) {
            setTimeout(() => {
                if (this.isActive && this.ui.debugRecStateEl?.textContent === 'Idle') {
                    console.log('[VoiceDebug] Auto-restarting recognition loop');
                    this.handleActivation();
                }
            }, 500);
        }
    }

    handleSpeechError(err) {
        console.warn('Speech Recognition Error:', err);
        this.ui.setDebugError(err);
        this.ui.setLastAction(`Speech Error: ${err}`, true);
    }

    playAudioFeedback(type) {
        if (!this.audioContext) return;
        
        // Resume AudioContext if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        const now = this.audioContext.currentTime;
        
        if (type === 'start') {
            // Gentle ascending chirp
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
            gain.gain.linearRampToValueAtTime(0, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'success') {
            // Pleasant double chime
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.setValueAtTime(800, now + 0.1);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
            gain.gain.linearRampToValueAtTime(0, now + 0.1);
            gain.gain.linearRampToValueAtTime(0.05, now + 0.15);
            gain.gain.linearRampToValueAtTime(0, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'error') {
            // Low buzz
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(150, now + 0.2);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
            gain.gain.linearRampToValueAtTime(0, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        }
    }
}

function initVoice() {
    window.voiceMode = new VoiceMode();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVoice);
} else {
    initVoice();
}
