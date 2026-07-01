import { SceneManager } from './scene.js?v=3';
import { ObjectRegistry } from './objects.js?v=3';
import { TransformSystem } from './transform.js?v=3';
import { UIManager } from './ui.js?v=3';
import { lockScreenSystem } from './lock-screen.js?v=3';
import { DemoMode } from './demo-mode.js?v=3';
import { buildSchoolCampus } from './templates-school.js?v=3';
import { PersistenceManager } from './persistence.js?v=3';
import { ConstructRunner } from './construct-runner.js?v=3';
import { DesignModeHouse } from './design-mode-house.js?v=3';

class App {
    constructor() {
        this.container = document.getElementById('canvas-container');
        
        // Initialize Core Systems
        this.sceneManager = new SceneManager(this.container);
        this.objectRegistry = new ObjectRegistry(this.sceneManager.scene);
        
        this.transformSystem = new TransformSystem(
            this.sceneManager.camera, 
            this.container, 
            this.sceneManager.scene,
            this.sceneManager.controls
        );

        this.uiManager = new UIManager(this.objectRegistry, this.transformSystem, this.sceneManager);
        this.demoMode = new DemoMode(this);
        this.designMode = new DesignModeHouse(this);

        this.setupEvents();
        this.animate();
        
        // Resize handling
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        
        // Force initial resize to ensure canvas has dimensions
        setTimeout(() => this.onWindowResize(), 100);

        // Apply Guest Mode theme if authenticated as guest
        if (window.isGuestMode) {
            document.body.classList.add('guest-mode');
            const logoSpan = document.querySelector('#top-bar .logo span');
            if (logoSpan) logoSpan.textContent = 'GUEST';
        }

        this.setupEnvironment();
    }

    setupEnvironment() {
        console.log("DEBUG SCENE GRAPH:");
        this.sceneManager.scene.traverse(node => {
            console.log(`Node: ${node.type} | Name: ${node.name} | Visible: ${node.visible} | Pos: ${node.position.toArray()}`);
        });
        
        const gl = this.sceneManager.renderer.getContext();
        console.log("DEBUG WEBGL ERROR STATE:", gl.getError());
    }

    setupEvents() {
        // Tie TransformSystem selection to UI
        this.transformSystem.onSelectionChanged = (object) => {
            this.uiManager.setSelectedObject(object);
        };
        
        // Tie TransformSystem mode changes to UI
        this.transformSystem.onModeChanged = (mode) => {
            this.uiManager.setTransformMode(mode);
        };

        // UI triggers object changes
        this.uiManager.onObjectModified = () => {
            this.objectRegistry.saveState();
            PersistenceManager.saveSceneDebounced(this.objectRegistry.objects);
        };
        
        // Gizmo drag ends
        this.transformSystem.onTransformEnd = () => {
            this.objectRegistry.saveState();
            PersistenceManager.saveSceneDebounced(this.objectRegistry.objects);
        };

        // Universal Object Placement Flow
        window.addEventListener('app-object-added', (e) => {
            const newObj = e.detail.object;
            if (newObj) {
                // Auto-select
                this.transformSystem.selectObject(newObj);
                
                // Camera framing
                setTimeout(() => {
                    this.sceneManager.centerCameraOnSelectedObject(newObj, 600);
                }, 50); // slight delay to ensure matrices are settled
                
                // Visual pop
                this.sceneManager.highlightObject(newObj);
            }
        });

        // Listen for gesture menu events
        window.addEventListener('gesture-add-shape', (e) => {
            const shapeType = e.detail.type;
            if (shapeType === 'cube') this.objectRegistry.addCube();
            else if (shapeType === 'sphere') this.objectRegistry.addSphere();
            else if (shapeType === 'cylinder') this.objectRegistry.addCylinder();
        });

        // Demo Mode buttons
        const btnLoadSchool = document.getElementById('btn-load-school');
        if (btnLoadSchool) {
            btnLoadSchool.addEventListener('click', () => {
                this.loadTemplate('school');
            });
        }

        const btnStartDemo = document.getElementById('btn-start-demo');
        if (btnStartDemo) {
            btnStartDemo.addEventListener('click', () => {
                this.startDemo();
            });
        }

        // Design Mode button
        const btnDesignMode = document.getElementById('btn-design-mode');
        if (btnDesignMode) {
            btnDesignMode.addEventListener('click', () => {
                if (this.designMode.active) {
                    this.designMode.exit();
                    btnDesignMode.textContent = '🏠 Design Mode';
                    btnDesignMode.classList.remove('design-active');
                } else {
                    this.designMode.enter();
                    btnDesignMode.textContent = '✏️ Editor Mode';
                    btnDesignMode.classList.add('design-active');
                }
            });
        }

        // Sync selection to design mode
        const originalOnSelection = this.transformSystem.onSelectionChanged;
        this.transformSystem.onSelectionChanged = (object) => {
            if (originalOnSelection) originalOnSelection(object);
            this.uiManager.setSelectedObject(object);
        };
    }

    startDemo() {
        if (this.demoMode) {
            this.demoMode.start();
        }
    }

    loadTemplate(name) {
        if (name === 'school') {
            this.objectRegistry.clearScene();
            buildSchoolCampus(this);
            if (typeof this.sceneManager.resetCameraToDefaultView === 'function') {
                this.sceneManager.resetCameraToDefaultView();
            }
            console.log('[App] Loaded School Campus Template');
        }
    }

    onWindowResize() {
        this.sceneManager.resize();
        this.transformSystem.resize();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Render scene
        this.sceneManager.render();
    }
}

// We do not start the app immediately anymore.
// The login.js orchestrator will import App and initialize it
// after authentication is successful.
export { App };

window.PersistenceManager = PersistenceManager;
window.constructRunner = new ConstructRunner();

window.addEventListener('app-lock-requested', () => {
    console.log('[App] Lock requested by gesture');
    lockScreenSystem.lockApp();
});

function initMain() {
    const lockBtn = document.getElementById('lock-app-btn');
    if (lockBtn) {
        lockBtn.addEventListener('click', () => {
            console.log('[App] Lock requested by button');
            lockScreenSystem.lockApp();
        });
    }

    // Help button logic moved to inline HTML onclick attributes for reliability

    const debugBtn = document.getElementById('btn-toggle-debug');
    const debugPanel = document.getElementById('advanced-debug-panel');
    if (debugBtn && debugPanel) {
        debugBtn.addEventListener('click', () => {
            const isHidden = debugPanel.classList.contains('hidden');
            if (isHidden) {
                debugPanel.classList.remove('hidden');
                debugBtn.textContent = 'Hide Diagnostics';
                debugBtn.style.background = '#4ade80';
                debugBtn.style.color = '#000';
            } else {
                debugPanel.classList.add('hidden');
                debugBtn.textContent = 'Show Debug Panel';
                debugBtn.style.background = '#333';
                debugBtn.style.color = '#ccc';
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMain);
} else {
    initMain();
}
