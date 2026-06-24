import { AUTH_CONFIG, FACE_CONFIG } from './config.js';

export class FaceRecognitionSystem {
    constructor(ui) {
        this.ui = ui;
        this.video = document.getElementById('login-video');
        this.modelsLoaded = false;
        
        this.enrolledDescriptors = [];
        this.referenceStats = {};
        
        // Load from localStorage if available
        let saved = localStorage.getItem('shapeFlowEnrolledFace');
        if (!saved) {
            saved = localStorage.getItem('gesturecoreEnrolledFace');
            if (saved) {
                localStorage.setItem('shapeFlowEnrolledFace', saved);
            }
        }

        if (saved) {
            this.enrolledDescriptors.push(new Float32Array(JSON.parse(saved)));
        }
    }

    get enrolledDescriptor() {
        return this.enrolledDescriptors.length > 0 ? this.enrolledDescriptors[0] : null;
    }

    set enrolledDescriptor(desc) {
        if (desc) {
            this.enrolledDescriptors = [desc];
        } else {
            this.enrolledDescriptors = [];
        }
    }

    async tryLoadStaticReference() {
        const identities = [
            { id: 'ashwath', files: ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg'] },
            { id: 'sai', files: ['1.jpg', '2.jpg', '3.jpg', '4.jpg'] }
        ];

        let staticLoaded = false;
        this.enrolledDescriptors = [];
        console.group('[FaceRec] Static Reference Image Audit');

        for (const identity of identities) {
            const faceDir = `assets/faces/${identity.id}/`;
            const promises = identity.files.map(file => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = async () => {
                        try {
                            const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: FACE_CONFIG.minDetectionScore }))
                                .withFaceLandmarks()
                                .withFaceDescriptor();
                            
                            let faceFound = !!detection;
                            let descCreated = !!(detection && detection.descriptor);
                            let score = detection ? detection.detection.score.toFixed(2) : 'N/A';
                            let size = detection ? `${Math.round(detection.detection.box.width)}x${Math.round(detection.detection.box.height)}` : 'N/A';
                            let accepted = false;
                            let reason = 'OK';

                            if (descCreated) {
                                const box = detection.detection.box;
                                if (box.width < FACE_CONFIG.minFaceBoxSize || box.height < FACE_CONFIG.minFaceBoxSize) {
                                    accepted = false;
                                    reason = 'Too small';
                                } else {
                                    accepted = true;
                                    staticLoaded = true;
                                    this.enrolledDescriptors.push({
                                        personId: identity.id,
                                        name: file,
                                        descriptor: detection.descriptor
                                    });
                                }
                            } else {
                                reason = 'No valid face/descriptor';
                            }
                            
                            console.log(`- [${identity.id}] ${file} | Face: ${faceFound ? 'YES' : 'NO'} | Score: ${score} | Accepted: ${accepted ? 'YES' : 'NO'} | Reason: ${reason}`);
                            resolve();
                        } catch (e) {
                            console.log(`- [${identity.id}] ${file} | Face: ERROR | Reason: ${e.message}`);
                            resolve();
                        }
                    };
                    img.onerror = () => {
                        console.log(`- [${identity.id}] ${file} | Loaded: NO | Reason: Image failed to load`);
                        resolve();
                    };
                    img.src = `${faceDir}${file}`;
                });
            });

            // Wait for this identity to finish
            await Promise.race([
                Promise.all(promises),
                new Promise(r => setTimeout(r, 5000))
            ]);
        }

        console.groupEnd();
        
        if (staticLoaded && this.enrolledDescriptors.length > 1) {
            console.group('[FaceRec] Internal Consistency Check');
            let outlierCount = 0;
            // Compare each descriptor against the others IN THE SAME IDENTITY
            this.enrolledDescriptors.forEach((refA, i) => {
                let distances = [];
                this.enrolledDescriptors.forEach((refB, j) => {
                    if (i !== j && refA.personId === refB.personId) {
                        distances.push(faceapi.euclideanDistance(refA.descriptor, refB.descriptor));
                    }
                });
                if (distances.length > 0) {
                    let avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
                    let maxDist = Math.max(...distances);
                    console.log(`- [${refA.personId}] ${refA.name} | Avg internal dist: ${avgDist.toFixed(3)} | Max internal dist: ${maxDist.toFixed(3)}`);
                    if (avgDist > 0.35) {
                        console.warn(`  -> [${refA.personId}] ${refA.name} is a potential OUTLIER! It is poorly clustered with the other references.`);
                        outlierCount++;
                    }
                }
            });
            console.log(`Internal consistency scan complete. Found ${outlierCount} potential outliers.`);
            console.groupEnd();
        }

        if (staticLoaded) {
            console.log(`[FaceRec] Audit Complete. Loaded ${this.enrolledDescriptors.length} static reference(s).`);
        } else {
            console.warn(`[FaceRec] Audit Complete. ALL static references FAILED to load or were rejected.`);
            // Do not silently fall back if localStorage is also empty.
            if (this.enrolledDescriptors.length === 0) {
                console.error(`[FaceRec] NO VALID REFERENCES EXIST. Face system will hard-fail to PIN.`);
            } else {
                console.warn(`[FaceRec] Falling back to LocalStorage reference.`);
            }
        }
    }

    async loadModels() {
        if (this.modelsLoaded) return;
        
        this.ui.setFaceStatus('Loading Models...', 'waiting');
        try {
            const modelPath = 'https://vladmandic.github.io/face-api/model/';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
                faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
                faceapi.nets.faceRecognitionNet.loadFromUri(modelPath)
            ]);
            this.modelsLoaded = true;
            this.ui.setFaceStatus('Models Loaded', 'success');
            
            // Try to load a static reference.jpg from the folder.
            // If it succeeds, it replaces the localStorage enrollment.
            await this.tryLoadStaticReference();
        } catch (e) {
            this.ui.setFaceStatus('Model Load Failed', 'error');
            throw e;
        }
    }

    async getDescriptorFromVideo() {
        if (!this.modelsLoaded) await this.loadModels();

        this.ui.setAuthStatus('Analyzing Face...', 'waiting');
        
        const detection = await faceapi.detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: FACE_CONFIG.minDetectionScore }))
            .withFaceLandmarks()
            .withFaceDescriptor();
            
        if (!detection) {
            console.log(`[FaceRec] Live candidate rejected: No face detected above score ${FACE_CONFIG.minDetectionScore}`);
            return null;
        }

        const box = detection.detection.box;
        const score = detection.detection.score;
        const hasLandmarks = !!detection.landmarks;
        const hasDescriptor = !!detection.descriptor;
        
        console.log(`[FaceRec] Live Candidate Found | Score: ${score.toFixed(2)} | Size: ${Math.round(box.width)}x${Math.round(box.height)} | Landmarks: ${hasLandmarks} | Desc: ${hasDescriptor}`);

        if (box.width < FACE_CONFIG.minFaceBoxSize || box.height < FACE_CONFIG.minFaceBoxSize) {
            console.log(`[FaceRec] Live candidate rejected: Too small (${Math.round(box.width)}x${Math.round(box.height)} < ${FACE_CONFIG.minFaceBoxSize})`);
            return null;
        }
        
        return detection.descriptor;
    }

    async enrollFace() {
        this.ui.setAuthStatus('Capturing Enrollment...', 'waiting');
        
        const descriptor = await this.getDescriptorFromVideo();
        if (descriptor) {
            this.enrolledDescriptor = descriptor;
            localStorage.setItem('shapeFlowEnrolledFace', JSON.stringify(Array.from(descriptor)));
            this.ui.setAuthStatus('Face Enrolled', 'success');
            return true;
        } else {
            this.ui.setAuthStatus('Enrollment Failed', 'error');
            return false;
        }
    }

    async attemptMatch() {
        this.ui.setAuthStatus('Pre-Flight Checks...', 'waiting');
        
        // Hard Pre-Flight Guards
        if (!this.modelsLoaded) {
            console.error('[FaceRec] Pre-flight failed: Models not loaded');
            this.ui.setAuthStatus('Error: Models not loaded', 'error');
            return false;
        }
        if (!this.video || this.video.paused) {
            console.error('[FaceRec] Pre-flight failed: Camera stream inactive');
            this.ui.setAuthStatus('Error: Camera inactive', 'error');
            return false;
        }
        if (!this.enrolledDescriptors || this.enrolledDescriptors.length === 0) {
            console.error('[FaceRec] Pre-flight failed: No reference descriptors loaded. Hard failing to PIN.');
            this.ui.setAuthStatus('Error: No reference faces. PIN Required.', 'error');
            return false;
        }

        // Camera Warm-Up Phase
        this.ui.setAuthStatus('Warming up camera...', 'waiting');
        await new Promise(r => setTimeout(r, 800)); // 800ms stabilization period
        
        let successfulMatches = 0;
        let attempts = 0;
        const MAX_ATTEMPTS = 15; // Don't loop forever
        
        let activeDescriptors = this.enrolledDescriptors;
        
        // Task 3: Auto-Trim Weak References for this session if we have previous data
        if (FACE_CONFIG.autoTrimWeakReferences && Object.keys(this.referenceStats).length > 0) {
            const totalTop3 = Object.values(this.referenceStats).reduce((sum, s) => sum + s.top3, 0);
            if (totalTop3 > 5) {
                activeDescriptors = this.enrolledDescriptors.filter(desc => {
                    const labelKey = desc.personId ? `${desc.personId}/${desc.name}` : 'LocalStorage';
                    const stats = this.referenceStats[labelKey];
                    if (!stats) return true;
                    return stats.top3 >= 3 || stats.best >= 1;
                });
                if (activeDescriptors.length === 0) activeDescriptors = this.enrolledDescriptors; // Fallback if too strict
            }
        }
        
        // Initialize stats for active descriptors
        activeDescriptors.forEach(desc => {
            const labelKey = desc.personId ? `${desc.personId}/${desc.name}` : 'LocalStorage';
            if (!this.referenceStats[labelKey]) {
                this.referenceStats[labelKey] = { top3: 0, best: 0, totalDist: 0, count: 0, min: Infinity, max: -Infinity };
            }
        });

        // Task 4: Median Helper
        const median = (arr) => {
            const s = [...arr].sort((a, b) => a - b);
            const m = Math.floor(s.length / 2);
            return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
        };

        const updateRefStats = (stats, ranked) => {
            ranked.slice(0, 3).forEach((item, index) => {
                const s = stats[item.label];
                if (!s) return;
                s.top3++;
                s.totalDist += item.distance;
                s.count++;
                s.min = Math.min(s.min, item.distance);
                s.max = Math.max(s.max, item.distance);
                if (index === 0) s.best++;
            });
        };

        while (attempts < MAX_ATTEMPTS) {
            attempts++;
            this.ui.setAuthStatus('Analyzing...', 'waiting');
            const candidateDescriptor = await this.getDescriptorFromVideo();
            
            if (!candidateDescriptor) {
                this.ui.setAuthStatus('Waiting for Face...', 'waiting');
                successfulMatches = 0;
                await new Promise(r => setTimeout(r, 100)); // slight delay
                continue;
            }

            // Track and sort distances against ACTIVE references
            const ranked = activeDescriptors.map(ref => ({
                personId: ref.personId || 'LocalStorage',
                name: ref.name || 'LocalStorage',
                labelKey: ref.personId ? `${ref.personId}/${ref.name}` : 'LocalStorage',
                distance: faceapi.euclideanDistance(candidateDescriptor, ref.descriptor || ref)
            })).sort((a, b) => a.distance - b.distance);

            updateRefStats(this.referenceStats, ranked.map(r => ({ label: r.labelKey, distance: r.distance })));
            
            const top3 = ranked.slice(0, 3);
            
            // Group distances by person
            const groupedScores = {};
            ranked.forEach(r => {
                if (!groupedScores[r.personId]) groupedScores[r.personId] = [];
                groupedScores[r.personId].push(r.distance);
            });
            
            // Calculate median score for each person based on their top 3 matches
            const personMedians = {};
            for (const pId in groupedScores) {
                personMedians[pId] = median(groupedScores[pId].slice(0, 3));
            }
            
            // Find the best person
            let bestPerson = null;
            let bestPersonScore = Infinity;
            for (const pId in personMedians) {
                if (personMedians[pId] < bestPersonScore) {
                    bestPersonScore = personMedians[pId];
                    bestPerson = pId;
                }
            }

            const diagStr = `[Diag] Winner:${bestPerson} | Score:${bestPersonScore.toFixed(3)} < ${FACE_CONFIG.matchThreshold}`;

            if (FACE_CONFIG.debug) {
                console.log(`[FaceRec] Live Match -> Winner: ${bestPerson} | Top 3 Images: ` + top3.map(x => `${x.labelKey}(${x.distance.toFixed(3)})`).join(', '));
                console.log(`[FaceRec] Grouped Scores -> Ashwath: ${personMedians['ashwath'] ? personMedians['ashwath'].toFixed(3) : 'N/A'} | Sai: ${personMedians['sai'] ? personMedians['sai'].toFixed(3) : 'N/A'}`);
            }

            // Improve the Success Rule - Check the winner's score
            if (bestPersonScore < FACE_CONFIG.matchThreshold) {
                successfulMatches++;
                if (FACE_CONFIG.debug) console.log(`[FaceRec] Match! (${successfulMatches}/${FACE_CONFIG.minDetectionsBeforeAccept})`);
                
                this.ui.setAuthStatus(`${diagStr} -> PASS (${successfulMatches}/${FACE_CONFIG.minDetectionsBeforeAccept})`, 'active');

                if (successfulMatches >= FACE_CONFIG.minDetectionsBeforeAccept) {
                    this.printReferenceSummaryTable();
                    this.ui.setAuthStatus(`Face Verified Successfully`, 'success');
                    console.log(`[FaceRec] SECURE LOGIN SUCCESS. Matched Identity: ${bestPerson}`);
                    return { success: true, personId: bestPerson }; 
                }
            } else {
                if (FACE_CONFIG.debug) console.log(`[FaceRec] Frame rejected. Score too high.`);
                this.ui.setAuthStatus(`${diagStr} -> REJECT`, 'error');
                successfulMatches = 0; 
            }
            
            await new Promise(r => setTimeout(r, 50)); // Allow UI to breathe
        }

        this.printReferenceSummaryTable();
        this.ui.setAuthStatus('Face Match Failed', 'error');
        return false;
    }

    // Task 2: Print a ranked summary table
    printReferenceSummaryTable() {
        console.group('[FaceRec] REFERENCE PERFORMANCE TABLE');
        const tableData = Object.keys(this.referenceStats).map(key => {
            const s = this.referenceStats[key];
            const avg = s.count > 0 ? (s.totalDist / s.count) : null;
            const keep = (s.top3 >= 3 || s.best >= 1) ? 'YES' : 'DROP';
            return {
                Reference: key,
                Top3Count: s.top3,
                BestCount: s.best,
                AvgDist: avg ? avg.toFixed(3) : 'N/A',
                MinDist: s.min === Infinity ? 'N/A' : s.min.toFixed(3),
                MaxDist: s.max === -Infinity ? 'N/A' : s.max.toFixed(3),
                'Keep?': keep
            };
        });
        console.table(tableData);
        console.groupEnd();
    }
}
