// ============================================================
// design-mode-house.js — Design Mode orchestrator
// ============================================================
import * as THREE from 'three';
import { DesignUI } from './design-ui.js';
import { HOUSE_TEMPLATES, addGarageToHouse, addGardenToHouse, addPoolToHouse, addFenceToHouse, addDrivewayToHouse } from './house-templates.js';
import { applyStylePreset, applyColorToHousePart } from './style-presets.js';
import { generateSuggestions } from './ai-suggestions.js';
import { createCommunityGrid, addHouseRow, AMENITY_CREATORS, createRoadSegment } from './community-layout.js';

export class DesignModeHouse {
    constructor(app) {
        this.app = app;
        this.active = false;
        this.communityMode = false;

        // Design-specific scene objects
        this.designObjects = [];
        this.selectedHouse = null;
        this.groundPlane = null;
        this.communityGrid = null;
        this.amenityPlacementZ = 30; // incremental Z for amenity placement

        // UI
        this.ui = new DesignUI();
        this.ui.create();

        // Wire UI callbacks
        this.ui.onTemplateSelect = (t) => this.buildHouse(t);
        this.ui.onPartSelect = (p) => this.addPartToSelected(p);
        this.ui.onPresetSelect = (p) => this.applyPreset(p);
        this.ui.onSuggestionApply = (s) => this.applySuggestion(s);
        this.ui.onSuggestionRefresh = () => this.refreshSuggestions();
        this.ui.onCommunityToggle = (a) => this.addAmenity(a);
    }

    // ============================================================
    // ENTER / EXIT
    // ============================================================

    enter() {
        if (this.active) return;
        this.active = true;

        // Hide editor UI
        const leftToolbar = document.getElementById('left-toolbar');
        const rightInspector = document.getElementById('right-inspector');
        if (leftToolbar) leftToolbar.style.display = 'none';
        if (rightInspector) rightInspector.style.display = 'none';

        // Show design UI
        this.ui.show();
        this.ui.setMode('DESIGN');

        // Create ground plane
        this._createDesignGround();

        // Position camera for design view
        this._setCameraDesignView();

        console.log('[DesignMode] Entered Design Mode');
    }

    exit() {
        if (!this.active) return;
        this.active = false;
        this.communityMode = false;

        // Show editor UI
        const leftToolbar = document.getElementById('left-toolbar');
        const rightInspector = document.getElementById('right-inspector');
        if (leftToolbar) leftToolbar.style.display = '';
        if (rightInspector) rightInspector.style.display = '';

        // Hide design UI
        this.ui.hide();

        // Remove design ground (but keep houses — they are scene objects)
        if (this.groundPlane) {
            this.app.sceneManager.scene.remove(this.groundPlane);
            this.groundPlane = null;
        }
        if (this.communityGrid) {
            this.app.sceneManager.scene.remove(this.communityGrid);
            this.communityGrid = null;
        }

        // Reset camera
        this.app.sceneManager.resetCameraToDefaultView();

        console.log('[DesignMode] Exited Design Mode');
    }

    // ============================================================
    // GROUND PLANE
    // ============================================================

    _createDesignGround() {
        if (this.groundPlane) return;

        const ground = new THREE.Mesh(
            new THREE.BoxGeometry(80, 0.1, 80),
            new THREE.MeshStandardMaterial({ color: 0x88aa66, roughness: 0.9 })
        );
        ground.name = 'Design_Ground';
        ground.position.set(0, -0.05, 0);
        this.app.sceneManager.scene.add(ground);
        this.groundPlane = ground;

        // Add subtle grid lines
        const gridHelper = new THREE.GridHelper(80, 40, 0x668844, 0x557733);
        gridHelper.name = 'Design_Grid';
        gridHelper.position.set(0, 0.01, 0);
        ground.add(gridHelper);
    }

    _setCameraDesignView() {
        const cam = this.app.sceneManager.camera;
        const controls = this.app.sceneManager.controls;

        // Elevated 3D perspective suitable for house viewing
        const startPos = cam.position.clone();
        const startTgt = controls.target.clone();
        const endPos = new THREE.Vector3(15, 15, 15);
        const endTgt = new THREE.Vector3(0, 1, 0);

        const startTime = performance.now();
        const duration = 800;
        
        controls.enabled = false;

        function tick() {
            const t = Math.min((performance.now() - startTime) / duration, 1);
            const e = 1 - Math.pow(1 - t, 3);
            cam.position.lerpVectors(startPos, endPos, e);
            controls.target.lerpVectors(startTgt, endTgt, e);
            if (t < 1) {
                requestAnimationFrame(tick);
            } else {
                controls.enabled = true;
                controls.update();
            }
        }
        requestAnimationFrame(tick);
    }

    // ============================================================
    // HOUSE BUILDING
    // ============================================================

    buildHouse(templateName) {
        const templateFn = HOUSE_TEMPLATES[templateName];
        if (!templateFn) {
            this.ui.showDesignToast(`Unknown template: ${templateName}`);
            return null;
        }

        const house = templateFn(THREE);

        // Offset each new house to avoid stacking
        const offset = this.designObjects.filter(o => o.isGroup).length;
        house.position.set(offset * 18, 0, 0);

        // Make it selectable by TransformSystem raycaster
        house.traverse(child => {
            child.userData.isSelectable = true;
        });

        this.app.sceneManager.scene.add(house);
        this.designObjects.push(house);
        this.selectedHouse = house;

        // Select it via TransformSystem
        this.app.transformSystem.selectObject(house);

        this.refreshSuggestions();
        this.ui.showDesignToast(`Built: ${house.name}`);
        console.log(`[DesignMode] Built ${house.name}`);

        return house;
    }

    // ============================================================
    // PART ADDITION
    // ============================================================

    addPartToSelected(partName) {
        if (!this.selectedHouse) {
            this.ui.showDesignToast('Select a house first!');
            return;
        }

        const partMap = {
            'garage':   addGarageToHouse,
            'garden':   addGardenToHouse,
            'pool':     addPoolToHouse,
            'fence':    addFenceToHouse,
            'driveway': addDrivewayToHouse,
        };

        const adder = partMap[partName];
        if (adder) {
            adder(this.selectedHouse);
            this.refreshSuggestions();
            this.ui.showDesignToast(`Added ${partName} to ${this.selectedHouse.name}`);
        }
    }

    // ============================================================
    // STYLE PRESETS
    // ============================================================

    applyPreset(presetName) {
        if (!this.selectedHouse) {
            this.ui.showDesignToast('Select a house first!');
            return;
        }

        applyStylePreset(this.selectedHouse, presetName);
        this.refreshSuggestions();
        this.ui.showDesignToast(`Applied ${presetName} style`);
    }

    // ============================================================
    // COLOR COMMANDS
    // ============================================================

    colorPart(partName, colorHex) {
        if (!this.selectedHouse) {
            this.ui.showDesignToast('Select a house first!');
            return;
        }

        applyColorToHousePart(this.selectedHouse, partName, colorHex);
        this.refreshSuggestions();
        this.ui.showDesignToast(`Colored ${partName} → ${colorHex}`);
    }

    colorAll(colorHex) {
        if (!this.selectedHouse) {
            this.ui.showDesignToast('Select a house first!');
            return;
        }

        this.selectedHouse.traverse((child) => {
            if (child.isMesh) {
                child.material = child.material.clone();
                child.material.color.set(colorHex);
                child.material.needsUpdate = true;
            }
        });

        this.refreshSuggestions();
        this.ui.showDesignToast(`Colored entire house → ${colorHex}`);
    }

    // ============================================================
    // ROTATE
    // ============================================================

    rotateHouse() {
        if (!this.selectedHouse) {
            this.ui.showDesignToast('Select a house first!');
            return;
        }

        this.selectedHouse.rotation.y += Math.PI / 2;
        this.ui.showDesignToast('Rotated 90°');
    }

    // ============================================================
    // AI SUGGESTIONS
    // ============================================================

    refreshSuggestions() {
        const suggestions = this.selectedHouse ? generateSuggestions(this.selectedHouse) : [];
        this.ui.updateSuggestions(suggestions);
    }

    applySuggestion(suggestion) {
        if (!this.selectedHouse) return;

        if (typeof suggestion.apply === 'function') {
            suggestion.apply(this.selectedHouse);
            this.ui.showDesignToast('Applied suggestion!');
        }

        this.refreshSuggestions();
    }

    // ============================================================
    // COMMUNITY MODE
    // ============================================================

    addHouseRow(count, templateName = 'simple') {
        const houses = addHouseRow(this.app.sceneManager.scene, count, templateName, 18);
        this.designObjects.push(...houses);
        if (houses.length > 0) this.selectedHouse = houses[0];
        this.ui.showDesignToast(`Placed ${count} houses`);
        return houses;
    }

    addAmenity(type) {
        const creator = AMENITY_CREATORS[type];
        if (!creator) {
            // Special case: road with default length
            if (type === 'road') {
                const road = createRoadSegment(THREE, 30, 'horizontal');
                road.position.set(0, 0, this.amenityPlacementZ);
                this.amenityPlacementZ += 8;
                this.app.sceneManager.scene.add(road);
                this.designObjects.push(road);
                this.ui.showDesignToast('Added road segment');
                return road;
            }
            this.ui.showDesignToast(`Unknown amenity: ${type}`);
            return null;
        }

        const amenity = creator(THREE);
        amenity.position.set(0, 0, this.amenityPlacementZ);
        this.amenityPlacementZ += 15;
        this.app.sceneManager.scene.add(amenity);
        this.designObjects.push(amenity);
        this.ui.showDesignToast(`Added ${amenity.name}`);
        return amenity;
    }

    // ============================================================
    // VOICE COMMAND EXECUTION & AI SUGGESTIONS
    // ============================================================

    speak(text) {
        if (!window.speechSynthesis) return;
        // Cancel any currently playing speech to avoid overlapping chatter
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }

    speakNextSuggestion() {
        if (!this.selectedHouse) return;
        const suggestions = generateSuggestions(this.selectedHouse);
        if (suggestions.length > 0) {
            // Read out the first (highest priority) suggestion
            this.speak(suggestions[0].text);
        }
    }

    executeDesignCommand(cmd) {
        let handled = false;
        switch (cmd.type) {
            case 'DESIGN_BUILD_HOUSE':
                this.buildHouse(cmd.template);
                handled = true;
                break;

            case 'DESIGN_ADD_PART':
                this.addPartToSelected(cmd.part);
                handled = true;
                break;

            case 'DESIGN_APPLY_PRESET':
                this.applyPreset(cmd.preset);
                handled = true;
                break;

            case 'DESIGN_COLOR_PART':
                this.colorPart(cmd.part, cmd.color);
                handled = true;
                break;

            case 'DESIGN_COLOR_ALL':
                this.colorAll(cmd.color);
                handled = true;
                break;

            case 'DESIGN_ROTATE_HOUSE':
                this.rotateHouse();
                handled = true;
                break;

            case 'DESIGN_ADD_HOUSE_ROW':
                this.addHouseRow(cmd.count, cmd.template || 'simple');
                handled = true;
                break;

            case 'DESIGN_ADD_AMENITY':
                this.addAmenity(cmd.amenity);
                handled = true;
                break;

            case 'DESIGN_COMMUNITY_MODE':
                if (!this.communityMode) {
                    this.communityMode = true;
                    this.ui.setMode('COMMUNITY');
                    if (!this.communityGrid) {
                        this.communityGrid = createCommunityGrid(THREE, 3, 3, 20);
                        this.app.sceneManager.scene.add(this.communityGrid);
                    }
                    this.ui.showDesignToast('Community Layout Mode');
                }
                handled = true;
                break;

            case 'DESIGN_EXIT':
                this.exit();
                handled = true;
                break;
        }
        
        if (handled) {
            // After any successful design action, let the AI speak a suggestion
            // Add a tiny delay so the voice feels like an authentic response
            setTimeout(() => this.speakNextSuggestion(), 800);
            return true;
        }

        return false;
    }

    // ============================================================
    // SELECTION SYNC
    // ============================================================

    /**
     * Called by the App whenever TransformSystem selects an object.
     * If the selected object is a house group, we update our reference.
     */
    onSelectionChanged(obj) {
        if (!this.active) return;

        // Walk up to find the root group (house)
        let current = obj;
        while (current && current.parent && current.parent !== this.app.sceneManager.scene) {
            current = current.parent;
        }

        if (current && current.isGroup && current.userData.templateType) {
            this.selectedHouse = current;
            this.refreshSuggestions();
        }
    }

    clearDesignScene() {
        // Remove all design objects
        for (const obj of this.designObjects) {
            this.app.sceneManager.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        }
        this.designObjects = [];
        this.selectedHouse = null;
        this.amenityPlacementZ = 0;

        // Remove community grid
        if (this.communityGrid) {
            this.app.sceneManager.scene.remove(this.communityGrid);
            this.communityGrid = null;
        }

        // Remove ground plane
        if (this.groundPlane) {
            this.app.sceneManager.scene.remove(this.groundPlane);
            this.groundPlane = null;
        }

        this.communityMode = false;
        this.ui.setMode('DESIGN');
        
        // Re-create ground plane immediately if we are active
        if (this.active) {
            this._createDesignGround();
        }

        this.refreshSuggestions();
        this.ui.showDesignToast('Design Scene Reset');
    }
}
