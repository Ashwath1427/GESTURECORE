// ============================================================
// ai-suggestions.js — Smart code-based design suggestion engine
// Analyzes the actual objects on the grid and gives contextual
// design suggestions. No API needed — pure code intelligence.
// ============================================================
import { getPartColor, hasPart, applyColorToHousePart } from './style-presets.js';
import { addGardenToHouse, addFenceToHouse, addDrivewayToHouse, addPoolToHouse, addJaaliScreenToHouse } from './house-templates.js';

// ── Color Utilities ──────────────────────────────────────────
function hexToHSL(hex) {
    if (!hex || hex.length < 7) return { h: 0, s: 0, l: 0 };
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function getColorName(hex) {
    if (!hex) return 'unknown';
    const { h, s, l } = hexToHSL(hex);
    if (l < 15) return 'black';
    if (l > 85 && s < 20) return 'white';
    if (s < 15) return l > 50 ? 'light grey' : 'dark grey';
    if (h < 15 || h > 345) return 'red';
    if (h < 45) return 'orange';
    if (h < 70) return 'yellow';
    if (h < 160) return 'green';
    if (h < 200) return 'cyan';
    if (h < 260) return 'blue';
    if (h < 300) return 'purple';
    return 'pink';
}

function isColorWarm(hex) {
    const { h } = hexToHSL(hex);
    return h < 60 || h > 300;
}

// ── Scene Analysis ───────────────────────────────────────────
function analyzeScene() {
    if (!window.app || !window.app.objectRegistry) return null;
    
    const objects = window.app.objectRegistry.objects;
    if (!objects || objects.length === 0) return null;
    
    const analysis = {
        totalObjects: objects.length,
        types: {},
        colors: [],
        colorNames: [],
        positions: [],
        scales: [],
        hasHouse: false,
        hasGroup: false,
        avgY: 0,
        spreadX: 0,
        spreadZ: 0,
        maxScale: 1,
        minScale: 1,
        allSameColor: true,
        allSameType: true,
        objectsOnGround: 0,
        objectsFloating: 0,
        objectsClustered: false,
        firstType: null,
        firstColor: null,
    };
    
    let sumY = 0;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    
    objects.forEach((obj, i) => {
        const type = obj.userData.type || (obj.isGroup ? 'Group' : 'Unknown');
        analysis.types[type] = (analysis.types[type] || 0) + 1;
        
        if (i === 0) {
            analysis.firstType = type;
        }
        if (type !== analysis.firstType) analysis.allSameType = false;
        
        if (obj.userData.isHouse) analysis.hasHouse = true;
        if (obj.isGroup) analysis.hasGroup = true;
        
        let colorHex = '#ffffff';
        if (obj.material && obj.material.color) {
            colorHex = '#' + obj.material.color.getHexString();
        } else if (obj.isGroup && obj.children.length > 0) {
            const firstMesh = obj.children.find(c => c.isMesh && c.material);
            if (firstMesh) colorHex = '#' + firstMesh.material.color.getHexString();
        }
        
        analysis.colors.push(colorHex);
        analysis.colorNames.push(getColorName(colorHex));
        if (i === 0) analysis.firstColor = colorHex;
        if (colorHex !== analysis.firstColor) analysis.allSameColor = false;
        
        analysis.positions.push({ x: obj.position.x, y: obj.position.y, z: obj.position.z });
        analysis.scales.push(Math.max(obj.scale.x, obj.scale.y, obj.scale.z));
        
        sumY += obj.position.y;
        minX = Math.min(minX, obj.position.x);
        maxX = Math.max(maxX, obj.position.x);
        minZ = Math.min(minZ, obj.position.z);
        maxZ = Math.max(maxZ, obj.position.z);
        
        if (obj.position.y < 1.5) analysis.objectsOnGround++;
        else analysis.objectsFloating++;
        
        analysis.maxScale = Math.max(analysis.maxScale, obj.scale.x, obj.scale.y, obj.scale.z);
        analysis.minScale = Math.min(analysis.minScale, obj.scale.x, obj.scale.y, obj.scale.z);
    });
    
    analysis.avgY = sumY / objects.length;
    analysis.spreadX = maxX - minX;
    analysis.spreadZ = maxZ - minZ;
    
    // Check clustering
    if (objects.length > 2 && analysis.spreadX < 3 && analysis.spreadZ < 3) {
        analysis.objectsClustered = true;
    }
    
    return analysis;
}

// ── Smart Suggestion Rules ───────────────────────────────────
// Each rule takes the selected object + scene analysis and returns
// a suggestion or null. This is a pure-code intelligence engine.

const SMART_RULES = [
    // ── Color Harmony ────────────────────────────────────────
    {
        id: 'monotone-scene',
        check: (obj, scene) => scene && scene.allSameColor && scene.totalObjects > 1,
        generate: (obj, scene) => {
            const colorName = scene.colorNames[0];
            return `🎨 All ${scene.totalObjects} objects are ${colorName}. Try selecting one and changing its color to a complementary shade for better visual contrast.`;
        }
    },
    {
        id: 'warm-cool-balance',
        check: (obj, scene) => {
            if (!scene || scene.totalObjects < 2) return false;
            const warmCount = scene.colors.filter(c => isColorWarm(c)).length;
            return warmCount === scene.totalObjects || warmCount === 0;
        },
        generate: (obj, scene) => {
            const allWarm = scene.colors.every(c => isColorWarm(c));
            return allWarm
                ? '🌡️ Your design uses only warm tones. Adding a cool accent (blue, teal, or green) would create a more balanced palette — inspired by Indian jewel-tone interiors.'
                : '❄️ Your palette is all cool tones. A warm accent like terracotta (#CC6633) or turmeric yellow (#E8A317) would bring life to the composition.';
        }
    },
    {
        id: 'dark-object-highlight',
        check: (obj) => {
            const hex = obj.material?.color ? '#' + obj.material.color.getHexString() : null;
            return hex && hexToHSL(hex).l < 25;
        },
        generate: (obj) => '💡 This object is very dark. In Indian architecture, dark base tones are paired with gold (#FFD700) or brass accents. Try placing a bright element next to it.'
    },
    {
        id: 'bright-neon-tone',
        check: (obj) => {
            const hex = obj.material?.color ? '#' + obj.material.color.getHexString() : null;
            if (!hex) return false;
            const { s, l } = hexToHSL(hex);
            return s > 85 && l > 45 && l < 70;
        },
        generate: (obj) => '🌈 This is a very saturated color. Consider reducing the saturation slightly for a more refined, architectural look — muted tones tend to feel more premium.'
    },

    // ── Spatial & Layout ─────────────────────────────────────
    {
        id: 'objects-clustered',
        check: (obj, scene) => scene && scene.objectsClustered && scene.totalObjects > 2,
        generate: (obj, scene) => `📐 Your ${scene.totalObjects} objects are clustered tightly together (within 3 units). Spread them out across the grid for a more spacious composition, or group them intentionally with consistent spacing.`
    },
    {
        id: 'floating-object',
        check: (obj) => obj.position.y > 3,
        generate: (obj) => `🪁 "${obj.name}" is floating at Y=${obj.position.y.toFixed(1)}. Ground it (Y=0.5) for realism, or add a supporting column beneath it to make the floating look intentional.`
    },
    {
        id: 'underground-object',
        check: (obj) => obj.position.y < -0.5,
        generate: (obj) => `⬇️ "${obj.name}" is below the grid (Y=${obj.position.y.toFixed(1)}). Move it up so it sits on the grid surface, or scale it up so part of it emerges — like a foundation element.`
    },
    {
        id: 'far-from-center',
        check: (obj) => Math.abs(obj.position.x) > 8 || Math.abs(obj.position.z) > 8,
        generate: (obj) => `📍 "${obj.name}" is far from center. Move it closer to the origin for a tighter composition, or duplicate other elements near it to create a secondary focal area.`
    },
    {
        id: 'uneven-scale',
        check: (obj) => {
            const s = obj.scale;
            const maxS = Math.max(s.x, s.y, s.z);
            const minS = Math.min(s.x, s.y, s.z);
            return maxS / minS > 3;
        },
        generate: (obj) => `📏 "${obj.name}" has very non-uniform scaling (${obj.scale.x.toFixed(1)} × ${obj.scale.y.toFixed(1)} × ${obj.scale.z.toFixed(1)}). This creates a stretched look. In Indian architecture, proportional elements (like Vastu ratios) create more harmonious designs.`
    },
    {
        id: 'very-small-object',
        check: (obj) => obj.scale.x < 0.3 && obj.scale.y < 0.3 && obj.scale.z < 0.3,
        generate: (obj) => `🔍 "${obj.name}" is very small (scale ${obj.scale.x.toFixed(2)}). It may be hard to see. Scale it up to at least 0.5 to make it a meaningful part of your design.`
    },
    {
        id: 'very-large-object',
        check: (obj) => obj.scale.x > 5 || obj.scale.y > 5 || obj.scale.z > 5,
        generate: (obj) => `🏗️ "${obj.name}" is very large. Consider breaking it into smaller, more detailed components for a richer design. Large flat surfaces can be improved with texture or color variation.`
    },

    // ── Shape-Specific Advice ────────────────────────────────
    {
        id: 'single-cube-advice',
        check: (obj, scene) => obj.userData.type === 'Cube' && scene && scene.totalObjects === 1,
        generate: () => '🧱 A single cube is a great start! Try duplicating it and stacking cubes to create walls, or add a Pyramid on top to make a simple rooftop — the foundation of most Indian house models.'
    },
    {
        id: 'cube-as-building',
        check: (obj) => obj.userData.type === 'Cube' && obj.scale.y > 2,
        generate: (obj) => `🏢 This tall cube looks like a building! Add a Disc or flat Plane on top as a roof, and smaller cubes on the sides as windows. Paint it with warm sandstone tones (#D2B48C) for an Indian government building look.`
    },
    {
        id: 'sphere-advice',
        check: (obj) => obj.userData.type === 'Sphere',
        generate: () => '🌳 Spheres work great as tree canopies! Paint it green (#228B22), add a thin brown (#8B4513) Cylinder below as a trunk, and you have a tree for your garden.'
    },
    {
        id: 'cylinder-advice',
        check: (obj) => obj.userData.type === 'Cylinder' && obj.scale.y > 1.5,
        generate: () => '🏛️ A tall cylinder resembles a pillar! In Indian temple architecture, pillars are essential. Try duplicating 4 cylinders in a row with a flat Plane on top to create a mandapa (pillared hall).'
    },
    {
        id: 'cone-as-dome',
        check: (obj) => obj.userData.type === 'Cone',
        generate: () => '🕌 A cone can represent a dome or shikhara! Place it on top of a cube to create a temple spire. Paint it gold (#FFD700) for a South Indian gopuram effect.'
    },
    {
        id: 'torus-advice',
        check: (obj) => obj.userData.type === 'Torus',
        generate: () => '⭕ A torus can be a decorative ring element. Scale it up and place it horizontally as a circular garden boundary, or use it as a decorative chakra motif on a building facade.'
    },
    {
        id: 'plane-advice',
        check: (obj) => obj.userData.type === 'Plane',
        generate: () => '🟫 Planes are perfect for floors and roofs. Scale this plane and paint it grey (#808080) to create a courtyard, or green (#90EE90) for a lawn area.'
    },
    {
        id: 'pyramid-advice',
        check: (obj) => obj.userData.type === 'Pyramid',
        generate: () => '🔺 Pyramids make excellent rooftops! Place this on a cube for a simple house. For a Rajasthani haveli look, paint it terracotta (#CC6633) and place it on cream (#F5DEB3) colored walls.'
    },
    {
        id: 'wedge-advice',
        check: (obj) => obj.userData.type === 'Wedge',
        generate: () => '📐 Wedges are great for ramps and sloped roofs. Use this as a stairway by duplicating and stacking, or as a modern angular roof element.'
    },
    {
        id: 'ring-advice',
        check: (obj) => obj.userData.type === 'Ring',
        generate: () => '💍 Rings can represent circular garden paths, decorative boundary elements, or the base of a fountain. Place a small blue Sphere in the center for a water feature!'
    },

    // ── Multi-Object Composition ─────────────────────────────
    {
        id: 'many-cubes',
        check: (obj, scene) => scene && (scene.types['Cube'] || 0) >= 3,
        generate: (obj, scene) => `🏘️ You have ${scene.types['Cube']} cubes! Consider arranging them in an L-shape or U-shape to form a courtyard layout — a hallmark of traditional Indian homes. Add a Plane in the center as an open-air space.`
    },
    {
        id: 'no-roof-detected',
        check: (obj, scene) => {
            if (!scene) return false;
            const hasCubes = (scene.types['Cube'] || 0) > 0;
            const hasPyramids = (scene.types['Pyramid'] || 0) > 0;
            const hasCones = (scene.types['Cone'] || 0) > 0;
            return hasCubes && !hasPyramids && !hasCones && scene.totalObjects < 6;
        },
        generate: () => '🏠 Your design has walls but no visible rooftop! Add a Pyramid or Cone on top of your cube structures to complete the building silhouette.'
    },
    {
        id: 'add-greenery',
        check: (obj, scene) => {
            if (!scene || scene.totalObjects < 2) return false;
            const greenCount = scene.colorNames.filter(c => c === 'green').length;
            return greenCount === 0;
        },
        generate: () => '🌿 Your design has no greenery! In Indian Vastu design, gardens bring positive energy. Add green Spheres as trees and a green Plane as a lawn area for a complete look.'
    },
    {
        id: 'symmetry-suggestion',
        check: (obj, scene) => scene && scene.totalObjects >= 4 && !scene.objectsClustered,
        generate: () => '⚖️ With multiple elements, consider creating symmetry — mirror your objects across the center axis. Indian architecture (like the Taj Mahal) relies heavily on bilateral symmetry for visual harmony.'
    },
    {
        id: 'add-water-feature',
        check: (obj, scene) => {
            if (!scene || scene.totalObjects < 3) return false;
            const blueCount = scene.colorNames.filter(c => c === 'blue' || c === 'cyan').length;
            return blueCount === 0;
        },
        generate: () => '💧 Add a water element! Place a flat blue (#4D9DE0) Plane as a reflecting pool or a blue Disc as a small pond. Water features are central to Mughal garden design.'
    },

    // ── House-Specific Rules ─────────────────────────────────
    {
        id: 'house-no-garden',
        check: (obj) => obj.userData?.isHouse && !hasPart(obj, 'Garden') && !hasPart(obj, 'Bush'),
        generate: () => '🌿 This house needs a garden! Indian homes traditionally have a small front garden (aangan). It adds curb appeal and connects the building to nature.',
        action: 'add-garden',
    },
    {
        id: 'house-no-fence',
        check: (obj) => obj.userData?.isHouse && !hasPart(obj, 'Fence'),
        generate: () => '🔒 Add a compound wall or fence. Most Indian homes have a boundary wall for privacy. It defines your property and completes the design.',
        action: 'add-fence',
    },
    {
        id: 'house-white-walls',
        check: (obj) => {
            if (!obj.userData?.isHouse) return false;
            const wallColor = getPartColor(obj, 'Walls');
            return wallColor && (wallColor === '#ffffff' || wallColor === '#f5f0e8' || wallColor === '#f0f0f0');
        },
        generate: () => '🎨 White walls look clean, but pair them with a terracotta (#CC6633) roof and dark brown (#5D4037) doors for a classic South Indian home aesthetic.',
        colorAction: { part: 'Roof', color: '#cc6633' },
    },
    {
        id: 'house-same-roof-wall',
        check: (obj) => {
            if (!obj.userData?.isHouse) return false;
            const roofColor = getPartColor(obj, 'Roof');
            const wallColor = getPartColor(obj, 'Walls');
            return roofColor && wallColor && roofColor === wallColor;
        },
        generate: () => '🏠 Your roof and walls are the same color. Use a contrasting dark tone for the roof — this creates visual depth and is common in Indian vernacular architecture.',
        colorAction: { part: 'Roof', color: '#8b4513' },
    },
    {
        id: 'house-add-jaali',
        check: (obj) => {
            const type = obj.userData?.templateType;
            return (type === 'traditional' || type === 'modern') && !hasPart(obj, 'Jaali_Screen');
        },
        generate: () => '🏵️ Add a Jaali screen! These latticed screens are iconic in Rajasthani and Mughal architecture. They provide natural ventilation, privacy, and stunning shadow patterns.',
        action: 'add-jaali',
    },
    {
        id: 'house-no-driveway',
        check: (obj) => obj.userData?.isHouse && hasPart(obj, 'Garage') && !hasPart(obj, 'Driveway'),
        generate: () => '🚗 Your house has a garage but no driveway! Add a paved path connecting it to the road for a complete look.',
        action: 'add-driveway',
    },
];

// ── Main Export: Generate Smart Suggestions ──────────────────
export function generateSuggestions(selectedObject, maxSuggestions = 4) {
    if (!selectedObject) return [];
    
    const scene = analyzeScene();
    const suggestions = [];
    
    // Shuffle rules for variety on each call
    const shuffled = [...SMART_RULES].sort(() => Math.random() - 0.5);
    
    for (const rule of shuffled) {
        if (suggestions.length >= maxSuggestions) break;
        
        try {
            if (!rule.check(selectedObject, scene)) continue;
        } catch (e) {
            continue;
        }
        
        const text = rule.generate(selectedObject, scene);
        if (!text) continue;
        
        const suggestion = {
            id: rule.id,
            text,
            apply: null,
        };
        
        // Wire up auto-apply actions
        if (rule.colorAction) {
            suggestion.apply = (obj) => applyColorToHousePart(obj, rule.colorAction.part, rule.colorAction.color);
        } else if (rule.action === 'add-garden') {
            suggestion.apply = (obj) => addGardenToHouse(obj);
        } else if (rule.action === 'add-fence') {
            suggestion.apply = (obj) => addFenceToHouse(obj);
        } else if (rule.action === 'add-driveway') {
            suggestion.apply = (obj) => addDrivewayToHouse(obj);
        } else if (rule.action === 'add-pool') {
            suggestion.apply = (obj) => addPoolToHouse(obj);
        } else if (rule.action === 'add-jaali') {
            suggestion.apply = (obj) => addJaaliScreenToHouse(obj);
        }
        
        suggestions.push(suggestion);
    }
    
    // If no rules matched, give a generic helpful suggestion
    if (suggestions.length === 0) {
        const objName = selectedObject.name || 'this object';
        suggestions.push({
            id: 'generic-tip',
            text: `💡 "${objName}" is selected. Try changing its color, duplicating it, or adding more shapes nearby to build a composition. Indian designs often use repetition and symmetry.`,
            apply: null,
        });
    }
    
    return suggestions;
}
