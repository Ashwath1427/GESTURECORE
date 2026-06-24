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

function parseAddCommand(t) {
    // digit: "add 3 cubes"
    const d = t.match(/add\s+(\d+)\s+(\w+)/);
    if (d) return { qty: parseInt(d[1]), shape: d[2] };
    
    // word: "add five cubes"
    const wKeys = Object.keys(WORD_NUMS).join('|');
    const w = t.match(new RegExp(`add\\s+(${wKeys})\\s+(\\w+)`));
    if (w) return { qty: WORD_NUMS[w[1]], shape: w[2] };
    
    // single: "add cube" or "add a cube"
    const s = t.match(/add\s+(?:a\s+)?(\w+)/);
    if (s) return { qty: 1, shape: s[1] };
    
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

    
    // Smart Selection
    const selectMatch = text.match(/(?:select|choose|pick|focus)\s+(.+)/);
    if (selectMatch) return { type: 'SELECT_OBJECT', name: selectMatch[1] };
    
    // Deselect
    if (text.includes('deselect') || text.includes('clear selection')) return { type: 'DESELECT' };
    
    // Object Actions
    if (text.includes('duplicate') || text.includes('copy') || text.includes('clone') || text.includes('make another') || text.includes('make a copy') || text.includes('copy that') || text.includes('clone that')) return { type: 'DUPLICATE_SELECTED' };
    if (text.includes('delete') || text.includes('remove') || text.includes('erase') || text.includes('get rid of') || text.includes('destroy') || text.includes('clear that') || text.includes('delete that')) return { type: 'DELETE_SELECTED' };
    
    // Object Creation (Multi-add)
    if (text.includes('add ')) {
        const addCmd = parseAddCommand(text);
        if (addCmd) {
            // Strip plural 's' if present
            let shape = addCmd.shape;
            if (shape.endsWith('s') && shape !== 'torus') shape = shape.slice(0, -1);
            return { type: 'ADD_MULTIPLE', qty: addCmd.qty, shape: shape };
        }
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
                    offset.setLength(Math.min(30, offset.length() * 1.3));
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
                if (target && target.material) {
                    target.material.color.set(cmd.color);
                    success = true;
                }
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
