import { SceneManager } from './scene.js';
import { ObjectRegistry } from './objects.js';
import { TransformSystem } from './transform.js';
import { UIManager } from './ui.js';
import { lockScreenSystem } from './lock-screen.js';
import { DemoMode } from './demo-mode.js';
import { buildSchoolCampus } from './templates-school.js';
import { PersistenceManager } from './persistence.js';
import { ConstructRunner } from './construct-runner.js';

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

        this.setupEvents();
        this.animate();
        
        // Resize handling
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        
        // Force initial resize to ensure canvas has dimensions
        setTimeout(() => this.onWindowResize(), 100);
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

        // Listen for gesture menu events
        window.addEventListener('gesture-add-shape', (e) => {
            const shapeType = e.detail.type;
            let newObj = null;
            if (shapeType === 'cube') newObj = this.objectRegistry.addCube();
            else if (shapeType === 'sphere') newObj = this.objectRegistry.addSphere();
            else if (shapeType === 'cylinder') newObj = this.objectRegistry.addCylinder();
            
            if (newObj) {
                this.transformSystem.selectObject(newObj);
            }
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

    const helpBtn = document.getElementById('btn-help');
    const helpPanel = document.getElementById('help-panel');
    const closeHelpBtn = document.getElementById('btn-close-help');

    if (helpBtn && helpPanel) {
        helpBtn.addEventListener('click', () => {
            helpPanel.classList.toggle('hidden');
        });
    }
    if (closeHelpBtn && helpPanel) {
        closeHelpBtn.addEventListener('click', () => {
            helpPanel.classList.add('hidden');
        });
    }

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
