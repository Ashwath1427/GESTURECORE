import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export class TransformSystem {
    constructor(camera, domElement, scene, orbitControls) {
        this.camera = camera;
        this.domElement = domElement;
        this.scene = scene;
        this.orbitControls = orbitControls;
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.selectedObject = null;
        this.onSelectionChanged = null;
        this.onModeChanged = null;
        this.isTransformDragging = false;

        // Transform Controls
        this.transformControl = new TransformControls(this.camera, this.domElement);
        this.transformControl.addEventListener('dragging-changed', (event) => {
            this.orbitControls.enabled = !event.value;
            this.isTransformDragging = event.value;
            if (!event.value && this.onTransformEnd) {
                this.onTransformEnd();
            }
        });
        
        // When object is changed by gizmo, trigger selection update for UI
        this.transformControl.addEventListener('change', () => {
            if (this.selectedObject && this.onSelectionChanged) {
                this.onSelectionChanged(this.selectedObject);
            }
        });

        this.scene.add(this.transformControl);

        this.setupMouseEvents();
        this.setupKeyboardEvents();
    }

    setupMouseEvents() {
        this.domElement.addEventListener('pointerdown', (event) => {
            // Ignore if clicking on transform gizmo
            if (this.transformControl.axis !== null) return;
            
            const rect = this.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children, false);

            let found = null;
            for (let i = 0; i < intersects.length; i++) {
                if (intersects[i].object.userData.isSelectable) {
                    found = intersects[i].object;
                    break;
                }
            }
            
            this.selectObject(found);
        });
    }

    setupKeyboardEvents() {
        window.addEventListener('keydown', (event) => {
            // Ignore if typing in input fields
            if(document.activeElement.tagName === 'INPUT') return;

            switch (event.key.toLowerCase()) {
                case 'g': this.setMode('translate'); break;
                case 'r': this.setMode('rotate'); break;
                case 's': this.setMode('scale'); break;
                case 'escape': this.selectObject(null); break;
            }
        });
    }

    resize() {
        // Optional logic for resize if raycasting needs it, but mouse coords are computed per event
    }

    selectObject(object) {
        if (this.selectedObject === object) return;
        this.selectedObject = object;

        if (object) {
            this.transformControl.attach(object);
        } else {
            this.transformControl.detach();
        }

        if (this.onSelectionChanged) {
            this.onSelectionChanged(object);
        }
    }

    setMode(mode) {
        this.transformControl.setMode(mode);
        if(this.onModeChanged) {
            this.onModeChanged(mode);
        }
    }

    getMode() {
        return this.transformControl.getMode();
    }

    // Used by gesture pipeline
    raycastFromScreen(x, y) {
        this.mouse.x = x;
        this.mouse.y = y;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, false);
        for (let i = 0; i < intersects.length; i++) {
            if (intersects[i].object.userData.isSelectable || intersects[i].object.parent === this.transformControl) {
                // If clicking gizmo, return the gizmo intersection ideally, 
                // but transformControls handles its own raycasting for interaction.
                // We'll just return selectable objects for hover/selection via gesture.
                if (intersects[i].object.userData.isSelectable) {
                     return intersects[i].object;
                }
            }
        }
        return null;
    }
}
