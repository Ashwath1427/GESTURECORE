const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function createSpeechRecognizer({ onTranscript, onError, onEnd, onStateChange }) {
    if (!SpeechRecognition) {
        return { supported: false, start() {}, stop() {} };
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        console.log('[VoiceDebug] recognition started');
        if (onStateChange) onStateChange('Started');
    };

    recognition.onspeechstart = () => {
        console.log('[VoiceDebug] speech started');
        if (onStateChange) onStateChange('Hearing Speech');
    };

    recognition.onspeechend = () => {
        console.log('[VoiceDebug] speech ended');
        if (onStateChange) onStateChange('Speech Ended');
    };

    recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        const text = result[0].transcript.trim().toLowerCase();
        console.log(`[VoiceDebug] transcript: "${text}"`, event);
        onTranscript({
            text: text,
            confidence: result[0].confidence ?? 0
        });
    };

    recognition.onerror = (e) => {
        console.error('[VoiceDebug] recognition error:', e.error, e);
        if (onError) onError(e.error);
    };
    
    recognition.onend = () => {
        console.log('[VoiceDebug] recognition ended');
        if (onEnd) onEnd();
    };

    return {
        supported: true,
        start() {
            try {
                recognition.start();
                console.log('[VoiceDebug] recognition.start() called');
            } catch (err) {
                console.error('[VoiceDebug] recognition.start() failed:', err);
                if (err.name !== 'InvalidStateError') {
                    throw err;
                }
            }
        },
        stop() {
            recognition.stop();
        }
    };
}
