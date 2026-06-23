import * as THREE from 'three';

// Helper to create & position a mesh
const addBlock = (registry, type, name, colorHex, w, h, d, px, py, pz) => {
    let mesh;
    if (type === 'cube') mesh = registry.addCube();
    else if (type === 'cylinder') mesh = registry.addCylinder();
    else if (type === 'sphere') mesh = registry.addSphere();
    else if (type === 'plane') mesh = registry.addPlane();

    mesh.name = name;
    mesh.material.color.setHex(colorHex);
    mesh.scale.set(w, h, d);
    
    // Plane needs rotation reset since addPlane defaults to lying flat
    if (type === 'plane') {
        mesh.position.set(px, py, pz);
    } else {
        // For 3D primitives, y position is relative to their height to sit on ground
        mesh.position.set(px, py + (h/2), pz);
    }
    
    return mesh;
};

// Helper to add windows to a building face
const addWindowsHelper = (registry, baseName, parentMesh, rows, cols, zOffset, isSide = false) => {
    const w = parentMesh.scale.x;
    const h = parentMesh.scale.y;
    
    const winW = isSide ? 0.6 : (w * 0.8) / cols;
    const winH = (h * 0.6) / rows;
    const winColor = 0x1e293b; // Dark blue/slate for glass
    
    const startX = parentMesh.position.x - (w/2) + (w/(cols*2));
    const startY = parentMesh.position.y - (h/2) + (h/(rows*2));
    
    const windows = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let px = parentMesh.position.x;
            let pz = parentMesh.position.z;
            
            if (isSide) {
                pz = parentMesh.position.z - (parentMesh.scale.z/2) + (parentMesh.scale.z/(cols*2)) + c * (parentMesh.scale.z/cols);
                px += zOffset; // Attach to side face
            } else {
                px = startX + c * (w/cols);
                pz += zOffset; // Attach to front face
            }
            
            const py = startY + r * (h/rows) + 0.3; // Slight lift
            
            let winMesh;
            if (isSide) {
                winMesh = addBlock(registry, 'cube', `${baseName} Window ${r}-${c}`, winColor, 0.1, winH, winW, px, py - (winH/2), pz);
            } else {
                winMesh = addBlock(registry, 'cube', `${baseName} Window ${r}-${c}`, winColor, winW, winH, 0.1, px, py - (winH/2), pz);
            }
            windows.push(winMesh);
        }
    }
    return windows;
};

export function addGround(app) {
    return addBlock(app.objectRegistry, 'plane', 'Ground Base', 0xd1d5db, 30, 30, 1, 0, 0, 0);
}

export function addField(app) {
    return addBlock(app.objectRegistry, 'plane', 'Central Field', 0x4ade80, 15, 12, 1, 0, 0.01, 2);
}

export function addMainBuilding(app) {
    const color = 0xffffff;
    const left = addBlock(app.objectRegistry, 'cube', 'Main Left', color, 5, 3, 4, -4.5, 0, -6);
    const right = addBlock(app.objectRegistry, 'cube', 'Main Right', color, 5, 3, 4, 4.5, 0, -6);
    const recess = addBlock(app.objectRegistry, 'cube', 'Entrance Recess', 0x1e293b, 4, 2, 0.5, 0, 0, -7.75);
    return { left, right, recess };
}

export function addMainBuildingTower(app) {
    return addBlock(app.objectRegistry, 'cube', 'Main Top', 0xffffff, 4, 1, 4, 0, 2, -6);
}

export function addLeftBlock(app) {
    return addBlock(app.objectRegistry, 'cube', 'Left Science Block', 0xf8fafc, 4, 2.5, 10, -9, 0, 1);
}

export function addRightWing(app) {
    return addBlock(app.objectRegistry, 'cube', 'Right Arts Block', 0xf8fafc, 4, 2.5, 10, 9, 0, 1);
}

export function addWindowRows(app, refs) {
    const winL = addWindowsHelper(app.objectRegistry, 'MainL', refs.main.left, 2, 3, 2.05, false);
    const winR = addWindowsHelper(app.objectRegistry, 'MainR', refs.main.right, 2, 3, 2.05, false);
    const winLeftWing = addWindowsHelper(app.objectRegistry, 'Left Wing', refs.leftWing, 2, 6, 2.05, true); 
    const winRightWing = addWindowsHelper(app.objectRegistry, 'Right Wing', refs.rightWing, 2, 6, -2.05, true); 
    return [...winL, ...winR, ...winLeftWing, ...winRightWing];
}

export function addWalls(app) {
    const left = addBlock(app.objectRegistry, 'cube', 'Boundary Wall West', 0x94a3b8, 12, 1.5, 0.5, -6, 0, 10);
    const right = addBlock(app.objectRegistry, 'cube', 'Boundary Wall East', 0x94a3b8, 12, 1.5, 0.5, 6, 0, 10);
    return { left, right };
}

export function addGate(app) {
    const pillarL = addBlock(app.objectRegistry, 'cube', 'Gate Pillar Left', 0x475569, 0.8, 2, 0.8, -1.5, 0, 10);
    const pillarR = addBlock(app.objectRegistry, 'cube', 'Gate Pillar Right', 0x475569, 0.8, 2, 0.8, 1.5, 0, 10);
    const beam = addBlock(app.objectRegistry, 'cube', 'Gate Arch', 0x475569, 3.8, 0.4, 0.8, 0, 2, 10);
    return [pillarL, pillarR, beam];
}

export function addDriveway(app) {
    return addBlock(app.objectRegistry, 'plane', 'Driveway', 0x64748b, 4, 3, 1, 0, 0.02, 11.5);
}

export function addBus(app, index, x, z) {
    return addBlock(app.objectRegistry, 'cube', `School Bus ${index}`, 0xfacc15, 1.5, 1.2, 3.5, x, 0, z);
}

export function addTree(app, index, x, z) {
    const trunk = addBlock(app.objectRegistry, 'cylinder', `Tree ${index} Trunk`, 0x78350f, 0.4, 0.8, 0.4, x, 0, z);
    const leaves = addBlock(app.objectRegistry, 'sphere', `Tree ${index} Leaves`, 0x22c55e, 1.2, 1.2, 1.2, x, 0.8, z);
    return { trunk, leaves };
}

export function addFrontTrees(app) {
    const positions = [[-12, 4], [-12, 0], [-12, -4], [12, 4], [12, 0], [12, -4]];
    return positions.map((p, i) => addTree(app, `Front-${i}`, p[0], p[1]));
}

export function addInnerTrees(app) {
    const positions = [[-8, -8], [8, -8], [-6, 4], [6, 4]];
    return positions.map((p, i) => addTree(app, `Inner-${i}`, p[0], p[1]));
}

// Re-export the aggregate builder for the instant "Load Template" functionality
export function buildSchoolCampus(app) {
    const refs = {};
    refs.ground = addGround(app);
    refs.field = addField(app);
    refs.main = addMainBuilding(app);
    refs.mainTower = addMainBuildingTower(app);
    refs.leftWing = addLeftBlock(app);
    refs.rightWing = addRightWing(app);
    refs.windows = addWindowRows(app, refs);
    refs.walls = addWalls(app);
    refs.gate = addGate(app);
    refs.driveway = addDriveway(app);
    refs.buses = [
        addBus(app, 1, -4, 6),
        addBus(app, 2, -1, 6),
        addBus(app, 3, 2, 6),
        addBus(app, 4, 5, 6)
    ];
    refs.frontTrees = addFrontTrees(app);
    refs.innerTrees = addInnerTrees(app);
    return refs;
}
