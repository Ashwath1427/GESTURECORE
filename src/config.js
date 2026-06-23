export const AUTH_CONFIG = {
    userName: 'Ashwath',
    pin: '9152714',
    faceMatchThreshold: 0.60,
    faceStableMs: 300,
    pinRetryDelayMs: 1000
};

export const FACE_CONFIG = {
    matchThreshold: 0.40, // Raised to 0.40 to accommodate real owner based on test data
    minDetectionsBeforeAccept: 3, // Require 3 strictly consecutive stable detections
    stableFramesRequired: 3,
    debug: true, // Enable dev overlays
    minDetectionScore: 0.35, // Dropped to 0.35 to prevent camera dropping valid frames
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
