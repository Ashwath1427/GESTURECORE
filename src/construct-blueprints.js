export const BLUEPRINTS = {
    rocket: {
        name: 'Rocket',
        parts: [
            { name: 'Engine Base', shape: 'cylinder', position: {x:0, y:0.25, z:0}, scale: {x:1.2, y:0.5, z:1.2}, rotation: {x:0, y:0, z:0}, color: '#555555', pauseAfter: 400 },
            { name: 'Rocket Body', shape: 'cylinder', position: {x:0, y:2.5, z:0}, scale: {x:1, y:4, z:1}, rotation: {x:0, y:0, z:0}, color: '#dddddd', pauseAfter: 400 },
            { name: 'Left Fin', shape: 'wedge', position: {x:-1.5, y:1, z:0}, scale: {x:0.5, y:1.5, z:0.2}, rotation: {x:0, y:0, z:Math.PI/4}, color: '#ff4444', pauseAfter: 300 },
            { name: 'Right Fin', shape: 'wedge', position: {x:1.5, y:1, z:0}, scale: {x:0.5, y:1.5, z:0.2}, rotation: {x:0, y:Math.PI, z:Math.PI/4}, color: '#ff4444', pauseAfter: 300 },
            { name: 'Front Fin', shape: 'wedge', position: {x:0, y:1, z:1.5}, scale: {x:0.2, y:1.5, z:0.5}, rotation: {x:-Math.PI/4, y:0, z:0}, color: '#ff4444', pauseAfter: 300 },
            { name: 'Nose Cone', shape: 'cone', position: {x:0, y:5.5, z:0}, scale: {x:1, y:2, z:1}, rotation: {x:0, y:0, z:0}, color: '#ff4444', pauseAfter: 500 }
        ]
    },
    house: {
        name: 'House',
        parts: [
            { name: 'Foundation', shape: 'cube', position: {x:0, y:0.25, z:0}, scale: {x:6, y:0.5, z:4}, rotation: {x:0, y:0, z:0}, color: '#888888', pauseAfter: 400 },
            { name: 'Main Body', shape: 'cube', position: {x:0, y:2, z:0}, scale: {x:5, y:3, z:3}, rotation: {x:0, y:0, z:0}, color: '#e6ccb2', pauseAfter: 400 },
            { name: 'Roof', shape: 'pyramid', position: {x:0, y:4.5, z:0}, scale: {x:3, y:2, z:3}, rotation: {x:0, y:Math.PI/4, z:0}, color: '#9b2226', pauseAfter: 400 },
            { name: 'Door', shape: 'cube', position: {x:0, y:1.25, z:1.55}, scale: {x:0.8, y:2, z:0.1}, rotation: {x:0, y:0, z:0}, color: '#5c4033', pauseAfter: 300 },
            { name: 'Window Left', shape: 'plane', position: {x:-1.5, y:2, z:1.55}, scale: {x:0.5, y:0.5, z:1}, rotation: {x:Math.PI/2, y:0, z:0}, color: '#a8dadc', pauseAfter: 200 },
            { name: 'Window Right', shape: 'plane', position: {x:1.5, y:2, z:1.55}, scale: {x:0.5, y:0.5, z:1}, rotation: {x:Math.PI/2, y:0, z:0}, color: '#a8dadc', pauseAfter: 300 }
        ]
    },
    car: {
        name: 'Car',
        parts: [
            { name: 'Chassis', shape: 'cube', position: {x:0, y:0.7, z:0}, scale: {x:4, y:0.6, z:2}, rotation: {x:0, y:0, z:0}, color: '#222222', pauseAfter: 300 },
            { name: 'Wheel FL', shape: 'cylinder', position: {x:-1.5, y:0.5, z:1}, scale: {x:0.8, y:0.3, z:0.8}, rotation: {x:Math.PI/2, y:0, z:0}, color: '#111111', pauseAfter: 200 },
            { name: 'Wheel FR', shape: 'cylinder', position: {x:1.5, y:0.5, z:1}, scale: {x:0.8, y:0.3, z:0.8}, rotation: {x:Math.PI/2, y:0, z:0}, color: '#111111', pauseAfter: 200 },
            { name: 'Wheel BL', shape: 'cylinder', position: {x:-1.5, y:0.5, z:-1}, scale: {x:0.8, y:0.3, z:0.8}, rotation: {x:Math.PI/2, y:0, z:0}, color: '#111111', pauseAfter: 200 },
            { name: 'Wheel BR', shape: 'cylinder', position: {x:1.5, y:0.5, z:-1}, scale: {x:0.8, y:0.3, z:0.8}, rotation: {x:Math.PI/2, y:0, z:0}, color: '#111111', pauseAfter: 300 },
            { name: 'Car Body', shape: 'cube', position: {x:0, y:1.3, z:0}, scale: {x:3.8, y:0.8, z:1.8}, rotation: {x:0, y:0, z:0}, color: '#005f73', pauseAfter: 400 },
            { name: 'Cabin', shape: 'cube', position: {x:-0.2, y:2, z:0}, scale: {x:2, y:0.8, z:1.6}, rotation: {x:0, y:0, z:0}, color: '#94d2bd', pauseAfter: 300 }
        ]
    },
    airplane: {
        name: 'Airplane',
        parts: [
            { name: 'Fuselage', shape: 'capsule', position: {x:0, y:2, z:0}, scale: {x:1, y:4, z:1}, rotation: {x:0, y:0, z:Math.PI/2}, color: '#ffffff', pauseAfter: 400 },
            { name: 'Left Wing', shape: 'cube', position: {x:0, y:2, z:1.5}, scale: {x:1.5, y:0.1, z:4}, rotation: {x:0, y:0, z:0}, color: '#eeeeee', pauseAfter: 300 },
            { name: 'Right Wing', shape: 'cube', position: {x:0, y:2, z:-1.5}, scale: {x:1.5, y:0.1, z:4}, rotation: {x:0, y:0, z:0}, color: '#eeeeee', pauseAfter: 300 },
            { name: 'Tail Fin', shape: 'wedge', position: {x:-2.5, y:2.8, z:0}, scale: {x:1, y:1, z:0.1}, rotation: {x:0, y:0, z:0}, color: '#ff0000', pauseAfter: 300 },
            { name: 'Left Stab', shape: 'cube', position: {x:-2.5, y:2, z:0.8}, scale: {x:0.8, y:0.1, z:1.5}, rotation: {x:0, y:0, z:0}, color: '#eeeeee', pauseAfter: 200 },
            { name: 'Right Stab', shape: 'cube', position: {x:-2.5, y:2, z:-0.8}, scale: {x:0.8, y:0.1, z:1.5}, rotation: {x:0, y:0, z:0}, color: '#eeeeee', pauseAfter: 200 },
            { name: 'Cockpit', shape: 'sphere', position: {x:2, y:2.3, z:0}, scale: {x:0.8, y:0.5, z:0.6}, rotation: {x:0, y:0, z:0}, color: '#a8dadc', pauseAfter: 300 }
        ]
    },
    tower: {
        name: 'Tower',
        parts: [
            { name: 'Base Tier', shape: 'cube', position: {x:0, y:1, z:0}, scale: {x:3, y:2, z:3}, rotation: {x:0, y:0, z:0}, color: '#4a4e69', pauseAfter: 300 },
            { name: 'Second Tier', shape: 'cube', position: {x:0, y:3, z:0}, scale: {x:2.5, y:2, z:2.5}, rotation: {x:0, y:0, z:0}, color: '#9a8c98', pauseAfter: 300 },
            { name: 'Third Tier', shape: 'cube', position: {x:0, y:5, z:0}, scale: {x:2, y:2, z:2}, rotation: {x:0, y:0, z:0}, color: '#c9ada7', pauseAfter: 300 },
            { name: 'Observation Deck', shape: 'cylinder', position: {x:0, y:6.5, z:0}, scale: {x:3, y:1, z:3}, rotation: {x:0, y:0, z:0}, color: '#f2e9e4', pauseAfter: 300 },
            { name: 'Upper Tier', shape: 'cube', position: {x:0, y:8, z:0}, scale: {x:1.5, y:2, z:1.5}, rotation: {x:0, y:0, z:0}, color: '#9a8c98', pauseAfter: 300 },
            { name: 'Spire', shape: 'cone', position: {x:0, y:10, z:0}, scale: {x:1, y:2, z:1}, rotation: {x:0, y:0, z:0}, color: '#4a4e69', pauseAfter: 400 }
        ]
    },
    robot: {
        name: 'Robot',
        parts: [
            { name: 'Left Leg', shape: 'cylinder', position: {x:-0.8, y:1, z:0}, scale: {x:0.5, y:2, z:0.5}, rotation: {x:0, y:0, z:0}, color: '#777777', pauseAfter: 200 },
            { name: 'Right Leg', shape: 'cylinder', position: {x:0.8, y:1, z:0}, scale: {x:0.5, y:2, z:0.5}, rotation: {x:0, y:0, z:0}, color: '#777777', pauseAfter: 200 },
            { name: 'Torso', shape: 'cube', position: {x:0, y:3, z:0}, scale: {x:2.5, y:2.5, z:1.5}, rotation: {x:0, y:0, z:0}, color: '#ffb703', pauseAfter: 300 },
            { name: 'Left Arm', shape: 'cylinder', position: {x:-1.8, y:3, z:0}, scale: {x:0.4, y:2, z:0.4}, rotation: {x:0, y:0, z:Math.PI/6}, color: '#777777', pauseAfter: 200 },
            { name: 'Right Arm', shape: 'cylinder', position: {x:1.8, y:3, z:0}, scale: {x:0.4, y:2, z:0.4}, rotation: {x:0, y:0, z:-Math.PI/6}, color: '#777777', pauseAfter: 200 },
            { name: 'Head', shape: 'cube', position: {x:0, y:5, z:0}, scale: {x:1.5, y:1.5, z:1.5}, rotation: {x:0, y:0, z:0}, color: '#023047', pauseAfter: 300 },
            { name: 'Left Eye', shape: 'sphere', position: {x:-0.3, y:5.2, z:0.8}, scale: {x:0.2, y:0.2, z:0.2}, rotation: {x:0, y:0, z:0}, color: '#fb8500', pauseAfter: 100 },
            { name: 'Right Eye', shape: 'sphere', position: {x:0.3, y:5.2, z:0.8}, scale: {x:0.2, y:0.2, z:0.2}, rotation: {x:0, y:0, z:0}, color: '#fb8500', pauseAfter: 200 },
            { name: 'Antenna', shape: 'capsule', position: {x:0, y:6.2, z:0}, scale: {x:0.1, y:1, z:0.1}, rotation: {x:0, y:0, z:0}, color: '#8ecae6', pauseAfter: 300 }
        ]
    },
    bridge: {
        name: 'Bridge',
        parts: [
            { name: 'Left Pillar Base', shape: 'cube', position: {x:-3, y:1, z:0}, scale: {x:1, y:2, z:2}, rotation: {x:0, y:0, z:0}, color: '#555555', pauseAfter: 200 },
            { name: 'Right Pillar Base', shape: 'cube', position: {x:3, y:1, z:0}, scale: {x:1, y:2, z:2}, rotation: {x:0, y:0, z:0}, color: '#555555', pauseAfter: 200 },
            { name: 'Left Pillar Top', shape: 'cube', position: {x:-3, y:3.5, z:0}, scale: {x:0.8, y:3, z:1.8}, rotation: {x:0, y:0, z:0}, color: '#666666', pauseAfter: 200 },
            { name: 'Right Pillar Top', shape: 'cube', position: {x:3, y:3.5, z:0}, scale: {x:0.8, y:3, z:1.8}, rotation: {x:0, y:0, z:0}, color: '#666666', pauseAfter: 200 },
            { name: 'Main Deck', shape: 'cube', position: {x:0, y:2.5, z:0}, scale: {x:10, y:0.4, z:2}, rotation: {x:0, y:0, z:0}, color: '#333333', pauseAfter: 300 },
            { name: 'Left Cable', shape: 'cylinder', position: {x:-1.5, y:3.8, z:0}, scale: {x:0.1, y:3, z:0.1}, rotation: {x:0, y:0, z:Math.PI/3}, color: '#999999', pauseAfter: 100 },
            { name: 'Right Cable', shape: 'cylinder', position: {x:1.5, y:3.8, z:0}, scale: {x:0.1, y:3, z:0.1}, rotation: {x:0, y:0, z:-Math.PI/3}, color: '#999999', pauseAfter: 100 },
            { name: 'Far Left Cable', shape: 'cylinder', position: {x:-4, y:3.8, z:0}, scale: {x:0.1, y:3, z:0.1}, rotation: {x:0, y:0, z:-Math.PI/3}, color: '#999999', pauseAfter: 100 },
            { name: 'Far Right Cable', shape: 'cylinder', position: {x:4, y:3.8, z:0}, scale: {x:0.1, y:3, z:0.1}, rotation: {x:0, y:0, z:Math.PI/3}, color: '#999999', pauseAfter: 300 }
        ]
    },
    trophy: {
        name: 'Trophy',
        parts: [
            { name: 'Base Plate', shape: 'cube', position: {x:0, y:0.5, z:0}, scale: {x:3, y:1, z:3}, rotation: {x:0, y:0, z:0}, color: '#1a1a1a', pauseAfter: 300 },
            { name: 'Pedestal', shape: 'cylinder', position: {x:0, y:2, z:0}, scale: {x:1.5, y:2, z:1.5}, rotation: {x:0, y:0, z:0}, color: '#e6c229', pauseAfter: 300 },
            { name: 'Cup Bottom', shape: 'sphere', position: {x:0, y:3.5, z:0}, scale: {x:2, y:1, z:2}, rotation: {x:0, y:0, z:0}, color: '#f1c40f', pauseAfter: 300 },
            { name: 'Cup Top', shape: 'cylinder', position: {x:0, y:4.5, z:0}, scale: {x:2, y:1.5, z:2}, rotation: {x:0, y:0, z:0}, color: '#f1c40f', pauseAfter: 300 },
            { name: 'Left Handle', shape: 'ring', position: {x:-2, y:4, z:0}, scale: {x:1, y:1, z:1}, rotation: {x:0, y:0, z:Math.PI/2}, color: '#f1c40f', pauseAfter: 200 },
            { name: 'Right Handle', shape: 'ring', position: {x:2, y:4, z:0}, scale: {x:1, y:1, z:1}, rotation: {x:0, y:0, z:Math.PI/2}, color: '#f1c40f', pauseAfter: 300 }
        ]
    },
    ufo: {
        name: 'UFO',
        parts: [
            { name: 'Abduction Beam', shape: 'cylinder', position: {x:0, y:2, z:0}, scale: {x:1.5, y:4, z:1.5}, rotation: {x:0, y:0, z:0}, color: '#00ffcc', pauseAfter: 300 },
            { name: 'Saucer Hull', shape: 'disc', position: {x:0, y:4.5, z:0}, scale: {x:4, y:2, z:4}, rotation: {x:0, y:0, z:0}, color: '#a0a0a0', pauseAfter: 300 },
            { name: 'Cockpit Dome', shape: 'sphere', position: {x:0, y:5, z:0}, scale: {x:1.5, y:1, z:1.5}, rotation: {x:0, y:0, z:0}, color: '#48cae4', pauseAfter: 300 },
            { name: 'Light N', shape: 'sphere', position: {x:0, y:4.5, z:-3.5}, scale: {x:0.3, y:0.3, z:0.3}, rotation: {x:0, y:0, z:0}, color: '#ff0054', pauseAfter: 150 },
            { name: 'Light S', shape: 'sphere', position: {x:0, y:4.5, z:3.5}, scale: {x:0.3, y:0.3, z:0.3}, rotation: {x:0, y:0, z:0}, color: '#ff0054', pauseAfter: 150 },
            { name: 'Light E', shape: 'sphere', position: {x:3.5, y:4.5, z:0}, scale: {x:0.3, y:0.3, z:0.3}, rotation: {x:0, y:0, z:0}, color: '#ff0054', pauseAfter: 150 },
            { name: 'Light W', shape: 'sphere', position: {x:-3.5, y:4.5, z:0}, scale: {x:0.3, y:0.3, z:0.3}, rotation: {x:0, y:0, z:0}, color: '#ff0054', pauseAfter: 200 }
        ]
    },
    tree: {
        name: 'Tree',
        parts: [
            { name: 'Trunk', shape: 'cylinder', position: {x:0, y:1.5, z:0}, scale: {x:0.8, y:3, z:0.8}, rotation: {x:0, y:0, z:0}, color: '#5c4033', pauseAfter: 300 },
            { name: 'Lower Canopy', shape: 'cone', position: {x:0, y:3.5, z:0}, scale: {x:3, y:2.5, z:3}, rotation: {x:0, y:0, z:0}, color: '#2d6a4f', pauseAfter: 300 },
            { name: 'Middle Canopy', shape: 'cone', position: {x:0, y:5.5, z:0}, scale: {x:2.2, y:2.5, z:2.2}, rotation: {x:0, y:0, z:0}, color: '#40916c', pauseAfter: 300 },
            { name: 'Top Canopy', shape: 'cone', position: {x:0, y:7.5, z:0}, scale: {x:1.5, y:2, z:1.5}, rotation: {x:0, y:0, z:0}, color: '#52b788', pauseAfter: 300 }
        ]
    },
    gate: {
        name: 'Gate',
        parts: [
            { name: 'Left Pillar', shape: 'cube', position: {x:-3, y:3, z:0}, scale: {x:1.5, y:6, z:1.5}, rotation: {x:0, y:0, z:0}, color: '#6c757d', pauseAfter: 200 },
            { name: 'Right Pillar', shape: 'cube', position: {x:3, y:3, z:0}, scale: {x:1.5, y:6, z:1.5}, rotation: {x:0, y:0, z:0}, color: '#6c757d', pauseAfter: 200 },
            { name: 'Left Pillar Cap', shape: 'pyramid', position: {x:-3, y:6.5, z:0}, scale: {x:1, y:1, z:1}, rotation: {x:0, y:0, z:0}, color: '#495057', pauseAfter: 150 },
            { name: 'Right Pillar Cap', shape: 'pyramid', position: {x:3, y:6.5, z:0}, scale: {x:1, y:1, z:1}, rotation: {x:0, y:0, z:0}, color: '#495057', pauseAfter: 150 },
            { name: 'Top Arch Base', shape: 'cube', position: {x:0, y:5, z:0}, scale: {x:5, y:0.5, z:1}, rotation: {x:0, y:0, z:0}, color: '#343a40', pauseAfter: 200 },
            { name: 'Top Arch Arc', shape: 'torus', position: {x:0, y:5, z:0}, scale: {x:2, y:2, z:1}, rotation: {x:0, y:0, z:0}, color: '#343a40', pauseAfter: 300 },
            { name: 'Left Door Frame', shape: 'cube', position: {x:-1.5, y:2.5, z:0}, scale: {x:1.4, y:5, z:0.2}, rotation: {x:0, y:0, z:0}, color: '#b08d6a', pauseAfter: 200 },
            { name: 'Right Door Frame', shape: 'cube', position: {x:1.5, y:2.5, z:0}, scale: {x:1.4, y:5, z:0.2}, rotation: {x:0, y:0, z:0}, color: '#b08d6a', pauseAfter: 200 },
            { name: 'Left Door Handle', shape: 'sphere', position: {x:-0.5, y:2.5, z:0.2}, scale: {x:0.2, y:0.2, z:0.2}, rotation: {x:0, y:0, z:0}, color: '#ffd166', pauseAfter: 100 },
            { name: 'Right Door Handle', shape: 'sphere', position: {x:0.5, y:2.5, z:0.2}, scale: {x:0.2, y:0.2, z:0.2}, rotation: {x:0, y:0, z:0}, color: '#ffd166', pauseAfter: 100 }
        ]
    },
    pyramid: {
        name: 'Great Pyramid',
        parts: [
            { name: 'Base Layer', shape: 'cube', position: {x:0, y:1, z:0}, scale: {x:8, y:2, z:8}, rotation: {x:0, y:0, z:0}, color: '#e9c46a', pauseAfter: 400 },
            { name: 'Middle Layer', shape: 'cube', position: {x:0, y:3, z:0}, scale: {x:5, y:2, z:5}, rotation: {x:0, y:0, z:0}, color: '#f4a261', pauseAfter: 400 },
            { name: 'Top Pyramid', shape: 'pyramid', position: {x:0, y:5.5, z:0}, scale: {x:2.5, y:3, z:2.5}, rotation: {x:0, y:0, z:0}, color: '#e76f51', pauseAfter: 400 }
        ]
    }
};
