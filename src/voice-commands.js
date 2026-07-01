import * as THREE from 'three';
import { parseDesignVoiceCommand } from './design-voice.js';
import { createGLKHouse, createRocket, createAeroplane, create2BHKHouse, createVilla, createModernHouse, createTraditionalHouse, addGardenToHouse, addPoolToHouse, addFenceToHouse, addDrivewayToHouse, addGarageToHouse } from './house-templates.js';
import { applyColorToHousePart } from './style-presets.js';

function normalizeTranscript(raw) {
    return raw
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '')
        .replace(/\b(um|uh|please|can you|could you|would you|hey|okay|ok|i want to|i want you to|can you please)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

const WORD_NUMS = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, fifteen: 15, twenty: 20
};

// Shared named-color → hex map used by both single-object and all-object coloring
const COLOR_WORDS = {
    red: '#ff4d4d', blue: '#4d79ff', green: '#4dff4d', yellow: '#ffff4d',
    orange: '#ff9933', purple: '#b34dff', violet: '#b34dff', pink: '#ff69b4',
    white: '#ffffff', black: '#1a1a1a', gold: '#ffd700', cyan: '#00ffff',
    brown: '#8b4513', grey: '#808080', gray: '#808080'
};

function extractColorHex(t) {
    for (const word in COLOR_WORDS) {
        if (t.includes(word)) return COLOR_WORDS[word];
    }
    return null;
}

// Shapes the object registry can actually build (singular forms).
const KNOWN_SHAPES = ['cube', 'sphere', 'cylinder', 'plane', 'cone', 'torus', 'capsule', 'pyramid', 'disc', 'ring', 'wedge'];

function isKnownShape(word) {
    if (!word) return false;
    let s = word.toLowerCase();
    if (s.endsWith('s') && s !== 'torus') s = s.slice(0, -1); // singularize
    return KNOWN_SHAPES.includes(s);
}

function parseAddCommand(t) {
    // Accept many creation verbs, not just "add" — but only commit to an ADD
    // when the target word is a REAL shape, so "make it red" / "create a house"
    // fall through to the color/construct rules instead of misfiring here.
    const VERB = '(?:add|create|make|spawn|place|insert|generate|build|put|new)';

    // digit: "add 3 cubes"
    const d = t.match(new RegExp(`${VERB}\\s+(\\d+)\\s+(\\w+)`));
    if (d && isKnownShape(d[2])) return { qty: parseInt(d[1]), shape: d[2] };

    // word: "add five cubes"
    const wKeys = Object.keys(WORD_NUMS).join('|');
    const w = t.match(new RegExp(`${VERB}\\s+(${wKeys})\\s+(\\w+)`));
    if (w && isKnownShape(w[2])) return { qty: WORD_NUMS[w[1]], shape: w[2] };

    // single: "add cube" / "create a cube" / "spawn an sphere" / "make the cone"
    const s = t.match(new RegExp(`${VERB}\\s+(?:a\\s+|an\\s+|the\\s+)?(\\w+)`));
    if (s && isKnownShape(s[1])) return { qty: 1, shape: s[1] };

    return null;
}

export function parseVoiceCommand(rawText) {
    // Update Debug Panel for Raw and Normalized
    const elRaw = document.getElementById('dbg-voice-raw');
    if (elRaw) elRaw.textContent = rawText || '-';

    if (!rawText) return { type: 'UNKNOWN', raw: rawText };
    
    const text = normalizeTranscript(rawText);
    const elNorm = document.getElementById('dbg-voice-norm');
    if (elNorm) elNorm.textContent = text;

    // ── Design Mode Interception ─────────────────────────────
    // If design mode is active, try the design parser first.
    // Only fall through to normal commands if design parser returns UNKNOWN.
    if (window.app && window.app.designMode && window.app.designMode.active) {
        const designCmd = parseDesignVoiceCommand(rawText);
        if (designCmd.type !== 'UNKNOWN') {
            return designCmd;
        }
    }

    
    // Smart Selection
    const selectMatch = text.match(/(?:select|choose|pick|focus)\s+(.+)/);
    if (selectMatch) return { type: 'SELECT_OBJECT', name: selectMatch[1] };
    
    // Deselect
    if (text.includes('deselect') || text.includes('clear selection')) return { type: 'DESELECT' };
    
    // Object Actions
    if (text.includes('duplicate') || text.includes('copy') || text.includes('clone') || text.includes('make another') || text.includes('make a copy') || text.includes('copy that') || text.includes('clone that')) return { type: 'DUPLICATE_SELECTED' };
    if (text.includes('delete') || text.includes('remove') || text.includes('erase') || text.includes('get rid of') || text.includes('destroy') || text.includes('clear that') || text.includes('delete that')) return { type: 'DELETE_SELECTED' };
    
    // Object Creation (Multi-add). Verbs (add/create/make/spawn/...) are handled
    // inside parseAddCommand, which only commits when the target is a real shape,
    // so ambiguous phrases fall through to the color/scale/construct rules below.
    {
        const addCmd = parseAddCommand(text);
        if (addCmd) {
            // Strip plural 's' if present
            let shape = addCmd.shape;
            if (shape.endsWith('s') && shape !== 'torus') shape = shape.slice(0, -1);
            return { type: 'ADD_MULTIPLE', qty: addCmd.qty, shape: shape };
        }
    }
    
    // Color ALL objects ("make everything red", "color all blue", "turn all green",
    // "change everything to gold"). Only fires when an explicit "all/everything" scope
    // word is present AND a known color is found; otherwise falls through to normal rules.
    if (text.includes('everything') || text.includes('all object') || text.includes('every object') ||
        text.includes('whole scene') || text.includes('color all') || text.includes('colour all') ||
        text.includes('paint all') || text.includes('change all') || text.includes('turn all') ||
        text.includes('make all')) {
        const allHex = extractColorHex(text);
        if (allHex) return { type: 'SET_COLOR_ALL', color: allHex };
    }

    // House Builder Context
    // Explicit request for the imported Tinkercad model (loads a 26MB .obj async):
    if (text.includes('glk') || text.includes('tinkercad house') || text.includes('imported house')) {
        return { type: 'BUILD_HOUSE_TEMPLATE', template: 'glk-house' };
    }
    // Generic "make/build a house" -> reliable procedural template that renders
    // instantly (no large async asset load, no empty-group normalization race).
    if (text.match(/(?:build|make|create)\s+(?:a\s+)?house/) || text.includes('simple house')) {
        return { type: 'BUILD_HOUSE_TEMPLATE', template: 'modern' };
    }
    if (text.match(/(?:build|make|create)\s+(?:a\s+)?(?:rocket|rocker|trug)/)) {
        return { type: 'BUILD_ROCKET' };
    }
    // Aeroplane (imported Tinkercad model). "make a boat" is mapped here per request,
    // along with the natural aeroplane/airplane/jet/aircraft words.
    if (text.match(/\b(boat|aeroplane|airplane|aircraft|jet)\b/) ||
        text.match(/(?:build|make|create|load|show|give me)\s+(?:a\s+|an\s+|the\s+)?plane\b/)) {
        return { type: 'BUILD_AEROPLANE' };
    }
    if (text.includes('villa')) {
        return { type: 'BUILD_HOUSE_TEMPLATE', template: 'villa' };
    }
    if (text.includes('modern house')) {
        return { type: 'BUILD_HOUSE_TEMPLATE', template: 'modern' };
    }
    if (text.includes('traditional house')) {
        return { type: 'BUILD_HOUSE_TEMPLATE', template: 'traditional' };
    }
    if (text.includes('2bhk') || text.includes('two bhk')) {
        return { type: 'BUILD_HOUSE_TEMPLATE', template: '2bhk' };
    }

    // Contextual House Actions
    if (text.includes('add garden') || text.includes('add a garden')) return { type: 'HOUSE_ACTION', action: 'garden' };
    if (text.includes('add pool') || text.includes('add a pool')) return { type: 'HOUSE_ACTION', action: 'pool' };
    if (text.includes('add fence') || text.includes('add a fence')) return { type: 'HOUSE_ACTION', action: 'fence' };
    if (text.includes('add driveway') || text.includes('add a driveway')) return { type: 'HOUSE_ACTION', action: 'driveway' };
    if (text.includes('add garage') || text.includes('add a garage')) return { type: 'HOUSE_ACTION', action: 'garage' };

    // Contextual House Paint
    const paintMatch = text.match(/paint\s+(roof|walls?|door|window)\s+(red|blue|green|yellow|orange|purple|pink|white|black|gold|cyan|brown|grey|gray)/);
    if (paintMatch) {
        return { type: 'HOUSE_PAINT', part: paintMatch[1], color: paintMatch[2] };
    }
    
    // Constructs & Dynamic Fallbacks
    const constructMatch = text.match(/(?:make|build|create)\s+(?:(?:a|an|the)\s+)?([a-zA-Z0-9]+)/);
    if (constructMatch || text.includes('plant a tree')) {
        let bp = constructMatch ? constructMatch[1] : 'tree';
        if (bp === 'plane') bp = 'airplane';
        if (bp === 'skyscraper') bp = 'tower';
        if (bp === 'spaceship' || bp === 'flying saucer') bp = 'ufo';
        if (bp === 'arch') bp = 'gate';
        if (bp === 'tent') bp = 'pyramid';
        return { type: 'CONSTRUCT_BLUEPRINT', blueprint: bp };
    }
    
    // Camera
    if (text.includes('center camera') || text.includes('reset camera') || text.includes('default camera') || text.includes('camera reset') || text.includes('reset cam') || text.includes('default view') || text.includes('reset view')) {
        return { type: 'RESET_DEFAULT_CAMERA' };
    }
    if (text.includes('center cam') || text.includes('center object') || text.includes('focus object') || text.includes('focus selected') || text.includes('focus') || text.includes('recenter') || text.includes('look at')) {
        return { type: 'CENTER_SELECTED' };
    }
    if (text.includes('zoom in') || text.includes('closer')) return { type: 'ZOOM_IN' };
    if (text.includes('zoom out') || text.includes('further') || text.includes('farther')) return { type: 'ZOOM_OUT' };
    
    // Scene
    if (text.includes('save') || text.includes('save scene') || text.includes('save my work') || text.includes('save everything') || text.includes('save the scene')) return { type: 'SAVE_SCENE' };
    if (text.includes('load') || text.includes('load scene')) return { type: 'LOAD_SCENE' };
    if (text.includes('clear scene') || text.includes('reset scene') || text.includes('start over') || text.includes('clear everything') || text.includes('wipe scene') || text.includes('new scene') || text.includes('clear all')) return { type: 'CLEAR_SCENE' };
    
    // History
    if (text.includes('undo') || text.includes('go back') || text.includes('revert') || text.includes('undo that') || text.includes('take that back')) return { type: 'UNDO' };
    if (text.includes('redo') || text.includes('redo that') || text.includes('do it again')) return { type: 'REDO' };
    
    // Transform Modes
    if (text.includes('translate') || text.includes('move mode')) return { type: 'SET_MODE', mode: 'translate' };
    if (text.includes('rotate mode') || (text.includes('rotate') && !text.includes('left') && !text.includes('right'))) return { type: 'SET_MODE', mode: 'rotate' };
    if (text.includes('scale') && text.includes('mode')) return { type: 'SET_MODE', mode: 'scale' };
    
    // Transform Increments
    if (text.includes('move up')) return { type: 'MOVE_OBJECT', dir: 'up' };
    if (text.includes('move down')) return { type: 'MOVE_OBJECT', dir: 'down' };
    if (text.includes('move left')) return { type: 'MOVE_OBJECT', dir: 'left' };
    if (text.includes('move right')) return { type: 'MOVE_OBJECT', dir: 'right' };
    if (text.includes('move forward')) return { type: 'MOVE_OBJECT', dir: 'forward' };
    if (text.includes('move back')) return { type: 'MOVE_OBJECT', dir: 'back' };
    if (text.includes('rotate left')) return { type: 'ROTATE_OBJECT', dir: 'left' };
    if (text.includes('rotate right')) return { type: 'ROTATE_OBJECT', dir: 'right' };
    if (text.includes('scale up') || text.includes('make bigger') || text.includes('enlarge') || text.includes('bigger')) return { type: 'SCALE_OBJECT', dir: 'up' };
    if (text.includes('scale down') || text.includes('make smaller') || text.includes('shrink') || text.includes('smaller')) return { type: 'SCALE_OBJECT', dir: 'down' };
    
    if (text.includes('reset position')) return { type: 'RESET_TRANSFORM', target: 'position' };
    if (text.includes('reset rotation')) return { type: 'RESET_TRANSFORM', target: 'rotation' };
    if (text.includes('reset scale')) return { type: 'RESET_TRANSFORM', target: 'scale' };
    if (text.includes('reset') || text.includes('reset all')) return { type: 'CLEAR_SCENE' };
    
    // Lock
    if (text.includes('lock') || text.includes('lock app') || text.includes('lock screen') || text.includes('lock it')) return { type: 'LOCK_APP' };
    
    // Modes
    if (text.includes('gesture on') || text.includes('enable gesture') || text.includes('start gesture')) return { type: 'GESTURE_ON' };
    if (text.includes('gesture off') || text.includes('disable gesture') || text.includes('stop gesture')) return { type: 'GESTURE_OFF' };
    if (text.includes('stop voice') || text.includes('voice off') || text.includes('stop listening')) return { type: 'VOICE_OFF' };
    
    // Demo Mode
    if (text.includes('start demo') || text.includes('run demo') || text.includes('begin demo') || text.includes('show demo') || text.includes('demo mode') || text.includes('play demo')) return { type: 'START_DEMO_MODE' };
    if (text.includes('stop demo') || text.includes('cancel demo') || text.includes('exit demo') || text.includes('end demo')) return { type: 'STOP_DEMO_MODE' };
    
    // School Template
    if (text.includes('school') || text.includes('campus') || text.includes('load school') || text.includes('build school') || text.includes('make school') || text.includes('show school') || text.includes('school model') || text.includes('school demo')) return { type: 'LOAD_SCHOOL_TEMPLATE' };
    
    // Colors
    if (text.includes('red')) return { type: 'SET_COLOR', color: '#ff4d4d' };
    if (text.includes('blue')) return { type: 'SET_COLOR', color: '#4d79ff' };
    if (text.includes('green')) return { type: 'SET_COLOR', color: '#4dff4d' };
    if (text.includes('yellow')) return { type: 'SET_COLOR', color: '#ffff4d' };
    if (text.includes('orange')) return { type: 'SET_COLOR', color: '#ff9933' };
    if (text.includes('purple') || text.includes('violet')) return { type: 'SET_COLOR', color: '#b34dff' };
    if (text.includes('pink')) return { type: 'SET_COLOR', color: '#ff69b4' };
    if (text.includes('white')) return { type: 'SET_COLOR', color: '#ffffff' };
    if (text.includes('black')) return { type: 'SET_COLOR', color: '#1a1a1a' };
    if (text.includes('gold')) return { type: 'SET_COLOR', color: '#ffd700' };
    if (text.includes('cyan')) return { type: 'SET_COLOR', color: '#00ffff' };
    
    // Help
    if (text.includes('help') || text.includes('what can you do') || text.includes('commands')) return { type: 'SHOW_HELP' };

    return { type: 'UNKNOWN', raw: text };
}

function handleSelectObject(name, app) {
    const normalized = name.toLowerCase().trim();
    const objects = app.objectRegistry.objects;
    const matches = objects.filter(obj =>
        (obj.userData.name || obj.name).toLowerCase().includes(normalized)
    );
    
    if (matches.length === 0) {
        if (app.uiManager) app.uiManager.showToast(`No object found: ${name}`);
        return;
    }
    
    app.transformSystem.selectObject(matches[0]);
    if (matches.length > 1) {
        console.log('Multiple matches:', matches.map(o => o.name));
    }
}

// Apply a color to an object (works for a single mesh OR a group/template by
// traversing every child mesh). Returns true if at least one material changed.
function setColorDeep(obj, colorHex) {
    if (!obj) return false;
    let changed = false;
    obj.traverse(node => {
        if (node.isMesh && node.material) {
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach(m => {
                if (m && m.color) {
                    m.color.set(colorHex);
                    m.needsUpdate = true;
                    changed = true;
                }
            });
        }
    });
    return changed;
}

export function executeVoiceCommand(cmd) {
    if (!window.app) return false;
    const app = window.app;
    
    // Update Debug Panel
    const elCmd = document.getElementById('dbg-voice-cmd');
    if (elCmd) elCmd.textContent = cmd.type;
    const elResult = document.getElementById('dbg-voice-result');
    if (elResult) elResult.textContent = 'Executing...';
    
    try {
        console.log(`[VoiceCmd] Executing: ${cmd.type}`, cmd);
        
        // ── Design Mode Commands ─────────────────────────────
        // If the command type starts with DESIGN_, delegate to design mode
        if (cmd.type.startsWith('DESIGN_') && app.designMode && app.designMode.active) {
            const handled = app.designMode.executeDesignCommand(cmd);
            if (handled) {
                if (elResult) elResult.textContent = `Design: ${cmd.type}`;
                return true;
            }
        }

        let success = false;
        switch (cmd.type) {
            case 'START_DEMO_MODE': {
                if (app.demoMode) { app.demoMode.start(); success = true; }
                break;
            }
            case 'STOP_DEMO_MODE': {
                if (app.demoMode) { app.demoMode.abort(); success = true; }
                break;
            }
            case 'LOAD_SCHOOL_TEMPLATE': {
                if (app.loadTemplate) { app.loadTemplate('school'); success = true; }
                break;
            }
            case 'SELECT_OBJECT': {
                handleSelectObject(cmd.name, app);
                success = true;
                break;
            }
            case 'DESELECT': {
                app.transformSystem.selectObject(null);
                success = true;
                break;
            }
            case 'ADD_MULTIPLE': {
                let count = 0;
                let firstObj = null;
                const qty = cmd.qty || 1;
                const totalWidth = (qty - 1) * 2.5;
                
                for (let i = 0; i < qty; i++) {
                    let obj = null;
                    const shape = cmd.shape.toLowerCase();
                    if (shape === 'cube') obj = app.objectRegistry.addCube();
                    else if (shape === 'sphere') obj = app.objectRegistry.addSphere();
                    else if (shape === 'cylinder') obj = app.objectRegistry.addCylinder();
                    else if (shape === 'plane') obj = app.objectRegistry.addPlane();
                    else if (shape === 'cone' && app.objectRegistry.addCone) obj = app.objectRegistry.addCone();
                    else if (shape === 'torus' && app.objectRegistry.addTorus) obj = app.objectRegistry.addTorus();
                    else if (shape === 'capsule' && app.objectRegistry.addCapsule) obj = app.objectRegistry.addCapsule();
                    else if (shape === 'pyramid' && app.objectRegistry.addPyramid) obj = app.objectRegistry.addPyramid();
                    else if (shape === 'disc' && app.objectRegistry.addDisc) obj = app.objectRegistry.addDisc();
                    else if (shape === 'ring' && app.objectRegistry.addRing) obj = app.objectRegistry.addRing();
                    else if (shape === 'wedge' && app.objectRegistry.addWedge) obj = app.objectRegistry.addWedge();
                    
                    if (obj) {
                        if (qty > 1) {
                            obj.position.x = (-totalWidth / 2) + (i * 2.5);
                        }
                        if (i === 0) firstObj = obj;
                        count++;
                    }
                }
                
                if (firstObj) {
                    app.transformSystem.selectObject(firstObj);
                    if (app.uiManager) app.uiManager.showToast(`Added ${count} ${cmd.shape}(s)`);
                }
                
                if (count === 0) {
                    if (app.uiManager) app.uiManager.showToast(`Unknown shape: ${cmd.shape}`);
                    return false;
                }
                
                success = true;
                break;
            }
            case 'BUILD_HOUSE_TEMPLATE': {
                let houseGroup = null;
                switch (cmd.template) {
                    case 'simple': houseGroup = createGLKHouse(THREE); break;
                    case 'glk-house': houseGroup = createGLKHouse(THREE); break;
                    case '2bhk': houseGroup = create2BHKHouse(THREE); break;
                    case 'villa': houseGroup = createVilla(THREE); break;
                    case 'modern': houseGroup = createModernHouse(THREE); break;
                    case 'traditional': houseGroup = createTraditionalHouse(THREE); break;
                }
                if (houseGroup) {
                    app.objectRegistry.addObject(houseGroup);
                    app.transformSystem.selectObject(houseGroup);
                    if (app.uiManager) app.uiManager.showToast(`Built a ${cmd.template} house!`);
                    success = true;
                }
                break;
            }
            case 'BUILD_ROCKET': {
                const rocketGroup = createRocket(THREE);
                if (rocketGroup) {
                    app.objectRegistry.addObject(rocketGroup);
                    app.transformSystem.selectObject(rocketGroup);
                    if (app.uiManager) app.uiManager.showToast(`Built a Rocket!`);
                    success = true;
                }
                break;
            }
            case 'BUILD_AEROPLANE': {
                const planeGroup = createAeroplane(THREE);
                if (planeGroup) {
                    app.objectRegistry.addObject(planeGroup);
                    app.transformSystem.selectObject(planeGroup);
                    if (app.uiManager) app.uiManager.showToast(`Built an Aeroplane!`);
                    success = true;
                }
                break;
            }
            case 'HOUSE_ACTION': {
                const target = app.transformSystem.selectedObject;
                if (target && target.userData && target.userData.isHouse) {
                    if (cmd.action === 'garden') addGardenToHouse(target);
                    else if (cmd.action === 'pool') addPoolToHouse(target);
                    else if (cmd.action === 'fence') addFenceToHouse(target);
                    else if (cmd.action === 'driveway') addDrivewayToHouse(target);
                    else if (cmd.action === 'garage') addGarageToHouse(target);
                    if (app.uiManager) {
                        app.uiManager.showToast(`Added ${cmd.action} to house`);
                        if (app.uiManager.renderAiSuggestions) app.uiManager.renderAiSuggestions(target);
                    }
                    success = true;
                } else {
                    if (app.uiManager) app.uiManager.showToast('Select a house to add this to.');
                }
                break;
            }
            case 'HOUSE_PAINT': {
                const target = app.transformSystem.selectedObject;
                if (target && target.userData && target.userData.isHouse) {
                    let hexColor = cmd.color;
                    // Simple map for basic named colors to hex, could expand
                    const colorMap = {
                        red: '#ff4d4d', blue: '#4d79ff', green: '#4dff4d', yellow: '#ffff4d',
                        orange: '#ff9933', purple: '#b34dff', pink: '#ff69b4', white: '#ffffff',
                        black: '#1a1a1a', gold: '#ffd700', cyan: '#00ffff', brown: '#8b4513',
                        grey: '#808080', gray: '#808080'
                    };
                    if (colorMap[cmd.color]) hexColor = colorMap[cmd.color];

                    // Map 'walls' to 'Walls', 'roof' to 'Roof', etc.
                    let partName = cmd.part.charAt(0).toUpperCase() + cmd.part.slice(1);
                    if (partName === 'Walls') partName = 'Walls'; 
                    else if (partName === 'Wall') partName = 'Walls'; // Fix singular
                    
                    applyColorToHousePart(target, partName, hexColor);
                    if (app.uiManager) {
                        app.uiManager.showToast(`Painted ${partName} ${cmd.color}`);
                        if (app.uiManager.renderAiSuggestions) app.uiManager.renderAiSuggestions(target);
                    }
                    success = true;
                } else {
                    if (app.uiManager) app.uiManager.showToast('Select a house to paint.');
                }
                break;
            }
            case 'CONSTRUCT_BLUEPRINT': {
                if (window.constructRunner) {
                    window.constructRunner.loadBlueprint(cmd.blueprint, app);
                    success = true;
                } else {
                    console.warn("Construct system not loaded");
                }
                break;
            }
            case 'DUPLICATE_SELECTED': {
                const target = app.transformSystem.selectedObject;
                if (target) {
                    const newObj = app.objectRegistry.duplicate(target);
                    app.transformSystem.selectObject(newObj);
                    success = true;
                }
                break;
            }
            case 'DELETE_SELECTED': {
                const target = app.transformSystem.selectedObject;
                if (target) {
                    app.transformSystem.selectObject(null);
                    app.objectRegistry.remove(target);
                    success = true;
                }
                break;
            }
            case 'CENTER_SELECTED': {
                const sel = app.transformSystem.selectedObject;
                if (!sel) {
                    if (app.uiManager) app.uiManager.showToast('No object selected to focus on');
                    success = true; // graceful no-op
                    break;
                }
                if (app.sceneManager.centerCameraOnSelectedObject(sel)) {
                    if (app.uiManager) app.uiManager.showToast(`Centered on ${sel.name}`);
                }
                success = true;
                break;
            }
            case 'RESET_DEFAULT_CAMERA': {
                app.sceneManager.resetCameraToDefaultView();
                if (app.uiManager) app.uiManager.showToast('Camera reset to default view');
                success = true;
                break;
            }
            case 'ZOOM_IN': {
                const cam = app.sceneManager.camera;
                const ctrl = app.sceneManager.controls;
                if (cam && ctrl) {
                    const offset = cam.position.clone().sub(ctrl.target);
                    offset.setLength(Math.max(2, offset.length() / 1.3));
                    cam.position.copy(ctrl.target.clone().add(offset));
                    ctrl.update();
                    if (app.uiManager) app.uiManager.showToast('Zoomed in');
                }
                success = true;
                break;
            }
            case 'ZOOM_OUT': {
                const cam = app.sceneManager.camera;
                const ctrl = app.sceneManager.controls;
                if (cam && ctrl) {
                    const offset = cam.position.clone().sub(ctrl.target);
                    offset.setLength(Math.min(150, offset.length() * 1.5));
                    cam.position.copy(ctrl.target.clone().add(offset));
                    ctrl.update();
                    if (app.uiManager) app.uiManager.showToast('Zoomed out');
                }
                success = true;
                break;
            }
            case 'LOCK_APP': {
                window.dispatchEvent(new Event('app-lock-requested'));
                if (app.uiManager) app.uiManager.showToast('Locking app...');
                success = true;
                break;
            }
            case 'UNDO': {
                if (app.objectRegistry.undo()) {
                    if (app.uiManager) app.uiManager.showToast('Undo successful');
                } else {
                    if (app.uiManager) app.uiManager.showToast('Nothing to undo');
                }
                success = true;
                break;
            }
            case 'REDO': {
                if (app.objectRegistry.redo()) {
                    if (app.uiManager) app.uiManager.showToast('Redo successful');
                } else {
                    if (app.uiManager) app.uiManager.showToast('Nothing to redo');
                }
                success = true;
                break;
            }
            case 'GESTURE_ON': {
                if (window.gestureSystem && !window.gestureSystem.isActive) {
                    window.gestureSystem.toggleGestureMode();
                    if (app.uiManager) app.uiManager.showToast('Gesture mode enabled');
                }
                success = true;
                break;
            }
            case 'GESTURE_OFF': {
                if (window.gestureSystem && window.gestureSystem.isActive) {
                    window.gestureSystem.stopTracking();
                    if (app.uiManager) app.uiManager.showToast('Gesture mode disabled');
                }
                success = true;
                break;
            }
            case 'VOICE_OFF': {
                if (window.voiceMode && window.voiceMode.isActive) {
                    window.voiceMode.toggleMode();
                }
                success = true;
                break;
            }
            case 'SHOW_HELP': {
                const helpText = 'Commands: add cube, select [name], delete, copy, center cam, reset, save, lock, zoom in/out, start demo, school, move up/down/left/right, scale up/down, rotate left/right, colors (red/blue/green...)';
                if (app.uiManager) app.uiManager.showToast(helpText);
                success = true;
                break;
            }
            case 'CLEAR_SCENE': {
                app.objectRegistry.clearScene();
                app.transformSystem.selectObject(null);
                if (app.uiManager) app.uiManager.showToast('Scene cleared');
                success = true;
                break;
            }
            case 'SET_MODE': {
                app.transformSystem.setMode(cmd.mode);
                success = true;
                break;
            }
            case 'SET_COLOR': {
                const target = app.transformSystem.selectedObject;
                if (target) {
                    // Works for single meshes and for grouped templates (house/rocket/aeroplane)
                    if (setColorDeep(target, cmd.color)) {
                        if (app.uiManager) app.uiManager.showToast('Color applied');
                        success = true;
                    }
                } else if (app.uiManager) {
                    app.uiManager.showToast('Select an object first, or say "color all <color>"');
                }
                break;
            }
            case 'SET_COLOR_ALL': {
                const objs = (app.objectRegistry && app.objectRegistry.objects) || [];
                let n = 0;
                objs.forEach(o => { if (setColorDeep(o, cmd.color)) n++; });
                if (app.uiManager) {
                    app.uiManager.showToast(n > 0 ? `Colored ${n} object(s)` : 'No objects to color');
                }
                // Persist the recolor so it survives reload
                if (window.PersistenceManager && app.objectRegistry) {
                    window.PersistenceManager.saveScene(app.objectRegistry.objects);
                }
                success = n > 0;
                break;
            }
            case 'MOVE_OBJECT': {
                const target = app.transformSystem.selectedObject;
                if (target) {
                    const amt = 1.0;
                    if (cmd.dir === 'up') target.position.y += amt;
                    else if (cmd.dir === 'down') target.position.y -= amt;
                    else if (cmd.dir === 'left') target.position.x -= amt;
                    else if (cmd.dir === 'right') target.position.x += amt;
                    else if (cmd.dir === 'forward') target.position.z -= amt;
                    else if (cmd.dir === 'back') target.position.z += amt;
                    success = true;
                }
                break;
            }
            case 'ROTATE_OBJECT': {
                const target = app.transformSystem.selectedObject;
                if (target) {
                    const amt = Math.PI / 4;
                    if (cmd.dir === 'left') target.rotation.y += amt;
                    else if (cmd.dir === 'right') target.rotation.y -= amt;
                    success = true;
                }
                break;
            }
            case 'SCALE_OBJECT': {
                const target = app.transformSystem.selectedObject;
                if (target) {
                    const factor = cmd.dir === 'up' ? 1.2 : 0.8;
                    target.scale.multiplyScalar(factor);
                    success = true;
                }
                break;
            }
            case 'RESET_TRANSFORM': {
                const target = app.transformSystem.selectedObject;
                if (target) {
                    if (cmd.target === 'position') target.position.set(0, target.geometry?.parameters?.height ? target.geometry.parameters.height / 2 : 0, 0);
                    else if (cmd.target === 'rotation') target.rotation.set(0, 0, 0);
                    else if (cmd.target === 'scale') target.scale.set(1, 1, 1);
                    success = true;
                }
                break;
            }
            case 'SAVE_SCENE': {
                if (window.PersistenceManager) {
                    window.PersistenceManager.saveScene(app.objectRegistry.objects);
                    if (app.uiManager) app.uiManager.showToast('Scene saved');
                    success = true;
                }
                break;
            }
            case 'LOAD_SCENE': {
                if (window.PersistenceManager) {
                    window.PersistenceManager.restoreScene(app);
                    if (app.uiManager) app.uiManager.showToast('Scene loaded');
                    success = true;
                }
                break;
            }
        }
        
        if (success) {
            if (elResult) elResult.textContent = 'Accepted';
            return true;
        }
        
        console.log(`[VoiceCmd] Ignored or unmet condition for: ${cmd.type}`);
        if (elResult) elResult.textContent = 'Ignored';
        return false;
    } catch (e) {
        console.error('[VoiceCmd] Execution error:', e);
        if (elResult) elResult.textContent = 'Error';
        return false;
    }
}
