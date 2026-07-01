// ============================================================
// style-presets.js — Color maps, style presets, and apply helpers
// ============================================================

// ── Color Map for voice command parsing ──────────────────────
export const COLOR_MAP = {
    'white':       '#ffffff',
    'black':       '#222222',
    'red':         '#cc3333',
    'blue':        '#3366cc',
    'green':       '#336633',
    'yellow':      '#ccaa33',
    'grey':        '#888888',
    'gray':        '#888888',
    'brown':       '#8b4513',
    'cream':       '#f5f0e8',
    'beige':       '#f0e6d0',
    'dark grey':   '#444444',
    'dark gray':   '#444444',
    'light blue':  '#aaccee',
    'terracotta':  '#cc6633',
    'orange':      '#e07020',
    'maroon':      '#6b2020',
    'navy':        '#1a2a5a',
    'olive':       '#6b6b20',
    'teal':        '#208080',
    'gold':        '#c0a040',
    'silver':      '#c0c0c0',
    'pink':        '#e080a0',
    'purple':      '#7744aa',
};

// ── Style Presets ────────────────────────────────────────────
export const STYLE_PRESETS = {
    modern: {
        walls:   '#f0f0f0',
        roof:    '#333333',
        door:    '#222222',
        windows: '#aaccff',
        accent:  '#888888',
        garage:  '#555555',
        fence:   '#aaaaaa',
        garden:  '#44aa44',
    },
    traditional: {
        walls:   '#f5f0e8',
        roof:    '#8b4513',
        door:    '#4a2c0a',
        windows: '#ddcc99',
        accent:  '#cc9966',
        garage:  '#8b6914',
        fence:   '#6b4226',
        garden:  '#228b22',
    },
    luxury: {
        walls:   '#ffffff',
        roof:    '#1a1a1a',
        door:    '#c0a060',
        windows: '#ccddee',
        accent:  '#c0a060',
        garage:  '#333333',
        fence:   '#1a1a1a',
        garden:  '#2d8b2d',
    },
    colorful: {
        walls:   '#ffeecc',
        roof:    '#cc4444',
        door:    '#4444cc',
        windows: '#aaffaa',
        accent:  '#ffaa44',
        garage:  '#6688cc',
        fence:   '#cc8844',
        garden:  '#33cc33',
    },
};

// ── Parse color name from voice transcript ───────────────────
export function parseColorFromCommand(text) {
    // Check multi-word colors first (e.g., "dark grey" before "grey")
    const sorted = Object.entries(COLOR_MAP).sort((a, b) => b[0].length - a[0].length);
    for (const [name, hex] of sorted) {
        if (text.includes(name)) return hex;
    }
    return null;
}

// ── Apply color to a specific named part inside a house group ─
export function applyColorToHousePart(house, partName, colorHex) {
    if (!house || !house.isGroup) return false;
    const target = partName.toLowerCase();
    let applied = false;

    house.traverse((child) => {
        if (child.isMesh && child.name.toLowerCase().includes(target)) {
            child.material = child.material.clone();
            child.material.color.set(colorHex);
            child.material.needsUpdate = true;
            applied = true;
        }
    });

    return applied;
}

// ── Apply a full style preset to a house group ───────────────
export function applyStylePreset(house, presetName) {
    const preset = STYLE_PRESETS[presetName];
    if (!preset || !house || !house.isGroup) return false;

    house.traverse((child) => {
        if (!child.isMesh) return;
        const n = child.name.toLowerCase();

        child.material = child.material.clone();

        if (n.includes('wall'))    child.material.color.set(preset.walls);
        if (n.includes('roof'))    child.material.color.set(preset.roof);
        if (n.includes('door'))    child.material.color.set(preset.door);
        if (n.includes('window'))  child.material.color.set(preset.windows);
        if (n.includes('garage'))  child.material.color.set(preset.garage);
        if (n.includes('fence'))   child.material.color.set(preset.fence);
        if (n.includes('garden'))  child.material.color.set(preset.garden);
        if (n.includes('accent') || n.includes('trim') || n.includes('porch') || n.includes('column'))
            child.material.color.set(preset.accent);

        child.material.needsUpdate = true;
    });

    return true;
}

// ── Get hex color string of a named part ─────────────────────
export function getPartColor(house, partName) {
    if (!house || !house.isGroup) return null;
    const target = partName.toLowerCase();
    let color = null;

    house.traverse((child) => {
        if (color) return; // already found
        if (child.isMesh && child.name.toLowerCase().includes(target)) {
            color = '#' + child.material.color.getHexString();
        }
    });

    return color;
}

// ── Check if a house has a named part ────────────────────────
export function hasPart(house, partName) {
    if (!house || !house.isGroup) return false;
    const target = partName.toLowerCase();
    let found = false;

    house.traverse((child) => {
        if (child.isMesh && child.name.toLowerCase().includes(target)) {
            found = true;
        }
    });

    return found;
}
