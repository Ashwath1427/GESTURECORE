// ============================================================
// ai-suggestions.js — Rule-based beauty suggestion engine
// ============================================================
import { getPartColor, hasPart, applyColorToHousePart } from './style-presets.js';
import { addGardenToHouse, addFenceToHouse, addDrivewayToHouse, addPoolToHouse } from './house-templates.js';

// ── Style Rules ──────────────────────────────────────────────
const STYLE_RULES = [
    {
        id: 'white-walls-roof',
        check: (house) => {
            const wallColor = getPartColor(house, 'Walls');
            return wallColor && (wallColor === '#ffffff' || wallColor === '#f5f0e8' || wallColor === '#f0f0f0');
        },
        suggestion: '🎨 White walls pair beautifully with a dark grey or terracotta roof for contrast.',
        autoApply: { part: 'Roof', color: '#cc6633' },
    },
    {
        id: 'same-roof-wall',
        check: (house) => {
            const roofColor = getPartColor(house, 'Roof');
            const wallColor = getPartColor(house, 'Walls');
            return roofColor && wallColor && roofColor === wallColor;
        },
        suggestion: '🏠 Try using a contrasting color for the roof to add visual depth.',
        autoApply: { part: 'Roof', color: '#8b4513' },
    },
    {
        id: 'no-garden',
        check: (house) => !hasPart(house, 'Garden') && !hasPart(house, 'Bush'),
        suggestion: '🌿 Adding a garden significantly improves curb appeal.',
        autoAction: 'add-garden',
    },
    {
        id: 'no-fence',
        check: (house) => !hasPart(house, 'Fence'),
        suggestion: '🔒 A fence adds privacy and defines the property boundary clearly.',
        autoAction: 'add-fence',
    },
    {
        id: 'pool-no-garden',
        check: (house) => hasPart(house, 'Pool') && !hasPart(house, 'Garden'),
        suggestion: '🏊 A pool looks better surrounded by a garden or paved area.',
        autoAction: 'add-garden',
    },
    {
        id: 'dark-door',
        check: (house) => {
            const doorColor = getPartColor(house, 'Door');
            return doorColor && (doorColor === '#000000' || doorColor === '#222222' || doorColor === '#1a1a1a');
        },
        suggestion: '🚪 A dark door looks sleek! Consider a brass or gold door handle accent.',
        autoApply: null,
    },
    {
        id: 'no-driveway',
        check: (house) => hasPart(house, 'Garage') && !hasPart(house, 'Driveway'),
        suggestion: '🚗 Add a driveway to connect the garage to the road.',
        autoAction: 'add-driveway',
    },
    {
        id: 'no-windows',
        check: (house) => !hasPart(house, 'Window'),
        suggestion: '🪟 Windows add natural light and visual interest. Add some!',
        autoApply: null,
    },
    {
        id: 'bright-roof',
        check: (house) => {
            const roofColor = getPartColor(house, 'Roof');
            if (!roofColor) return false;
            // Simple brightness check: if R+G+B > 600 (out of 765 max)
            const r = parseInt(roofColor.slice(1, 3), 16);
            const g = parseInt(roofColor.slice(3, 5), 16);
            const b = parseInt(roofColor.slice(5, 7), 16);
            return (r + g + b) > 500;
        },
        suggestion: '🏡 Light-colored roofs reflect heat but darker tones look more premium.',
        autoApply: { part: 'Roof', color: '#555555' },
    },
    {
        id: 'no-balcony-villa',
        check: (house) => {
            const type = house.userData?.templateType;
            return type === '2bhk' && !hasPart(house, 'Balcony');
        },
        suggestion: '🏗️ Consider adding a balcony for a more spacious feel.',
        autoApply: null,
    },
];

// ── Generate suggestions for a house ─────────────────────────
export function generateSuggestions(house, maxSuggestions = 3) {
    if (!house || !house.isGroup) return [];

    return STYLE_RULES
        .filter(rule => {
            try { return rule.check(house); }
            catch { return false; }
        })
        .slice(0, maxSuggestions)
        .map(rule => {
            const suggestion = {
                id: rule.id,
                text: rule.suggestion,
                apply: null
            };

            if (rule.autoApply) {
                suggestion.apply = (house) => applyColorToHousePart(house, rule.autoApply.part, rule.autoApply.color);
            } else if (rule.autoAction === 'add-garden') {
                suggestion.apply = (house) => addGardenToHouse(house);
            } else if (rule.autoAction === 'add-fence') {
                suggestion.apply = (house) => addFenceToHouse(house);
            } else if (rule.autoAction === 'add-driveway') {
                suggestion.apply = (house) => addDrivewayToHouse(house);
            } else if (rule.autoAction === 'add-pool') {
                suggestion.apply = (house) => addPoolToHouse(house);
            }

            return suggestion;
        });
}

// ── Get all available suggestions (unfiltered) ───────────────
export function getAllSuggestions(house) {
    if (!house || !house.isGroup) return [];

    return STYLE_RULES
        .filter(rule => {
            try { return rule.check(house); }
            catch { return false; }
        })
        .map(rule => {
            const suggestion = {
                id: rule.id,
                text: rule.suggestion,
                apply: null
            };

            if (rule.autoApply) {
                suggestion.apply = (house) => applyColorToHousePart(house, rule.autoApply.part, rule.autoApply.color);
            } else if (rule.autoAction === 'add-garden') {
                suggestion.apply = (house) => addGardenToHouse(house);
            } else if (rule.autoAction === 'add-fence') {
                suggestion.apply = (house) => addFenceToHouse(house);
            } else if (rule.autoAction === 'add-driveway') {
                suggestion.apply = (house) => addDrivewayToHouse(house);
            } else if (rule.autoAction === 'add-pool') {
                suggestion.apply = (house) => addPoolToHouse(house);
            }

            return suggestion;
        });
}
