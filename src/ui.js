import { AppState } from './app-state.js';
import * as THREE from 'three';
import { generateSuggestions } from './ai-suggestions.js';
import { PersistenceManager } from './persistence.js';

export class UIManager {
    constructor(objectRegistry, transformSystem, sceneManager) {
        this.registry = objectRegistry;
        this.transform = transformSystem;
        this.sceneManager = sceneManager;
        
        this.onObjectModified = null;
        
        // Cache DOM elements
        this.panel = document.getElementById('properties-panel');
        this.noSelectionMsg = document.getElementById('no-selection-msg');
        this.propName = document.getElementById('prop-name');
        this.propColor = document.getElementById('prop-color');
        
        // AI Suggestions DOM elements
        this.suggestionsPanel = document.getElementById('ai-suggestions-panel');
        this.suggestionsList = document.getElementById('suggestions-list');
        this.suggestionsTargetName = document.getElementById('suggestions-target-name');
        
        const btnRefreshSuggestions = document.getElementById('btn-refresh-suggestions');
        if (btnRefreshSuggestions) {
            btnRefreshSuggestions.addEventListener('click', () => {
                if (this.transform.selectedObject && this.transform.selectedObject.userData.isHouse) {
                    this.renderAiSuggestions(this.transform.selectedObject);
                }
            });
        }
        
        const btnCloseSuggestions = document.getElementById('btn-close-suggestions');
        if (btnCloseSuggestions) {
            btnCloseSuggestions.addEventListener('click', () => {
                this.suggestionsPanel.classList.add('hidden');
                this.panel.classList.remove('hidden');
            });
        }
        
        this.posInputs = {
            x: document.getElementById('pos-x'),
            y: document.getElementById('pos-y'),
            z: document.getElementById('pos-z')
        };
        this.rotInputs = {
            x: document.getElementById('rot-x'),
            y: document.getElementById('rot-y'),
            z: document.getElementById('rot-z')
        };
        this.scaleInputs = {
            x: document.getElementById('scale-x'),
            y: document.getElementById('scale-y'),
            z: document.getElementById('scale-z')
        };
        
        // Status Bar
        this.statusMode = document.getElementById('status-mode');
        this.statusTracking = document.getElementById('status-tracking');
        this.statusGesture = document.getElementById('status-gesture');
        this.statusHand = document.getElementById('status-hand');
        
        this.setupEventListeners();
        
        // Subscribe to global AppState (only tracking status now handled globally)
        AppState.subscribe((state) => {
            this.statusTracking.textContent = state.trackingStatus;
            this.statusTracking.className = state.trackingStatus === 'Active' ? 'online' : 'offline';
        });
    }

    updateSimpleStatus(gesture, mode, hand) {
        this.statusGesture.textContent = gesture;
        this.statusMode.textContent = mode;
        this.statusHand.textContent = hand;
    }

    showToast(message) {
        const ticker = document.getElementById('save-ticker');
        if (ticker) {
            ticker.textContent = message;
            ticker.classList.remove('hidden');
            if (this.toastTimeout) clearTimeout(this.toastTimeout);
            this.toastTimeout = setTimeout(() => {
                ticker.classList.add('hidden');
            }, 3000);
        }
    }

    setupEventListeners() {
        // Toolbar actions
        document.getElementById('btn-add-cube').onclick = () => this.transform.selectObject(this.registry.addCube());
        document.getElementById('btn-add-sphere').onclick = () => this.transform.selectObject(this.registry.addSphere());
        document.getElementById('btn-add-cylinder').onclick = () => this.transform.selectObject(this.registry.addCylinder());
        document.getElementById('btn-add-plane').onclick = () => this.transform.selectObject(this.registry.addPlane());
        
        if(document.getElementById('btn-add-cone')) document.getElementById('btn-add-cone').onclick = () => this.transform.selectObject(this.registry.addCone());
        if(document.getElementById('btn-add-torus')) document.getElementById('btn-add-torus').onclick = () => this.transform.selectObject(this.registry.addTorus());
        if(document.getElementById('btn-add-capsule')) document.getElementById('btn-add-capsule').onclick = () => this.transform.selectObject(this.registry.addCapsule());
        if(document.getElementById('btn-add-pyramid')) document.getElementById('btn-add-pyramid').onclick = () => this.transform.selectObject(this.registry.addPyramid());
        if(document.getElementById('btn-add-disc')) document.getElementById('btn-add-disc').onclick = () => this.transform.selectObject(this.registry.addDisc());
        if(document.getElementById('btn-add-ring')) document.getElementById('btn-add-ring').onclick = () => this.transform.selectObject(this.registry.addRing());
        if(document.getElementById('btn-add-wedge')) document.getElementById('btn-add-wedge').onclick = () => this.transform.selectObject(this.registry.addWedge());
        
        document.getElementById('btn-duplicate').onclick = () => {
            const copy = this.registry.duplicate(this.transform.selectedObject);
            if(copy) this.transform.selectObject(copy);
        };
        
        const deleteAction = () => {
            this.registry.remove(this.transform.selectedObject);
            this.transform.selectObject(null);
        };
        document.getElementById('btn-delete').onclick = deleteAction;
        
        // Keydown for delete
        window.addEventListener('keydown', (e) => {
            if(document.activeElement.tagName === 'INPUT') return;
            if(e.key === 'Delete' || e.key === 'Backspace') {
                deleteAction();
            }
        });

        // Gesture triggers
        window.addEventListener('app-duplicate-requested', () => {
            const copy = this.registry.duplicate(this.transform.selectedObject);
            if(copy) this.transform.selectObject(copy);
        });
        window.addEventListener('app-delete-requested', deleteAction);

        window.addEventListener('app-center-cam-requested', () => {
            if (typeof this.sceneManager.centerCameraOnSelectedObject === 'function') {
                this.sceneManager.centerCameraOnSelectedObject(this.transform.selectedObject);
            }
        });
        document.getElementById('btn-center').onclick = () => {
            if (typeof this.sceneManager.centerCameraOnSelectedObject === 'function') {
                this.sceneManager.centerCameraOnSelectedObject(this.transform.selectedObject);
            }
        };
        
        // Top bar actions
        const saveAction = () => {
            PersistenceManager.saveScene(this.registry.objects, true);
            this.showToast('Scene saved manually!');
        };
        document.getElementById('btn-save').onclick = saveAction;
        window.addEventListener('app-save-requested', saveAction);
        
        document.getElementById('btn-load').onclick = () => {
            if (PersistenceManager.restoreScene(window.app, true)) {
                this.transform.selectObject(null);
                this.showToast('Scene loaded!');
            } else {
                this.showToast('No saved scene found.');
            }
        };
        document.getElementById('btn-reset').onclick = () => {
            this.registry.clearScene();
            this.transform.selectObject(null);
            if (window.app && window.app.designMode) {
                window.app.designMode.clearDesignScene();
            }
        };
        
        const btnUndo = document.getElementById('btn-undo');
        if (btnUndo) {
            btnUndo.onclick = () => {
                if (this.registry) this.registry.undo();
            };
        }
        
        const btnRedo = document.getElementById('btn-redo');
        if (btnRedo) {
            btnRedo.onclick = () => {
                if (this.registry) this.registry.redo();
            };
        }

        // Transform Modes
        const setModeUI = (mode) => {
            this.setTransformMode(mode, true);
        };
        document.getElementById('mode-translate').onclick = () => setModeUI('translate');
        document.getElementById('mode-rotate').onclick = () => setModeUI('rotate');
        document.getElementById('mode-scale').onclick = () => setModeUI('scale');

        // Property changes
        const updateTransformFromUI = () => {
            const obj = this.transform.selectedObject;
            if(!obj) return;
            
            obj.position.set(parseFloat(this.posInputs.x.value), parseFloat(this.posInputs.y.value), parseFloat(this.posInputs.z.value));
            obj.rotation.set(
                THREE.MathUtils.degToRad(parseFloat(this.rotInputs.x.value)),
                THREE.MathUtils.degToRad(parseFloat(this.rotInputs.y.value)),
                THREE.MathUtils.degToRad(parseFloat(this.rotInputs.z.value))
            );
            obj.scale.set(parseFloat(this.scaleInputs.x.value), parseFloat(this.scaleInputs.y.value), parseFloat(this.scaleInputs.z.value));
            
            if(this.onObjectModified) this.onObjectModified();
        };

        ['x', 'y', 'z'].forEach(axis => {
            this.posInputs[axis].addEventListener('change', updateTransformFromUI);
            this.rotInputs[axis].addEventListener('change', updateTransformFromUI);
            this.scaleInputs[axis].addEventListener('change', updateTransformFromUI);
        });

        this.propColor.addEventListener('input', (e) => {
            const obj = this.transform.selectedObject;
            if(obj && obj.material) {
                obj.material.color.set(e.target.value);
            }
        });
    }

    setTransformMode(mode, updateGlobalState = false) {
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        const btn = document.getElementById(`mode-${mode}`);
        if(btn) btn.classList.add('active');
        
        const TitleMode = mode.charAt(0).toUpperCase() + mode.slice(1);
        this.statusMode.textContent = TitleMode;
        
        if (updateGlobalState) {
            this.transform.setMode(mode);
            AppState.setTransformMode(TitleMode);
        }
    }

    setSelectedObject(object) {
        if (!object) {
            this.panel.classList.add('hidden');
            if (this.suggestionsPanel) this.suggestionsPanel.classList.add('hidden');
            this.noSelectionMsg.classList.remove('hidden');
            AppState.setSelectedObject(null);
            return;
        }

        const isSameObject = AppState.selectedObject === object;

        if (!isSameObject) {
            this.noSelectionMsg.classList.add('hidden');
            
            if (object.userData.isHouse && this.suggestionsPanel) {
                this.panel.classList.add('hidden');
                this.suggestionsPanel.classList.remove('hidden');
                this.renderAiSuggestions(object);
            } else {
                this.panel.classList.remove('hidden');
                if (this.suggestionsPanel) this.suggestionsPanel.classList.add('hidden');
            }
            
            AppState.setSelectedObject(object);
        }
        
        this.propName.value = object.name;
        
        this.posInputs.x.value = object.position.x.toFixed(2);
        this.posInputs.y.value = object.position.y.toFixed(2);
        this.posInputs.z.value = object.position.z.toFixed(2);

        this.rotInputs.x.value = THREE.MathUtils.radToDeg(object.rotation.x).toFixed(1);
        this.rotInputs.y.value = THREE.MathUtils.radToDeg(object.rotation.y).toFixed(1);
        this.rotInputs.z.value = THREE.MathUtils.radToDeg(object.rotation.z).toFixed(1);

        this.scaleInputs.x.value = object.scale.x.toFixed(2);
        this.scaleInputs.y.value = object.scale.y.toFixed(2);
        this.scaleInputs.z.value = object.scale.z.toFixed(2);

        if (object.material) {
            this.propColor.value = '#' + object.material.color.getHexString();
        }
    }

    renderAiSuggestions(houseObj) {
        if (!this.suggestionsList || !this.suggestionsTargetName) return;

        this.suggestionsTargetName.textContent = houseObj.userData.templateName || 'House';
        this.suggestionsList.innerHTML = '';

        const suggestions = generateSuggestions(houseObj, 4);

        if (suggestions.length === 0) {
            this.suggestionsList.innerHTML = `<div class="suggestion-empty">No suggestions available right now.</div>`;
            return;
        }

        suggestions.forEach(s => {
            const card = document.createElement('div');
            card.className = 'suggestion-card';
            
            const text = document.createElement('div');
            text.className = 'suggestion-text';
            text.textContent = s.text;
            card.appendChild(text);

            if (s.apply) {
                const btn = document.createElement('button');
                btn.className = 'suggestion-apply-btn';
                btn.textContent = 'Apply';
                btn.onclick = () => {
                    s.apply(houseObj);
                    if (this.onObjectModified) this.onObjectModified();
                    this.renderAiSuggestions(houseObj); // Refresh suggestions after applying
                };
                card.appendChild(btn);
            }

            this.suggestionsList.appendChild(card);
        });
    }
}
