// ============================================================
// community-layout.js — Gated community grid, house rows, amenities
// ============================================================
import * as THREE from 'three';
import { HOUSE_TEMPLATES } from './house-templates.js';

// ── Helper material ──────────────────────────────────────────
function mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1, ...opts });
}

// ── Create the community base grid ──────────────────────────
export function createCommunityGrid(THREE_ref, rows = 4, cols = 4, spacing = 20) {
    const group = new THREE.Group();
    group.name = 'Community Layout';

    // Large ground plane
    const totalW = cols * spacing + 10;
    const totalD = rows * spacing + 10;
    const ground = new THREE.Mesh(
        new THREE.BoxGeometry(totalW, 0.1, totalD),
        new THREE.MeshStandardMaterial({ color: 0x88aa66, roughness: 0.9 })
    );
    ground.name = 'Community_Ground';
    ground.position.set((cols - 1) * spacing / 2, 0, (rows - 1) * spacing / 2);
    group.add(ground);

    // Plot markers
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const plot = new THREE.Mesh(
                new THREE.BoxGeometry(spacing - 2, 0.12, spacing - 2),
                new THREE.MeshStandardMaterial({
                    color: 0xaabb88,
                    transparent: true,
                    opacity: 0.35,
                })
            );
            plot.name = `Plot_${r}_${c}`;
            plot.position.set(c * spacing, 0.06, r * spacing);
            group.add(plot);
        }
    }

    return group;
}

// ── Place a row of houses ────────────────────────────────────
export function addHouseRow(scene, count = 5, templateName = 'simple', spacing = 18) {
    const templateFn = HOUSE_TEMPLATES[templateName] || HOUSE_TEMPLATES['simple'];
    const houses = [];

    const startX = -((count - 1) * spacing) / 2;

    for (let i = 0; i < count; i++) {
        const house = templateFn(THREE);
        house.name = `${house.name}_${i + 1}`;
        house.position.set(startX + i * spacing, 0, 0);
        scene.add(house);
        houses.push(house);
    }

    return houses;
}

// ── Amenity creators ─────────────────────────────────────────

export function createMainGate(THREE_ref) {
    const group = new THREE.Group();
    group.name = 'Main Gate';

    // Pillars
    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4, 0.8), mat(0xcccccc));
    pillarL.name = 'Gate_Pillar_L';
    pillarL.position.set(-3, 2, 0);
    group.add(pillarL);

    const pillarR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4, 0.8), mat(0xcccccc));
    pillarR.name = 'Gate_Pillar_R';
    pillarR.position.set(3, 2, 0);
    group.add(pillarR);

    // Arch
    const arch = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.6, 1), mat(0xaaaaaa));
    arch.name = 'Gate_Arch';
    arch.position.set(0, 4.3, 0);
    group.add(arch);

    // Gate bars
    const gate = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 3, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 })
    );
    gate.name = 'Gate_Bars';
    gate.position.set(0, 1.5, 0);
    group.add(gate);

    // Sign
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 0.1), mat(0x1a3a6a));
    sign.name = 'Gate_Sign';
    sign.position.set(0, 4.8, 0.5);
    group.add(sign);

    return group;
}

export function createRoadSegment(THREE_ref, length = 20, orientation = 'horizontal') {
    const group = new THREE.Group();
    group.name = 'Road';

    const w = orientation === 'horizontal' ? length : 3;
    const d = orientation === 'horizontal' ? 3 : length;

    const road = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), mat(0x444444));
    road.name = 'Road_Surface';
    road.position.set(0, 0.04, 0);
    group.add(road);

    // Center line
    const lineW = orientation === 'horizontal' ? length - 1 : 0.1;
    const lineD = orientation === 'horizontal' ? 0.1 : length - 1;
    const line = new THREE.Mesh(new THREE.BoxGeometry(lineW, 0.09, lineD), mat(0xffff44));
    line.name = 'Road_CenterLine';
    line.position.set(0, 0.045, 0);
    group.add(line);

    return group;
}

export function createPark(THREE_ref) {
    const group = new THREE.Group();
    group.name = 'Central Park';

    // Grass area
    const grass = new THREE.Mesh(new THREE.BoxGeometry(12, 0.1, 10), mat(0x44aa44));
    grass.name = 'Park_Grass';
    grass.position.set(0, 0.05, 0);
    group.add(grass);

    // Path
    const path = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.11, 10), mat(0xccbb99));
    path.name = 'Park_Path';
    path.position.set(0, 0.06, 0);
    group.add(path);

    // Trees
    for (let i = 0; i < 6; i++) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.5, 6), mat(0x6b3a1a));
        trunk.name = `Tree_Trunk_${i}`;
        const angle = (i / 6) * Math.PI * 2;
        trunk.position.set(Math.cos(angle) * 4, 0.75, Math.sin(angle) * 3.5);
        group.add(trunk);

        const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), mat(0x228822));
        canopy.name = `Tree_Canopy_${i}`;
        canopy.position.set(Math.cos(angle) * 4, 2, Math.sin(angle) * 3.5);
        group.add(canopy);
    }

    // Bench
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 0.5), mat(0x8b6914));
    bench.name = 'Park_Bench';
    bench.position.set(2, 0.2, 0);
    group.add(bench);

    return group;
}

export function createClubhouse(THREE_ref) {
    const group = new THREE.Group();
    group.name = 'Clubhouse';

    const walls = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 8), mat(0xe8e0d0));
    walls.name = 'Clubhouse_Walls';
    walls.position.set(0, 2, 0);
    group.add(walls);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 9), mat(0x4a3520));
    roof.name = 'Clubhouse_Roof';
    roof.position.set(0, 4.15, 0);
    group.add(roof);

    // Large windows
    for (let i = 0; i < 3; i++) {
        const win = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2.5, 0.1),
            new THREE.MeshStandardMaterial({ color: 0x88bbdd, transparent: true, opacity: 0.5 })
        );
        win.name = `Clubhouse_Window_${i}`;
        win.position.set(-3.5 + i * 3.5, 2.2, 4.05);
        group.add(win);
    }

    const door = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 0.1), mat(0x333333));
    door.name = 'Clubhouse_Door';
    door.position.set(0, 1.5, 4.05);
    group.add(door);

    return group;
}

export function createParkingArea(THREE_ref) {
    const group = new THREE.Group();
    group.name = 'Parking Area';

    const surface = new THREE.Mesh(new THREE.BoxGeometry(12, 0.08, 8), mat(0x555555));
    surface.name = 'Parking_Surface';
    surface.position.set(0, 0.04, 0);
    group.add(surface);

    // Parking lines
    for (let i = 0; i < 6; i++) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.085, 2.5), mat(0xffffff));
        line.name = `Parking_Line_${i}`;
        line.position.set(-5 + i * 2, 0.043, -1.5);
        group.add(line);
    }

    return group;
}

export function createPlayArea(THREE_ref) {
    const group = new THREE.Group();
    group.name = 'Play Area';

    // Sand area
    const sand = new THREE.Mesh(new THREE.BoxGeometry(8, 0.1, 6), mat(0xe0cc88));
    sand.name = 'Play_Sand';
    sand.position.set(0, 0.05, 0);
    group.add(sand);

    // Slide
    const slidePlatform = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), mat(0xcc4444));
    slidePlatform.name = 'Slide_Platform';
    slidePlatform.position.set(-2, 1, 0);
    group.add(slidePlatform);

    const slideRamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 3), mat(0xcccc44));
    slideRamp.name = 'Slide_Ramp';
    slideRamp.position.set(-2, 1, 2);
    slideRamp.rotation.x = Math.PI / 6;
    group.add(slideRamp);

    // Swings frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 0.1), mat(0x4444cc));
    frame.name = 'Swing_Frame';
    frame.position.set(2, 1.25, 0);
    group.add(frame);

    return group;
}

// ── Amenity factory ──────────────────────────────────────────
export const AMENITY_CREATORS = {
    'gate':       createMainGate,
    'main gate':  createMainGate,
    'road':       createRoadSegment,
    'park':       createPark,
    'clubhouse':  createClubhouse,
    'parking':    createParkingArea,
    'play area':  createPlayArea,
};
