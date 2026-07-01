export const AUTH_CONFIG = {
    userName: 'Ashwath',
    pin: '9152714',
    faceMatchThreshold: 0.60,
    faceStableMs: 300,
    pinRetryDelayMs: 1000
};

export const GUEST_CONFIG = {
    userName: 'Guest',
    pin: '1234567',
    pinRetryDelayMs: 1000
};

export const FACE_CONFIG = {
    matchThreshold: 0.52, // Absolute ceiling on the winner's distance (lower = stricter)
    matchMargin: 0.06, // Winner must be at least this much closer than the 2nd-best person.
                       // This is what actually rejects strangers: an unregistered face is
                       // roughly equidistant from every reference, so its margin is tiny.
    requireConsistentWinner: true, // The SAME person must win every consecutive frame in the streak
    minDetectionsBeforeAccept: 3, // Require 3 strictly consecutive stable detections
    stableFramesRequired: 3,
    debug: true, // Enable dev overlays
    minDetectionScore: 0.25, // Dropped to 0.25 to prevent camera dropping valid frames
    minFaceBoxSize: 60, // Dropped to 60 to allow normal sitting distances
    autoTrimWeakReferences: true // Automatically exclude weak references based on live performance
};

export const GESTURE_CONFIG = {
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.5,
    stableHoldMs: 350,
    cooldownMs: 700,
    minGestureScore: 65
};

export const GESTURE_MOTION_CONFIG = {
    stableHoldMs: 300,
    movementDeadzoneNormalized: 0.01,
    smoothingAlpha: 0.35,
    maxDeltaPerFrame: 0.5,
    movementSensitivity: 2.5,
    releaseDelayMs: 120,
    debug: false
};
