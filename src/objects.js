import * as THREE from 'three';
import { PersistenceManager } from './persistence.js';

export class ObjectRegistry {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.counters = {
            Cube: 0,
            Sphere: 0,
            Cylinder: 0,
            Plane: 0,
            Cone: 0,
            Torus: 0,
            Capsule: 0,
            Pyramid: 0,
            Disc: 0,
            Ring: 0,
            Wedge: 0
        };
        
        // Undo/Redo History
        this.history = [];
        this.historyIndex = -1;
        this.isRestoring = false;
        
        // Keep a reference to all objects ever created so we can restore them in undo
        this.allObjects = {};
    }

    saveState() {
        if (this.isRestoring) return;
        
        const state = this.serialize();
        
        // If we are not at the end of the history stack, truncate the future
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // Prevent duplicate consecutive states
        if (this.history.length > 0 && this.history[this.history.length - 1] === state) {
            return;
        }
        
        this.history.push(state);
        this.historyIndex++;
        
        // Cap history size to 50
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.isRestoring = true;
            this.deserialize(this.history[this.historyIndex]);
            this.isRestoring = false;
            return true;
        }
        return false;
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.isRestoring = true;
            this.deserialize(this.history[this.historyIndex]);
            this.isRestoring = false;
            return true;
        }
        return false;
    }

    addCube() {
        const geometry = new THREE.BoxGeometry(3, 3, 3);
        return this.createMesh(geometry, 'Cube');
    }

    addSphere() {
        const geometry = new THREE.SphereGeometry(1.8, 32, 16);
        return this.createMesh(geometry, 'Sphere');
    }

    addCylinder() {
        const geometry = new THREE.CylinderGeometry(1.5, 1.5, 3, 32);
        return this.createMesh(geometry, 'Cylinder');
    }

    addPlane() {
        const geometry = new THREE.PlaneGeometry(6, 6);
        // rotate plane to lie flat by default
        const mesh = this.createMesh(geometry, 'Plane');
        mesh.rotation.x = -Math.PI / 2;
        return mesh;
    }

    addCone() {
        const geometry = new THREE.ConeGeometry(1.5, 3, 32);
        return this.createMesh(geometry, 'Cone');
    }

    addTorus() {
        const geometry = new THREE.TorusGeometry(1.5, 0.5, 16, 100);
        return this.createMesh(geometry, 'Torus');
    }

    addCapsule() {
        const geometry = new THREE.CapsuleGeometry(1, 2, 4, 16);
        return this.createMesh(geometry, 'Capsule');
    }

    addPyramid() {
        const geometry = new THREE.CylinderGeometry(0, 2, 3, 4, 1);
        return this.createMesh(geometry, 'Pyramid');
    }

    addDisc() {
        const geometry = new THREE.CylinderGeometry(3, 3, 0.2, 32);
        return this.createMesh(geometry, 'Disc');
    }

    addRing() {
        const geometry = new THREE.TorusGeometry(3, 0.3, 16, 64);
        const mesh = this.createMesh(geometry, 'Ring');
        mesh.rotation.x = -Math.PI / 2;
        return mesh;
    }

    addWedge() {
        // A simple wedge/ramp using a custom BufferGeometry or scaled Box
        // Prompt suggested BoxGeometry(3, 1.5, 3) scaled/sheared, or just box for now
        // Let's create a custom wedge geometry using points
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(3, 0);
        shape.lineTo(0, 1.5);
        shape.lineTo(0, 0);
        
        const extrudeSettings = {
            depth: 3,
            bevelEnabled: false
        };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        // Center it
        geometry.translate(-1.5, -0.75, -1.5);
        return this.createMesh(geometry, 'Wedge');
    }

    normalizeAndGroundObject(object, maxDim = 5) {
        // Ensure matrix is updated to calculate bounds properly
        object.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Guard: an object with no renderable geometry yet (e.g. an imported OBJ
        // model whose async load hasn't finished, so the Group is still empty) has an
        // "empty" bounding box (min = +Infinity). Normalizing it would compute
        // yOffset = -box.min.y = -Infinity and park the object off-screen, so the
        // model is invisible once it finally loads. Bail out and leave it at origin;
        // the model loader positions/scales itself correctly when it arrives.
        if (box.isEmpty() || !isFinite(size.x) || !isFinite(size.y) || !isFinite(size.z)) {
            return;
        }

        // Normalize Scale
        const largestDimension = Math.max(size.x, size.y, size.z);
        if (largestDimension > 0) {
            const scaleFactor = Math.min(1, maxDim / largestDimension);
            if (scaleFactor !== 1) {
                object.scale.setScalar(scaleFactor);
                object.updateMatrixWorld(true);
                box.setFromObject(object); // Recompute after scale
            }
        }

        // Center near current camera target if available
        let targetX = 0;
        let targetZ = 0;
        if (window.app && window.app.sceneManager && window.app.sceneManager.controls) {
            const tgt = window.app.sceneManager.controls.target;
            targetX = tgt.x + (Math.random() - 0.5) * 1.5;
            targetZ = tgt.z + (Math.random() - 0.5) * 1.5;
        } else {
            targetX = (Math.random() - 0.5) * 2;
            targetZ = (Math.random() - 0.5) * 2;
        }

        // Ground on Y=0
        const yOffset = -box.min.y;

        object.position.set(targetX, object.position.y + yOffset, targetZ);
        object.updateMatrix();
        object.updateMatrixWorld(true);
    }

    createMesh(geometry, type) {
        this.counters[type]++;
        const material = new THREE.MeshBasicMaterial({ 
            color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
            side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = `${type} ${this.counters[type]}`;
        mesh.userData.isSelectable = true;
        mesh.userData.type = type;
        mesh.frustumCulled = false; // Bypass culling issues on older GPUs

        this.normalizeAndGroundObject(mesh);

        this.scene.add(mesh);
        this.objects.push(mesh);
        this.allObjects[mesh.uuid] = mesh;
        this.saveState();
        PersistenceManager.saveScene(this.objects);
        
        window.dispatchEvent(new CustomEvent('app-object-added', { detail: { object: mesh } }));
        return mesh;
    }

    addObject(object) {
        object.userData.isSelectable = true;
        object.traverse(child => {
            if (child.isMesh || child.type === 'Mesh') {
                child.userData.isSelectable = true;
                if (child.material) {
                    child.material.side = THREE.DoubleSide;
                }
            }
        });
        
        this.normalizeAndGroundObject(object, 15); // Templates can be slightly larger

        this.scene.add(object);
        this.objects.push(object);
        this.allObjects[object.uuid] = object;
        this.saveState();
        PersistenceManager.saveScene(this.objects);
        
        window.dispatchEvent(new CustomEvent('app-object-added', { detail: { object: object } }));
        return object;
    }

    duplicate(object) {
        if (!object || !object.userData.isSelectable) return null;
        const type = object.userData.type || 'Object';
        this.counters[type]++;
        
        const newMesh = object.clone();
        newMesh.name = `${type} ${this.counters[type]} (Copy)`;
        newMesh.material = object.material.clone();
        newMesh.position.add(new THREE.Vector3(0.5, 0, 0.5)); // slight offset
        
        this.scene.add(newMesh);
        this.objects.push(newMesh);
        this.allObjects[newMesh.uuid] = newMesh;
        this.saveState();
        PersistenceManager.saveScene(this.objects);
        
        window.dispatchEvent(new CustomEvent('app-object-added', { detail: { object: newMesh } }));
        return newMesh;
    }

    remove(object, skipSave = false) {
        if (!object) return;
        const index = this.objects.indexOf(object);
        if (index > -1) {
            window.dispatchEvent(new CustomEvent('app-object-removing', { detail: { object } }));
            this.objects.splice(index, 1);
            this.scene.remove(object);
            
            // Do NOT dispose geometry and material here, because we might need them for UNDO
            // object.traverse(child => { ... dispose() ... });

            if (!skipSave) {
                this.saveState();
                PersistenceManager.saveScene(this.objects);
            }
        }
    }

    clearScene() {
        window.dispatchEvent(new Event('app-scene-clearing'));
        // Create a copy of the array before removing items
        const objectsToRemove = [...this.objects];
        for (const obj of objectsToRemove) {
            this.remove(obj, true);
        }
        this.counters = { 
            Cube: 0, Sphere: 0, Cylinder: 0, Plane: 0,
            Cone: 0, Torus: 0, Capsule: 0, Pyramid: 0, Disc: 0, Ring: 0, Wedge: 0 
        };
        this.saveState();
        PersistenceManager.saveScene(this.objects);
    }

    serialize() {
        const state = [];
        this.scene.traverse(obj => {
            if (obj.userData.isSelectable || obj.userData.isHouse || obj.userData.isRocket) {
                state.push({
                    uuid: obj.uuid,
                    position: obj.position.toArray(),
                    rotation: obj.rotation.toArray(),
                    scale: obj.scale.toArray(),
                    color: (obj.material && obj.material.color) ? obj.material.color.getHex() : null
                });
            }
        });
        return JSON.stringify(state);
    }

    deserialize(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            const stateMap = {};
            data.forEach(item => stateMap[item.uuid] = item);
            
            // Temporarily disable saving state during deserialization
            const wasRestoring = this.isRestoring;
            this.isRestoring = true;
            
            // 1. Remove objects that shouldn't be in the scene
            const toRemove = [];
            this.scene.traverse(obj => {
                if (obj.userData.isSelectable || obj.userData.isHouse || obj.userData.isRocket) {
                    if (!stateMap[obj.uuid]) {
                        toRemove.push(obj);
                    }
                }
            });
            toRemove.forEach(obj => {
                this.scene.remove(obj);
                const idx = this.objects.indexOf(obj);
                if (idx > -1) this.objects.splice(idx, 1);
            });
            
            // 2. Add or update objects that SHOULD be in the scene
            data.forEach(item => {
                const obj = this.allObjects[item.uuid];
                if (obj) {
                    if (!this.scene.children.includes(obj)) {
                        this.scene.add(obj);
                    }
                    if (!this.objects.includes(obj)) {
                        this.objects.push(obj);
                    }
                    
                    obj.position.fromArray(item.position);
                    obj.rotation.fromArray(item.rotation);
                    obj.scale.fromArray(item.scale);
                    if (item.color !== null && obj.material && obj.material.color) {
                        obj.material.color.setHex(item.color);
                    }
                }
            });
            
            this.isRestoring = wasRestoring;
            window.dispatchEvent(new Event('app-scene-updated'));
            
            // Clear selection if the selected object was removed
            if (window.app && window.app.transformSystem) {
                if (window.app.transformSystem.selectedObject) {
                    if (!this.objects.includes(window.app.transformSystem.selectedObject)) {
                        window.app.transformSystem.selectObject(null);
                    }
                }
            }
            
        } catch (e) {
            console.error("Failed to load scene state", e);
        }
    }
}
