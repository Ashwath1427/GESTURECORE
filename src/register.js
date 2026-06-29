import { FACE_CONFIG } from './config.js';

const ADMIN_PIN = '77256542';
const PERMANENT_FACES = ['ashwath', 'lavith', 'saicharan'];

export class RegisterPage {
    constructor() {
        this.btnStartReg = document.getElementById('btn-login-register');
        this.mainActions = document.getElementById('main-login-actions');
        this.cameraPanel = document.getElementById('login-camera-panel'); // The normal login camera
        
        this.pinPanel = document.getElementById('register-pin-panel');
        this.dashboard = document.getElementById('register-dashboard-panel');
        this.pinInput = document.getElementById('reg-pin-input');
        this.pinError = document.getElementById('reg-pin-error');
        
        this.video = document.getElementById('reg-video');
        this.canvas = document.getElementById('reg-canvas');
        this.statusText = document.getElementById('reg-status');
        this.nameInput = document.getElementById('reg-name-input');
        this.btnRegister = document.getElementById('btn-register-face');
        this.facesContainer = document.getElementById('faces-container');
        
        this.btnCancelPin = document.getElementById('btn-reg-cancel-pin');
        this.btnCancelDash = document.getElementById('btn-reg-cancel-dash');
        
        this.modelsLoaded = false;
        this.currentDescriptor = null;
        this.isDetecting = false;
        
        this.initLogic();
    }
    
    initLogic() {
        if (!this.btnStartReg) return; // If we aren't in index.html with these elements

        this.btnStartReg.addEventListener('click', () => {
            this.showPinPanel();
        });

        this.btnCancelPin.addEventListener('click', () => {
            this.hideAll();
        });

        this.btnCancelDash.addEventListener('click', () => {
            this.isDetecting = false;
            this.hideAll();
        });

        this.pinInput.addEventListener('input', () => {
            const val = this.pinInput.value;
            if (val.length === 8) {
                if (val === ADMIN_PIN) {
                    this.pinPanel.classList.add('hidden');
                    this.dashboard.classList.remove('hidden');
                    this.pinInput.value = '';
                    this.initDashboard();
                } else {
                    this.pinError.classList.remove('hidden');
                    this.pinInput.value = '';
                    setTimeout(() => {
                        this.pinError.classList.add('hidden');
                    }, 2000);
                }
            } else {
                this.pinError.classList.add('hidden');
            }
        });
    }

    showPinPanel() {
        // Hide normal login stuff
        this.cameraPanel.classList.add('hidden');
        this.mainActions.classList.add('hidden');
        document.getElementById('login-pin-panel').classList.add('hidden');
        document.getElementById('login-enroll-panel').classList.add('hidden');
        
        // Show our PIN panel
        this.pinPanel.classList.remove('hidden');
        this.pinInput.focus();
    }

    hideAll() {
        this.pinPanel.classList.add('hidden');
        this.dashboard.classList.add('hidden');
        this.cameraPanel.classList.remove('hidden');
        this.mainActions.classList.remove('hidden');
    }
    
    async initDashboard() {
        this.isDetecting = true;
        await this.fetchAndRenderFaces();
        await this.loadModels();
        this.startCamera();
        
        this.btnRegister.onclick = () => this.registerFace();
        this.nameInput.oninput = () => this.updateRegisterButton();
    }
    
    async loadModels() {
        this.statusText.textContent = 'Loading AI Models...';
        const modelPath = 'https://vladmandic.github.io/face-api/model/';
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
            faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
            faceapi.nets.faceRecognitionNet.loadFromUri(modelPath)
        ]);
        this.modelsLoaded = true;
        this.statusText.textContent = 'Models Loaded. Starting Camera...';
    }
    
    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            this.video.srcObject = stream;
            
            this.video.onloadedmetadata = () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.detectLoop();
            };
        } catch (err) {
            console.error(err);
            this.statusText.textContent = 'Error accessing camera. Please check permissions.';
        }
    }
    
    async detectLoop() {
        if (!this.modelsLoaded || !this.isDetecting) return;
        
        const detection = await faceapi.detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: FACE_CONFIG.minDetectionScore }))
            .withFaceLandmarks()
            .withFaceDescriptor();
            
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (detection) {
            faceapi.draw.drawDetections(this.canvas, detection);
            this.currentDescriptor = detection.descriptor;
            this.statusText.textContent = 'Face Detected. Ready to Register.';
        } else {
            this.currentDescriptor = null;
            this.statusText.textContent = 'Looking for face...';
        }
        
        this.updateRegisterButton();
        
        if (this.isDetecting) {
            requestAnimationFrame(() => this.detectLoop());
        }
    }
    
    updateRegisterButton() {
        const hasName = this.nameInput.value.trim().length > 0;
        const hasFace = this.currentDescriptor !== null;
        this.btnRegister.disabled = !(hasName && hasFace);
    }
    
    async registerFace() {
        const name = this.nameInput.value.trim();
        if (!name || !this.currentDescriptor) return;
        
        if (PERMANENT_FACES.includes(name.toLowerCase())) {
            alert('Cannot register a face with a permanent reserved name.');
            return;
        }

        this.btnRegister.disabled = true;
        this.btnRegister.textContent = 'Saving...';
        
        try {
            const response = await fetch('/api/faces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    descriptor: Array.from(this.currentDescriptor)
                })
            });
            
            if (response.ok) {
                this.nameInput.value = '';
                this.statusText.textContent = 'Face registered successfully!';
                await this.fetchAndRenderFaces();
            } else {
                const err = await response.text();
                alert(`Error registering face: ${err}`);
            }
        } catch (err) {
            console.error(err);
            alert('Network error while registering face.');
        } finally {
            this.btnRegister.textContent = 'Scan & Register';
            this.updateRegisterButton();
        }
    }
    
    async fetchAndRenderFaces() {
        try {
            const response = await fetch('/api/faces');
            let dynamicFaces = [];
            if (response.ok) {
                dynamicFaces = await response.json();
            }
            
            this.facesContainer.innerHTML = '';
            
            // First render permanent faces
            PERMANENT_FACES.forEach(name => {
                const el = this.createFaceElement(name, true);
                this.facesContainer.appendChild(el);
            });
            
            // Then render dynamic faces
            dynamicFaces.forEach(face => {
                // Ensure we don't duplicate if someone somehow added a permanent face
                if (!PERMANENT_FACES.includes(face.name.toLowerCase())) {
                    const el = this.createFaceElement(face.name, false);
                    this.facesContainer.appendChild(el);
                }
            });
            
        } catch (err) {
            console.error(err);
            this.facesContainer.innerHTML = '<p style="color:red">Failed to load faces from server.</p>';
        }
    }
    
    createFaceElement(name, isPermanent) {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.padding = '8px';
        div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        
        const nameSpan = document.createElement('span');
        nameSpan.style.color = 'white';
        nameSpan.style.textTransform = 'capitalize';
        nameSpan.textContent = name;
        
        const rightDiv = document.createElement('div');
        
        if (isPermanent) {
            const badge = document.createElement('span');
            badge.style.background = 'rgba(74, 222, 128, 0.2)';
            badge.style.color = '#4ade80';
            badge.style.padding = '4px 8px';
            badge.style.borderRadius = '4px';
            badge.style.fontSize = '0.8em';
            badge.textContent = 'Permanent';
            rightDiv.appendChild(badge);
        } else {
            const deleteBtn = document.createElement('button');
            deleteBtn.style.background = 'rgba(255, 68, 68, 0.2)';
            deleteBtn.style.color = '#ff4444';
            deleteBtn.style.border = '1px solid #ff4444';
            deleteBtn.style.padding = '4px 8px';
            deleteBtn.style.borderRadius = '4px';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => this.deleteFace(name);
            rightDiv.appendChild(deleteBtn);
        }
        
        div.appendChild(nameSpan);
        div.appendChild(rightDiv);
        
        return div;
    }
    
    async deleteFace(name) {
        if (!confirm(`Are you sure you want to delete the face for ${name}?`)) return;
        
        try {
            const response = await fetch(`/api/faces/${encodeURIComponent(name)}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                await this.fetchAndRenderFaces();
            } else {
                alert('Failed to delete face.');
            }
        } catch (err) {
            console.error(err);
            alert('Network error while deleting face.');
        }
    }
}
