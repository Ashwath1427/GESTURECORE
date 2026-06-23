import { BLUEPRINTS } from './construct-blueprints.js';

export class ConstructRunner {
    constructor() {
        this.currentCancel = null;
    }

    loadBlueprint(blueprintKey, app) {
        let bp = BLUEPRINTS[blueprintKey.toLowerCase()];
        if (!bp) {
            // Dynamic fallback for any random object requested
            bp = {
                name: blueprintKey.charAt(0).toUpperCase() + blueprintKey.slice(1),
                parts: [
                    { shape: 'cube', name: `Custom ${blueprintKey}`, position: {x:0, y:1, z:0}, scale: {x:2, y:2, z:2}, rotation: {x:0, y:0, z:0}, color: '#ffaa00', pauseAfter: 500 }
                ]
            };
            if (app.uiManager) app.uiManager.showToast(`Synthesizing custom object: ${blueprintKey}`);
        }
        
        if (this.currentCancel) {
            this.currentCancel();
            this.currentCancel = null;
        }

        this.buildBlueprint(bp, app);
    }

    async buildBlueprint(blueprint, app) {
        let cancelled = false;
        this.currentCancel = () => { cancelled = true; };
        
        const sleep = ms => new Promise(r => setTimeout(r, ms));

        for (let i = 0; i < blueprint.parts.length; i++) {
            if (cancelled) break;
            const part = blueprint.parts[i];
            
            this.updateConstructLabel(blueprint.name, i + 1, blueprint.parts.length, part.name);
            
            const mesh = this.createMeshFromPart(part, app);
            if (!mesh) continue;
            
            await this.animateDropIn(mesh, part.position.y, 400);
            await sleep(part.pauseAfter);
        }

        if (!cancelled) {
            this.dismissConstructLabel(1000);
            if (app.uiManager) app.uiManager.showToast(`Built: ${blueprint.name} (${blueprint.parts.length} parts)`);
            
            // Select the base object of the construct (the first one built)
            const objCount = app.objectRegistry.objects.length;
            if (objCount >= blueprint.parts.length) {
                const baseObj = app.objectRegistry.objects[objCount - blueprint.parts.length];
                app.transformSystem.selectObject(baseObj);
            }
        } else {
            this.dismissConstructLabel(0);
        }
    }

    createMeshFromPart(part, app) {
        let mesh = null;
        const s = part.shape;
        const reg = app.objectRegistry;
        
        if (s === 'cube') mesh = reg.addCube();
        else if (s === 'sphere') mesh = reg.addSphere();
        else if (s === 'cylinder') mesh = reg.addCylinder();
        else if (s === 'plane') mesh = reg.addPlane();
        else if (s === 'cone' && reg.addCone) mesh = reg.addCone();
        else if (s === 'torus' && reg.addTorus) mesh = reg.addTorus();
        else if (s === 'capsule' && reg.addCapsule) mesh = reg.addCapsule();
        else if (s === 'pyramid' && reg.addPyramid) mesh = reg.addPyramid();
        else if (s === 'disc' && reg.addDisc) mesh = reg.addDisc();
        else if (s === 'ring' && reg.addRing) mesh = reg.addRing();
        else if (s === 'wedge' && reg.addWedge) mesh = reg.addWedge();
        
        if (mesh) {
            mesh.userData.name = part.name;
            mesh.name = part.name;
            // The starting Y position is handled by animateDropIn, but X and Z must be set
            mesh.position.set(part.position.x, part.position.y, part.position.z);
            mesh.scale.set(part.scale.x, part.scale.y, part.scale.z);
            mesh.rotation.set(part.rotation.x, part.rotation.y, part.rotation.z);
            if (mesh.material) {
                mesh.material.color.set(part.color);
            }
        }
        return mesh;
    }

    animateDropIn(mesh, finalY, duration = 400) {
        const startY = finalY + 20;
        mesh.position.y = startY;
        const startTime = performance.now();
        return new Promise(resolve => {
            function tick() {
                const t = Math.min((performance.now() - startTime) / duration, 1);
                const e = 1 - Math.pow(1 - t, 3);
                mesh.position.y = startY + (finalY - startY) * e;
                if (t < 1) requestAnimationFrame(tick);
                else resolve();
            }
            requestAnimationFrame(tick);
        });
    }

    updateConstructLabel(name, current, total, partName) {
        const panel = document.getElementById('construct-progress');
        const nameEl = document.getElementById('construct-name');
        const stepEl = document.getElementById('construct-step');
        
        if (panel && nameEl && stepEl) {
            panel.classList.remove('hidden');
            nameEl.textContent = `Building ${name}...`;
            stepEl.textContent = `Part ${current} of ${total} \u2014 ${partName}`;
        }
    }

    dismissConstructLabel(delayMs) {
        setTimeout(() => {
            const panel = document.getElementById('construct-progress');
            if (panel) panel.classList.add('hidden');
        }, delayMs);
    }
}
