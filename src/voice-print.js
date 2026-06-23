export async function discoverEnrollmentSamples() {
    // Only use the files that definitively exist as .mp4 in the root directory
    const existingFiles = [
        './WIN_20260612_21_24_50_Pro.mp4',
        './WIN_20260613_13_00_18_Pro.mp4',
        './WIN_20260613_13_00_47_Pro.mp4',
        './WIN_20260613_13_00_54_Pro.mp4',
        './WIN_20260613_13_01_03_Pro.mp4',
        './WIN_20260613_13_01_12_Pro.mp4'
    ];
    
    // We don't even need to test them with HEAD requests anymore because we know they exist.
    // But we wrap in try/catch just in case the server is offline or fails to serve them.
    const found = [];
    for (const path of existingFiles) {
        try {
            const res = await fetch(path, { method: 'HEAD' });
            if (res.ok) {
                found.push(path);
            }
        } catch (err) {
            console.warn('[VoicePrint] Skipping missing file:', path, err);
        }
    }

    return found;
}

export async function buildEnrollmentProfile(filePaths, audioContext) {
    if (!filePaths || filePaths.length === 0) return null;
    
    const profiles = [];
    for (const path of filePaths) {
        try {
            const res = await fetch(path);
            if (!res.ok) {
                console.warn(`[VoicePrint] Reference file not found, skipping: ${path}`);
                continue;
            }
            const arrayBuffer = await res.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            const basic = extractSimpleVoiceFeatures(audioBuffer);
            const bands = extractSpectralBands(audioBuffer);
            profiles.push({ ...basic, bands });
        } catch (err) {
            console.warn(`[VoicePrint] Error loading reference file: ${path}`, err);
        }
    }

    if (profiles.length === 0) return null;
    return averageProfiles(profiles);
}

export function extractSimpleVoiceFeatures(audioBuffer) {
    const channel = audioBuffer.getChannelData(0);
    let energy = 0;
    let zeroCrossings = 0;

    for (let i = 1; i < channel.length; i++) {
        const v = channel[i];
        energy += v * v;
        if ((channel[i - 1] >= 0 && v < 0) || (channel[i - 1] < 0 && v >= 0)) {
            zeroCrossings++;
        }
    }

    energy /= channel.length;
    const zcr = zeroCrossings / channel.length;
    return { energy, zcr };
}

export function extractSpectralBands(audioBuffer) {
    const channel = audioBuffer.getChannelData(0);
    const bands = [0, 0, 0, 0];
    const chunk = Math.floor(channel.length / 4) || 1;

    for (let i = 0; i < 4; i++) {
        let sum = 0;
        const start = i * chunk;
        const end = Math.min(channel.length, start + chunk);
        for (let j = start; j < end; j++) {
            sum += Math.abs(channel[j]);
        }
        bands[i] = sum / Math.max(1, end - start);
    }

    return bands;
}

export function averageProfiles(profiles) {
    if (!profiles.length) return null;

    const out = { energy: 0, zcr: 0, bands: [0, 0, 0, 0] };
    for (const p of profiles) {
        out.energy += p.energy;
        out.zcr += p.zcr;
        for (let i = 0; i < 4; i++) out.bands[i] += p.bands[i];
    }

    out.energy /= profiles.length;
    out.zcr /= profiles.length;
    for (let i = 0; i < 4; i++) out.bands[i] /= profiles.length;

    return out;
}


export async function recordCommandAudio(stream, durationMs = 4000) {
    if (!stream || !stream.active) throw new Error('No active mic stream available');

    const recorder = new MediaRecorder(stream);
    const chunks = [];

    return await new Promise((resolve, reject) => {
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onerror = reject;

        recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
            resolve(blob);
        };

        recorder.start();
        setTimeout(() => {
            if (recorder.state === 'recording') {
                recorder.stop();
            }
        }, durationMs);
    });
}

export function compareVoiceProfiles(a, b) {
    if (!a || !b) return 0;

    const energyDiff = Math.abs(a.energy - b.energy);
    const zcrDiff = Math.abs(a.zcr - b.zcr);

    let bandDiff = 0;
    for (let i = 0; i < a.bands.length; i++) {
        bandDiff += Math.abs(a.bands[i] - b.bands[i]);
    }

    // Rough similarity score heuristic
    const score = 1 / (1 + energyDiff * 8 + zcrDiff * 12 + bandDiff * 10);
    return Math.max(0, Math.min(1, score));
}
