import * as THREE from 'three';
import * as SchoolBuilders from './templates-school.js';

// Helper for smooth object drop animation
async function animateDropIn(meshOrArray, durationMs) {
    const meshes = Array.isArray(meshOrArray) ? meshOrArray : [meshOrArray];
    if (meshes.length === 0) return Promise.resolve();

    const startYs = meshes.map(m => m.position.y + 20);
    const finalYs = meshes.map(m => m.position.y);
    
    // Set initial positions
    meshes.forEach((m, i) => {
        m.position.y = startYs[i];
        m.visible = true; // Ensure they are visible
    });

    const startTime = performance.now();

    return new Promise(resolve => {
        const animate = () => {
            const now = performance.now();
            const progress = Math.min((now - startTime) / durationMs, 1);
            
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            
            meshes.forEach((m, i) => {
                m.position.y = startYs[i] + (finalYs[i] - startYs[i]) * ease;
            });

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                resolve();
            }
        };
        requestAnimationFrame(animate);
    });
}

// Helper for smooth camera animation
async function easeCameraTo(app, targetPos, targetLookAt, durationMs) {
    const camera = app.transformSystem.camera;
    const controls = app.transformSystem.orbitControls;
    
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    
    const startTime = performance.now();
    controls.enabled = false;
    
    return new Promise(resolve => {
        const animate = () => {
            if (app.demoMode && app.demoMode.demoCancelled) {
                resolve();
                return;
            }
            
            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / durationMs, 1);
            
            // Ease in out cubic
            const ease = progress < 0.5 
                ? 4 * progress * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                
            camera.position.lerpVectors(startPos, targetPos, ease);
            controls.target.lerpVectors(startTarget, targetLookAt, ease);
            controls.update();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                resolve();
            }
        };
        requestAnimationFrame(animate);
    });
}

// Global refs to store objects created during the demo
let refs = {};

export const demoSteps = [
    {
        label: 'Clearing scene...',
        pauseAfter: 500,
        run: async (app, demo) => {
            app.objectRegistry.clearScene();
            refs = {};
        }
    },
    {
        label: 'Preparing campus layout...',
        pauseAfter: 600,
        run: async (app, demo) => {
            const camPos = new THREE.Vector3(0, 30, 25);
            const lookAt = new THREE.Vector3(0, 0, 0);
            app.transformSystem.camera.position.copy(camPos);
            app.transformSystem.orbitControls.target.copy(lookAt);
            app.transformSystem.orbitControls.update();
        }
    },
    {
        label: 'Laying the ground...',
        pauseAfter: 600,
        run: async (app, demo) => {
            refs.ground = SchoolBuilders.addGround(app);
            await animateDropIn(refs.ground, 400);
        }
    },
    {
        label: 'Placing the sports field...',
        pauseAfter: 700,
        run: async (app, demo) => {
            refs.field = SchoolBuilders.addField(app);
            await animateDropIn(refs.field, 400);
        }
    },
    {
        label: 'Building Main Block...',
        pauseAfter: 800,
        run: async (app, demo) => {
            // Lower camera slightly while building
            easeCameraTo(app, new THREE.Vector3(-15, 20, 20), new THREE.Vector3(0, 0, -5), 1500);
            
            refs.main = SchoolBuilders.addMainBuilding(app);
            await animateDropIn([refs.main.left, refs.main.right, refs.main.recess], 400);
        }
    },
    {
        label: 'Adding centre tower...',
        pauseAfter: 600,
        run: async (app, demo) => {
            refs.mainTower = SchoolBuilders.addMainBuildingTower(app);
            await animateDropIn(refs.mainTower, 400);
        }
    },
    {
        label: 'Adding Left Wing...',
        pauseAfter: 700,
        run: async (app, demo) => {
            refs.leftWing = SchoolBuilders.addLeftBlock(app);
            await animateDropIn(refs.leftWing, 400);
        }
    },
    {
        label: 'Adding Right Wing...',
        pauseAfter: 700,
        run: async (app, demo) => {
            refs.rightWing = SchoolBuilders.addRightWing(app);
            await animateDropIn(refs.rightWing, 400);
        }
    },
    {
        label: 'Adding windows...',
        pauseAfter: 400,
        run: async (app, demo) => {
            refs.windows = SchoolBuilders.addWindowRows(app, refs);
            
            // Drop in sequentially (row by row approx, but array is fine)
            const chunkSize = 6;
            for (let i = 0; i < refs.windows.length; i += chunkSize) {
                if (demo.demoCancelled) break;
                const chunk = refs.windows.slice(i, i + chunkSize);
                await animateDropIn(chunk, 300);
            }
        }
    },
    {
        label: 'Building boundary walls...',
        pauseAfter: 500,
        run: async (app, demo) => {
            refs.walls = SchoolBuilders.addWalls(app);
            await animateDropIn([refs.walls.left, refs.walls.right], 400);
        }
    },
    {
        label: 'Installing front gate...',
        pauseAfter: 600,
        run: async (app, demo) => {
            refs.gate = SchoolBuilders.addGate(app);
            for (const piece of refs.gate) {
                if (demo.demoCancelled) break;
                await animateDropIn(piece, 300);
            }
        }
    },
    {
        label: 'Paving entrance...',
        pauseAfter: 500,
        run: async (app, demo) => {
            refs.driveway = SchoolBuilders.addDriveway(app);
            await animateDropIn(refs.driveway, 400);
        }
    },
    {
        label: 'Parking school buses...',
        pauseAfter: 600,
        run: async (app, demo) => {
            refs.buses = [
                SchoolBuilders.addBus(app, 1, -4, 6),
                SchoolBuilders.addBus(app, 2, -1, 6),
                SchoolBuilders.addBus(app, 3, 2, 6),
                SchoolBuilders.addBus(app, 4, 5, 6)
            ];
            
            for (const bus of refs.buses) {
                if (demo.demoCancelled) break;
                await animateDropIn(bus, 400);
                await demo.wait(200);
            }
        }
    },
    {
        label: 'Planting front trees...',
        pauseAfter: 300,
        run: async (app, demo) => {
            refs.frontTrees = SchoolBuilders.addFrontTrees(app);
            for (const tree of refs.frontTrees) {
                if (demo.demoCancelled) break;
                await animateDropIn([tree.trunk, tree.leaves], 300);
                await demo.wait(100);
            }
        }
    },
    {
        label: 'Planting inner trees...',
        pauseAfter: 500,
        run: async (app, demo) => {
            refs.innerTrees = SchoolBuilders.addInnerTrees(app);
            const pieces = refs.innerTrees.flatMap(t => [t.trunk, t.leaves]);
            await animateDropIn(pieces, 400);
        }
    },
    {
        label: 'Demonstrating duplication...',
        pauseAfter: 1000,
        run: async (app, demo) => {
            const firstBus = refs.buses[0];
            app.transformSystem.selectObject(firstBus);
            await demo.wait(400);
            if (demo.demoCancelled) return;
            
            refs.dupBus = app.objectRegistry.duplicate(firstBus);
            refs.dupBus.position.x -= 3;
            app.transformSystem.selectObject(refs.dupBus);
        }
    },
    {
        label: 'Demonstrating deletion...',
        pauseAfter: 800,
        run: async (app, demo) => {
            app.objectRegistry.remove(refs.dupBus);
            app.transformSystem.selectObject(null);
        }
    },
    {
        label: 'Final camera presentation...',
        pauseAfter: 0,
        run: async (app, demo) => {
            // Orbit camera around campus
            const camera = app.transformSystem.camera;
            const controls = app.transformSystem.orbitControls;
            
            controls.target.set(0, 0, 0);
            
            const radius = 35;
            const height = 15;
            const duration = 5000;
            const startAngle = Math.atan2(camera.position.x, camera.position.z);
            const endAngle = startAngle + (Math.PI * 2) - (Math.PI / 4); // Orbit fully, land slightly to the side
            
            const startTime = performance.now();
            controls.enabled = false;
            
            return new Promise(resolve => {
                const animate = () => {
                    if (demo.demoCancelled) {
                        resolve();
                        return;
                    }
                    
                    const now = performance.now();
                    const progress = Math.min((now - startTime) / duration, 1);
                    
                    // Smooth easing for orbit
                    const ease = progress < 0.5 
                        ? 2 * progress * progress 
                        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                        
                    const currentAngle = startAngle + (endAngle - startAngle) * ease;
                    
                    camera.position.x = Math.sin(currentAngle) * radius;
                    camera.position.z = Math.cos(currentAngle) * radius;
                    camera.position.y = height;
                    
                    controls.update();
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        resolve();
                    }
                };
                requestAnimationFrame(animate);
            });
        }
    }
];
