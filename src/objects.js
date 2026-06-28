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
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        return this.createMesh(geometry, 'Cube');
    }

    addSphere() {
        const geometry = new THREE.SphereGeometry(0.6, 32, 16);
        return this.createMesh(geometry, 'Sphere');
    }

    addCylinder() {
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        return this.createMesh(geometry, 'Cylinder');
    }

    addPlane() {
        const geometry = new THREE.PlaneGeometry(2, 2);
        // rotate plane to lie flat by default
        const mesh = this.createMesh(geometry, 'Plane');
        mesh.rotation.x = -Math.PI / 2;
        return mesh;
    }

    addCone() {
        const geometry = new THREE.ConeGeometry(1, 2, 32);
        return this.createMesh(geometry, 'Cone');
    }

    addTorus() {
        const geometry = new THREE.TorusGeometry(1.5, 0.4, 16, 100);
        return this.createMesh(geometry, 'Torus');
    }

    addCapsule() {
        const geometry = new THREE.CapsuleGeometry(0.5, 1.5, 8, 16);
        return this.createMesh(geometry, 'Capsule');
    }

    addPyramid() {
        const geometry = new THREE.CylinderGeometry(0, 1.5, 3, 4);
        return this.createMesh(geometry, 'Pyramid');
    }

    addDisc() {
        const geometry = new THREE.CylinderGeometry(2, 2, 0.2, 32);
        return this.createMesh(geometry, 'Disc');
    }

    addRing() {
        const geometry = new THREE.TorusGeometry(2, 0.3, 8, 64);
        return this.createMesh(geometry, 'Ring');
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

    createMesh(geometry, type) {
        this.counters[type]++;
        const material = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5) 
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = `${type} ${this.counters[type]}`;
        mesh.userData.isSelectable = true;
        mesh.userData.type = type;
        mesh.frustumCulled = false; // Bypass culling issues on older GPUs

        // collision-aware offset spawn (simple jitter so they don't stack perfectly)
        const meshHeight = (geometry.parameters && geometry.parameters.height) ? geometry.parameters.height : 0;
        mesh.position.set(
            (Math.random() - 0.5) * 2,
            meshHeight / 2, 
            (Math.random() - 0.5) * 2
        );

        // force immediate matrix updates
        mesh.updateMatrix();
        mesh.updateMatrixWorld(true);

        this.scene.add(mesh);
        this.objects.push(mesh);
        this.allObjects[mesh.uuid] = mesh;
        this.saveState();
        PersistenceManager.saveScene(this.objects);
        return mesh;
    }

    addObject(object) {
        object.userData.isSelectable = true;
        object.traverse(child => {
            if (child.isMesh || child.type === 'Mesh') {
                child.userData.isSelectable = true;
            }
        });
        this.scene.add(object);
        this.objects.push(object);
        this.allObjects[object.uuid] = object;
        this.saveState();
        PersistenceManager.saveScene(this.objects);
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
