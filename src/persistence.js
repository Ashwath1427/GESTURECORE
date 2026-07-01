import * as THREE from 'three';

export class PersistenceManager {
    static get SCENE_KEY() {
        return window.isGuestMode ? 'shape_flow_guest_scene' : 'shape_flow_scene';
    }
    static get MANUAL_SCENE_KEY() {
        return window.isGuestMode ? 'shape_flow_guest_manual' : 'shape_flow_manual';
    }
    static saveTimeout = null;

    static saveScene(sceneObjects, isManual = false) {
        if (!sceneObjects) return;
        
        const data = {
            version: 1,
            savedAt: new Date().toISOString(),
            objects: sceneObjects.map(obj => ({
                id: obj.userData.id || THREE.MathUtils.generateUUID(),
                name: obj.userData.name || obj.name,
                type: obj.userData.type,
                position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
                rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
                scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
                color: obj.material && obj.material.color ? '#' + obj.material.color.getHexString() : '#ffffff',
                visible: obj.visible
            }))
        };
        const key = isManual ? this.MANUAL_SCENE_KEY : this.SCENE_KEY;
        // localStorage can throw (QuotaExceededError when full, or SecurityError when
        // storage is blocked by browser settings/extensions in a normal window).
        // Persistence must NEVER break object creation/rendering, so swallow it.
        try {
            localStorage.setItem(key, JSON.stringify(data));
            if (window.app && window.app.uiManager && !isManual) {
                window.app.uiManager.showToast('Auto-Saved ✓');
            }
        } catch (e) {
            console.warn('[Persistence] saveScene skipped (storage full/blocked):', e);
        }
    }

    static saveSceneDebounced(sceneObjects) {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(() => {
            this.saveScene(sceneObjects);
        }, 2000);
    }

    static restoreScene(app, isManual = false) {
        const key = isManual ? this.MANUAL_SCENE_KEY : this.SCENE_KEY;
        const raw = localStorage.getItem(key);
        if (!raw) return false;
        
        try {
            const data = JSON.parse(raw);
            app.objectRegistry.clearScene();
            
            data.objects.forEach(objData => {
                // Reconstruct the object based on its type
                let mesh = null;
                const type = objData.type ? objData.type.toLowerCase() : '';
                
                if (type === 'cube') mesh = app.objectRegistry.addCube();
                else if (type === 'sphere') mesh = app.objectRegistry.addSphere();
                else if (type === 'cylinder') mesh = app.objectRegistry.addCylinder();
                else if (type === 'plane') mesh = app.objectRegistry.addPlane();
                else if (type === 'cone') mesh = app.objectRegistry.addCone ? app.objectRegistry.addCone() : null;
                else if (type === 'torus') mesh = app.objectRegistry.addTorus ? app.objectRegistry.addTorus() : null;
                else if (type === 'capsule') mesh = app.objectRegistry.addCapsule ? app.objectRegistry.addCapsule() : null;
                else if (type === 'pyramid') mesh = app.objectRegistry.addPyramid ? app.objectRegistry.addPyramid() : null;
                else if (type === 'disc') mesh = app.objectRegistry.addDisc ? app.objectRegistry.addDisc() : null;
                else if (type === 'ring') mesh = app.objectRegistry.addRing ? app.objectRegistry.addRing() : null;
                else if (type === 'wedge') mesh = app.objectRegistry.addWedge ? app.objectRegistry.addWedge() : null;
                else mesh = app.objectRegistry.addCube(); // fallback
                
                if (mesh) {
                    mesh.userData.id = objData.id;
                    mesh.name = objData.name;
                    mesh.position.set(objData.position.x, objData.position.y, objData.position.z);
                    mesh.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z);
                    mesh.scale.set(objData.scale.x, objData.scale.y, objData.scale.z);
                    mesh.visible = objData.visible;
                    if (mesh.material && mesh.material.color) {
                        mesh.material.color.set(objData.color);
                    }
                }
            });
            return true;
        } catch (e) {
            console.error("Failed to restore scene from local storage", e);
            return false;
        }
    }
}
