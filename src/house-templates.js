// ============================================================
// house-templates.js — Modular house templates + part adders
// ============================================================
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

// ── Helper: Create a standard material ───────────────────────
function mat(color) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });
}

function glassMat(color = 0xaaccff) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.6 });
}

// ── Helper: Animate construction ─────────────────────────────
export function animateConstruction(group, THREE_ref) {
    if (!group || !group.isGroup) return;
    
    const parts = [];
    group.traverse(child => {
        if (child.isMesh && !child.userData.isOutline) { // Skip edge outlines initially
            child.userData.origScale = child.scale.clone();
            child.userData.origPosition = child.position.clone();
            
            child.scale.set(0.001, 0.001, 0.001);
            child.position.y -= 2;
            parts.push(child);
        }
    });

    // Sort by Y to build from the ground up
    parts.sort((a, b) => a.userData.origPosition.y - b.userData.origPosition.y);

    // Calculate dynamic stagger so the whole animation takes about 12.5 seconds
    const totalAnimTime = 12500;
    const stepDelay = Math.min(150, totalAnimTime / Math.max(1, parts.length));

    let delay = 0;
    parts.forEach((part) => {
        setTimeout(() => {
            let startTime = null;
            const duration = 500;
            const origScale = part.userData.origScale;
            const origPos = part.userData.origPosition;
            const startPos = part.position.clone();
            const minScale = new THREE_ref.Vector3(0.001, 0.001, 0.001);
            
            function animate(time) {
                if (!startTime) startTime = time;
                const progress = Math.min((time - startTime) / duration, 1.0);
                
                // Elastic/springy ease out
                const ease = 1 - Math.pow(1 - progress, 4); // Quartic ease out
                
                part.scale.lerpVectors(minScale, origScale, ease);
                part.position.lerpVectors(startPos, origPos, ease);
                
                if (progress < 1.0) {
                    requestAnimationFrame(animate);
                } else {
                    part.scale.copy(origScale);
                    part.position.copy(origPos);
                }
            }
            requestAnimationFrame(animate);
        }, delay);
        
        delay += stepDelay; // stagger parts dynamically
    });
}

// ============================================================
// TEMPLATE 1 — GLK House (Imported Model)
// ============================================================
export function createGLKHouse(THREE_ref) {
    const group = new THREE.Group();
    group.name = 'GLK House';
    group.userData.isHouse = true;
    group.userData.templateType = 'glk-house';
    group.userData.templateName = 'GLK House';

    const mtlLoader = new MTLLoader();
    mtlLoader.setPath('assets/glk-house/');
    mtlLoader.load('obj.mtl', (materials) => {
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath('assets/glk-house/');
        objLoader.load('tinker.obj', (object) => {
            // Tinkercad exports are typically huge and rotated
            object.scale.set(0.05, 0.05, 0.05); 
            object.rotation.x = -Math.PI / 2;
            object.updateMatrixWorld(true); // Must update before bounds calculation
            
            // Re-center horizontally and place on ground
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            object.position.x = -center.x;
            object.position.z = -center.z;
            object.position.y = -box.min.y; // Sit flat on the ground
            
            // Enhance materials and add outlines to match Tinkercad aesthetic
            object.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    if (child.material) {
                        child.material.side = THREE.DoubleSide;
                        if (child.material.opacity < 1.0) {
                            child.material.transparent = true;
                            child.material.depthWrite = false;
                        }
                        // Force update to handle transparency and side changes
                        child.material.needsUpdate = true;
                    }
                    
                    // Allow the user to click and select this part of the house
                    child.userData.isSelectable = true;
                }
            });

            group.add(object);
            animateConstruction(group, THREE);
            
            // Dispatch an event so UIManager can update bounds if needed
            window.dispatchEvent(new Event('app-scene-updated'));
        }, undefined, (error) => {
            console.error('Error loading GLK house OBJ:', error);
        });
    }, undefined, (error) => {
        console.error('Error loading GLK house MTL:', error);
    });

    return group;
}

// ============================================================
// TEMPLATE 1B — Rocket (Imported Model)
// ============================================================
export function createRocket(THREE_ref) {
    const group = new THREE.Group();
    group.name = 'Surprising Trug (Rocket)';
    group.userData.isRocket = true;
    group.userData.templateType = 'rocket';
    group.userData.templateName = 'Rocket';

    const mtlLoader = new MTLLoader();
    mtlLoader.setPath('assets/rocket/');
    mtlLoader.load('obj.mtl', (materials) => {
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath('assets/rocket/');
        objLoader.load('tinker.obj', (object) => {
            object.scale.set(0.05, 0.05, 0.05); 
            object.rotation.x = -Math.PI / 2;
            object.updateMatrixWorld(true);
            
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            object.position.x = -center.x;
            object.position.z = -center.z;
            object.position.y = -box.min.y; 
            
            object.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    if (child.material) {
                        child.material.side = THREE.DoubleSide;
                        if (child.material.opacity < 1.0) {
                            child.material.transparent = true;
                            child.material.depthWrite = false;
                        }
                        child.material.needsUpdate = true;
                    }

                    // Allow the user to click and select this part of the rocket
                    child.userData.isSelectable = true;
                }
            });

            group.add(object);
            animateConstruction(group, THREE);
            window.dispatchEvent(new Event('app-scene-updated'));
        }, undefined, (error) => {
            console.error('Error loading rocket OBJ:', error);
        });
    }, undefined, (error) => {
        console.error('Error loading rocket MTL:', error);
    });

    return group;
}

// ============================================================
// TEMPLATE 1C — Aeroplane (Imported Tinkercad Model)
// ============================================================
export function createAeroplane(THREE_ref) {
    const group = new THREE.Group();
    group.name = 'Aeroplane (GLK)';
    group.userData.isAeroplane = true;
    group.userData.templateType = 'aeroplane';
    group.userData.templateName = 'Aeroplane';

    const mtlLoader = new MTLLoader();
    mtlLoader.setPath('assets/aeroplane/');
    mtlLoader.load('obj.mtl', (materials) => {
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath('assets/aeroplane/');
        objLoader.load('tinker.obj', (object) => {
            // Tinkercad exports are large and Z-up; scale down and stand upright
            object.scale.set(0.05, 0.05, 0.05);
            object.rotation.x = -Math.PI / 2;
            object.updateMatrixWorld(true);

            // Re-center horizontally and place on the ground
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            object.position.x = -center.x;
            object.position.z = -center.z;
            object.position.y = -box.min.y;

            object.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    if (child.material) {
                        child.material.side = THREE.DoubleSide;
                        if (child.material.opacity < 1.0) {
                            child.material.transparent = true;
                            child.material.depthWrite = false;
                        }
                        child.material.needsUpdate = true;
                    }

                    // Allow the user to click and select this part of the aeroplane
                    child.userData.isSelectable = true;
                }
            });

            group.add(object);
            animateConstruction(group, THREE);
            window.dispatchEvent(new Event('app-scene-updated'));
        }, undefined, (error) => {
            console.error('Error loading aeroplane OBJ:', error);
        });
    }, undefined, (error) => {
        console.error('Error loading aeroplane MTL:', error);
    });

    return group;
}

// ============================================================
// Generic imported-model loader (assets/<folder>/obj.mtl + tinker.obj)
// Normalizes ANY Tinkercad export to a visible size and grounds it on the grid,
// so models don't end up microscopic (hardcoded scale) or off-screen.
// ============================================================
export function createImportedModel(folder, displayName, targetSize = 8) {
    const group = new THREE.Group();
    group.name = displayName || folder;
    group.userData.isImportedModel = true;
    group.userData.templateType = folder;
    group.userData.templateName = displayName || folder;

    const path = `assets/${folder}/`;
    const mtlLoader = new MTLLoader();
    mtlLoader.setPath(path);
    mtlLoader.load('obj.mtl', (materials) => {
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath(path);
        objLoader.load('tinker.obj', (object) => {
            // Tinkercad exports are Z-up: stand them upright.
            object.rotation.x = -Math.PI / 2;
            object.updateMatrixWorld(true);

            // Normalize to a consistent visible size regardless of native units.
            let box = new THREE.Box3().setFromObject(object);
            let size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            object.scale.setScalar(targetSize / maxDim);
            object.updateMatrixWorld(true);

            // Re-center horizontally and sit flat on the ground.
            box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            object.position.x -= center.x;
            object.position.z -= center.z;
            object.position.y -= box.min.y;

            object.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.material) {
                        child.material.side = THREE.DoubleSide;
                        child.material.needsUpdate = true;
                    }
                    child.userData.isSelectable = true;
                }
            });

            group.add(object);
            animateConstruction(group, THREE);
            window.dispatchEvent(new Event('app-scene-updated'));
        }, undefined, (err) => console.error(`[Model] OBJ load failed for ${folder}:`, err));
    }, undefined, (err) => console.error(`[Model] MTL load failed for ${folder}:`, err));

    return group;
}

// ============================================================
// TEMPLATE 2 — 2BHK House
// ============================================================
export function create2BHKHouse(THREE_ref) {
    const group = new THREE.Group();
    group.name = '2BHK House';
    group.userData.isHouse = true;
    group.userData.templateType = '2bhk';
    group.userData.templateName = '2BHK House';

    // Main body
    const mainWalls = new THREE_ref.Mesh(new THREE_ref.BoxGeometry(10, 3, 7), mat(0xe8e0d0));
    mainWalls.name = 'Walls';
    mainWalls.position.set(0, 1.5, 0);
    group.add(mainWalls);

    // Flat roof
    const roof = new THREE_ref.Mesh(new THREE_ref.BoxGeometry(10.4, 0.3, 7.4), mat(0x666666));
    roof.name = 'Roof';
    roof.position.set(0, 3.15, 0);
    group.add(roof);

    // Interior dividers (visible as slight color difference)
    const divider1 = new THREE_ref.Mesh(new THREE_ref.BoxGeometry(0.1, 2.8, 7), mat(0xd0c8b8));
    divider1.name = 'Divider_Hall';
    divider1.position.set(-1.5, 1.5, 0);
    group.add(divider1);

    const divider2 = new THREE_ref.Mesh(new THREE_ref.BoxGeometry(0.1, 2.8, 3), mat(0xd0c8b8));
    divider2.name = 'Divider_Bedroom';
    divider2.position.set(2.5, 1.5, -2);
    group.add(divider2);

    // Door
    const door = new THREE_ref.Mesh(new THREE_ref.BoxGeometry(1.2, 2.2, 0.1), mat(0x4a2c0a));
    door.name = 'Door';
    door.position.set(0, 1.1, 3.55);
    group.add(door);

    // Bedroom windows
    for (let i = 0; i < 3; i++) {
        const win = new THREE_ref.Mesh(new THREE_ref.BoxGeometry(1, 0.8, 0.1), glassMat());
        win.name = `Window_Front_${i}`;
        win.position.set(-3.5 + i * 3.5, 2, 3.55);
        group.add(win);
    }

    // Side windows
    for (let i = 0; i < 2; i++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 1), glassMat());
        win.name = `Window_Side_${i}`;
        win.position.set(5.05, 2, -2 + i * 4);
        group.add(win);
    }

    animateConstruction(group, THREE_ref);
    return group;
}

// ============================================================
// TEMPLATE 3 — Villa (2 floors)
// ============================================================
export function createVilla(THREE_ref) {
    const group = new THREE.Group();
    group.name = 'Luxury Villa';
    group.userData.isHouse = true;
    group.userData.templateType = 'villa';
    group.userData.templateName = 'Luxury Villa';

    // Ground floor walls
    const gfWalls = new THREE.Mesh(new THREE.BoxGeometry(12, 3, 8), mat(0xffffff));
    gfWalls.name = 'Walls_Ground';
    gfWalls.position.set(0, 1.5, 0);
    group.add(gfWalls);

    // First floor walls (slightly inset)
    const ffWalls = new THREE.Mesh(new THREE.BoxGeometry(11, 3, 7), mat(0xf8f8f8));
    ffWalls.name = 'Walls_Upper';
    ffWalls.position.set(0, 4.5, 0);
    group.add(ffWalls);

    // Sloped roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(9, 2.5, 4), mat(0x4a3520));
    roof.name = 'Roof';
    roof.position.set(0, 7.25, 0);
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    // Balcony (front, upper floor)
    const balconyFloor = new THREE.Mesh(new THREE.BoxGeometry(4, 0.15, 2), mat(0xcccccc));
    balconyFloor.name = 'Balcony_Floor';
    balconyFloor.position.set(0, 3.07, 4.5);
    group.add(balconyFloor);

    const balconyRail = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 0.1), mat(0x888888));
    balconyRail.name = 'Balcony_Rail';
    balconyRail.position.set(0, 3.5, 5.45);
    group.add(balconyRail);

    // Garage (attached side)
    const garageWalls = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 5), mat(0xe0e0e0));
    garageWalls.name = 'Garage';
    garageWalls.position.set(8, 1.25, 0);
    group.add(garageWalls);

    const garageDoor = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 0.1), mat(0x555555));
    garageDoor.name = 'Garage_Door';
    garageDoor.position.set(8, 1, 2.55);
    group.add(garageDoor);

    // Main door
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.1), mat(0x3a1c0a));
    door.name = 'Door';
    door.position.set(0, 1.2, 4.05);
    group.add(door);

    // Windows — ground floor
    for (let i = 0; i < 4; i++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 0.1), glassMat());
        win.name = `Window_GF_${i}`;
        win.position.set(-4 + i * 2.8, 2, 4.05);
        group.add(win);
    }

    // Windows — first floor
    for (let i = 0; i < 3; i++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 0.1), glassMat());
        win.name = `Window_FF_${i}`;
        win.position.set(-3 + i * 3, 5, 3.55);
        group.add(win);
    }

    return group;
}

// ============================================================
// TEMPLATE 4 — Modern House
// ============================================================
export function createModernHouse(THREE_ref) {
    const group = new THREE.Group();
    group.name = 'Modern House';
    group.userData.isHouse = true;
    group.userData.templateType = 'modern';
    group.userData.templateName = 'Modern House';

    // Main volume
    const walls = new THREE.Mesh(new THREE.BoxGeometry(10, 3.5, 7), mat(0xf0f0f0));
    walls.name = 'Walls';
    walls.position.set(0, 1.75, 0);
    group.add(walls);

    // Flat roof with overhang
    const roof = new THREE.Mesh(new THREE.BoxGeometry(11, 0.25, 8), mat(0x333333));
    roof.name = 'Roof';
    roof.position.set(0, 3.62, 0);
    group.add(roof);

    // Large front window (floor to ceiling glass)
    const bigWin = new THREE.Mesh(new THREE.BoxGeometry(6, 2.8, 0.1), glassMat(0x88bbdd));
    bigWin.name = 'Window_Large';
    bigWin.position.set(1.5, 1.7, 3.55);
    group.add(bigWin);

    // Side accent wall
    const accent = new THREE_ref.Mesh(new THREE_ref.BoxGeometry(0.3, 3.5, 3), mat(0x888888));
    accent.name = 'Accent_Wall';
    accent.position.set(-5.15, 1.75, 0);
    group.add(accent);

    // Minimalist door
    const door = new THREE_ref.Mesh(new THREE_ref.BoxGeometry(1.2, 2.6, 0.1), mat(0x222222));
    door.name = 'Door';
    door.position.set(-2.5, 1.3, 3.55);
    group.add(door);

    // Side windows
    for (let i = 0; i < 2; i++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 2), glassMat(0x88bbdd));
        win.name = `Window_Side_${i}`;
        win.position.set(5.05, 2, -1.5 + i * 3);
        group.add(win);
    }

    return group;
}

// ============================================================
// TEMPLATE 5 — Traditional House
// ============================================================
export function createTraditionalHouse(THREE_ref) {
    const group = new THREE.Group();
    group.name = 'Traditional House';
    group.userData.isHouse = true;
    group.userData.templateType = 'traditional';
    group.userData.templateName = 'Traditional House';

    // Walls
    const walls = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 6), mat(0xf5f0e8));
    walls.name = 'Walls';
    walls.position.set(0, 1.5, 0);
    group.add(walls);

    // Sloped roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.5, 2.5, 4), mat(0x8b4513));
    roof.name = 'Roof';
    roof.position.set(0, 4.25, 0);
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    // Porch
    const porchFloor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.15, 2.5), mat(0xc8b8a0));
    porchFloor.name = 'Porch_Floor';
    porchFloor.position.set(0, 0.07, 4.25);
    group.add(porchFloor);

    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.15, 2.8), mat(0x7a3a10));
    porchRoof.name = 'Porch_Roof';
    porchRoof.position.set(0, 2.7, 4.25);
    group.add(porchRoof);

    // Porch columns
    for (let i = 0; i < 3; i++) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 8), mat(0xcccccc));
        col.name = `Column_${i}`;
        col.position.set(-3 + i * 3, 1.37, 5.4);
        group.add(col);
    }

    // Door
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.1), mat(0x4a2c0a));
    door.name = 'Door';
    door.position.set(0, 1.1, 3.05);
    group.add(door);

    // Windows
    const win1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1), glassMat(0xddcc99));
    win1.name = 'Window_Front_L';
    win1.position.set(-2.5, 2, 3.05);
    group.add(win1);

    const win2 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1), glassMat(0xddcc99));
    win2.name = 'Window_Front_R';
    win2.position.set(2.5, 2, 3.05);
    group.add(win2);

    // Side windows
    for (let i = 0; i < 2; i++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.8), glassMat(0xddcc99));
        win.name = `Window_Side_${i}`;
        win.position.set(4.05, 2, -1.5 + i * 3);
        group.add(win);
    }

    return group;
}

// ============================================================
// PART ADDERS — Add individual parts to an existing house group
// ============================================================

export function addGarageToHouse(house) {
    const bbox = new THREE.Box3().setFromObject(house);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    const garageGroup = new THREE.Group();
    garageGroup.name = 'Garage_Addition';

    const garageWalls = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.5, 4), mat(0xe0e0e0));
    garageWalls.name = 'Garage';
    garageWalls.position.set(bbox.max.x + 2, 1.25, 0);
    garageGroup.add(garageWalls);

    const garageDoor = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2, 0.1), mat(0x555555));
    garageDoor.name = 'Garage_Door';
    garageDoor.position.set(bbox.max.x + 2, 1, 2.05);
    garageGroup.add(garageDoor);

    const garageRoof = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.2, 4.3), mat(0x444444));
    garageRoof.name = 'Garage_Roof';
    garageRoof.position.set(bbox.max.x + 2, 2.6, 0);
    garageGroup.add(garageRoof);

    house.add(garageGroup);
    return garageGroup;
}

export function addGardenToHouse(house) {
    const bbox = new THREE.Box3().setFromObject(house);

    const garden = new THREE.Mesh(
        new THREE.BoxGeometry(bbox.max.x - bbox.min.x + 4, 0.1, 3),
        new THREE.MeshStandardMaterial({ color: 0x44aa44, roughness: 0.9 })
    );
    garden.name = 'Garden';
    garden.position.set(0, 0.05, bbox.max.z + 2);
    house.add(garden);

    // Add small bushes
    for (let i = 0; i < 5; i++) {
        const bush = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x228822 })
        );
        bush.name = `Bush_${i}`;
        bush.position.set(bbox.min.x + 1 + i * ((bbox.max.x - bbox.min.x) / 5), 0.35, bbox.max.z + 2);
        house.add(bush);
    }

    return garden;
}

export function addPoolToHouse(house) {
    const bbox = new THREE.Box3().setFromObject(house);

    const poolWater = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.3, 2.5),
        new THREE.MeshStandardMaterial({ color: 0x4488cc, transparent: true, opacity: 0.7, roughness: 0.1 })
    );
    poolWater.name = 'Pool';
    poolWater.position.set(0, 0.15, bbox.max.z + 4.5);
    house.add(poolWater);

    // Pool edge
    const poolEdge = new THREE.Mesh(
        new THREE.BoxGeometry(4.4, 0.4, 2.9),
        new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 })
    );
    poolEdge.name = 'Pool_Edge';
    poolEdge.position.set(0, 0.05, bbox.max.z + 4.5);
    house.add(poolEdge);

    return poolWater;
}

export function addFenceToHouse(house) {
    const bbox = new THREE.Box3().setFromObject(house);
    const padding = 2;
    const fenceHeight = 1.2;
    const fenceThickness = 0.08;

    const minX = bbox.min.x - padding;
    const maxX = bbox.max.x + padding;
    const minZ = bbox.min.z - padding;
    const maxZ = bbox.max.z + padding;
    const width = maxX - minX;
    const depth = maxZ - minZ;
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;

    const fenceMat = mat(0x8b6914);

    // Front fence (with gap for gate)
    const fFrontL = new THREE.Mesh(new THREE.BoxGeometry((width / 2 - 1), fenceHeight, fenceThickness), fenceMat);
    fFrontL.name = 'Fence_Front_L';
    fFrontL.position.set(cx - (width / 4 + 0.5), fenceHeight / 2, maxZ);
    house.add(fFrontL);

    const fFrontR = new THREE.Mesh(new THREE.BoxGeometry((width / 2 - 1), fenceHeight, fenceThickness), fenceMat);
    fFrontR.name = 'Fence_Front_R';
    fFrontR.position.set(cx + (width / 4 + 0.5), fenceHeight / 2, maxZ);
    house.add(fFrontR);

    // Back fence
    const fBack = new THREE.Mesh(new THREE.BoxGeometry(width, fenceHeight, fenceThickness), fenceMat);
    fBack.name = 'Fence_Back';
    fBack.position.set(cx, fenceHeight / 2, minZ);
    house.add(fBack);

    // Side fences
    const fLeft = new THREE.Mesh(new THREE.BoxGeometry(fenceThickness, fenceHeight, depth), fenceMat);
    fLeft.name = 'Fence_Left';
    fLeft.position.set(minX, fenceHeight / 2, cz);
    house.add(fLeft);

    const fRight = new THREE.Mesh(new THREE.BoxGeometry(fenceThickness, fenceHeight, depth), fenceMat);
    fRight.name = 'Fence_Right';
    fRight.position.set(maxX, fenceHeight / 2, cz);
    house.add(fRight);

    return fFrontL; // return any reference
}

export function addDrivewayToHouse(house) {
    const bbox = new THREE.Box3().setFromObject(house);

    const driveway = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.05, 5),
        new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.8 })
    );
    driveway.name = 'Driveway';
    driveway.position.set(0, 0.025, bbox.max.z + 3.5);
    house.add(driveway);
    return driveway;
}

export function addJaaliScreenToHouse(house) {
    const bbox = new THREE.Box3().setFromObject(house);
    
    // Create a patterned texture using a canvas for the Jaali
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Background (transparent)
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 256, 256);
    
    // Pattern color
    ctx.fillStyle = '#d2b48c'; // Terracotta/wood tone
    
    // Draw a geometric pattern
    for(let x=0; x<256; x+=32) {
        for(let y=0; y<256; y+=32) {
            ctx.fillRect(x+4, y+4, 24, 24);
            ctx.clearRect(x+8, y+8, 16, 16);
            ctx.fillRect(x+12, y+12, 8, 8);
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 4);

    const jaaliMat = new THREE.MeshStandardMaterial({ 
        map: texture,
        transparent: true,
        alphaTest: 0.5,
        color: 0xffffff,
        side: THREE.DoubleSide
    });

    const jaali = new THREE.Mesh(new THREE.PlaneGeometry(2, 4), jaaliMat);
    jaali.name = 'Jaali_Screen';
    // Position on the side of the house, roughly
    jaali.position.set(bbox.max.x + 0.1, 2, 0);
    jaali.rotation.y = Math.PI / 2;
    house.add(jaali);
    
    return jaali;
}

// ── Template registry for easy lookup ────────────────────────
export const HOUSE_TEMPLATES = {
    'simple':      createGLKHouse,
    'house':       createGLKHouse,
    '2bhk':        create2BHKHouse,
    'villa':       createVilla,
    'modern':      createModernHouse,
    'traditional': createTraditionalHouse,
};
