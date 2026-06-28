// ============================================================
// design-voice.js — Voice command parser for Design Mode
// ============================================================
import { parseColorFromCommand } from './style-presets.js';

const WORD_NUMS = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, fifteen: 15, twenty: 20,
};

function extractCount(text) {
    // digit match: "add 5 houses"
    const d = text.match(/(\d+)/);
    if (d) return parseInt(d[1]);

    // word match: "add five houses"
    for (const [word, num] of Object.entries(WORD_NUMS)) {
        if (text.includes(word)) return num;
    }
    return 1;
}

// ── Main Design Mode voice parser ────────────────────────────
export function parseDesignVoiceCommand(rawText) {
    if (!rawText) return { type: 'UNKNOWN', raw: rawText };

    const text = rawText
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '')
        .replace(/\b(um|uh|please|can you|could you|hey|okay|ok)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    // ── Building Commands ────────────────────────────────────
    if (text.includes('build a house') || text.includes('make a house') || text.includes('create a house') || text.includes('add a house') || text.includes('spawn house')) {
        return { type: 'DESIGN_BUILD_HOUSE', template: 'simple' };
    }
    if (text.includes('2bhk') || text.includes('2 bhk') || text.includes('two bhk') || text.includes('2 bedroom')) {
        return { type: 'DESIGN_BUILD_HOUSE', template: '2bhk' };
    }
    if (text.includes('villa')) {
        return { type: 'DESIGN_BUILD_HOUSE', template: 'villa' };
    }
    if (text.includes('modern house') || text.includes('build modern') || text.includes('make modern house')) {
        return { type: 'DESIGN_BUILD_HOUSE', template: 'modern' };
    }
    if (text.includes('traditional house') || text.includes('build traditional') || text.includes('make traditional house')) {
        return { type: 'DESIGN_BUILD_HOUSE', template: 'traditional' };
    }

    // ── Part Addition Commands ────────────────────────────────
    if (text.includes('add a garage') || text.includes('add garage')) {
        return { type: 'DESIGN_ADD_PART', part: 'garage' };
    }
    if (text.includes('add a garden') || text.includes('add garden')) {
        return { type: 'DESIGN_ADD_PART', part: 'garden' };
    }
    if (text.includes('add a pool') || text.includes('add pool') || text.includes('add swimming pool')) {
        return { type: 'DESIGN_ADD_PART', part: 'pool' };
    }
    if (text.includes('add a fence') || text.includes('add fence')) {
        return { type: 'DESIGN_ADD_PART', part: 'fence' };
    }
    if (text.includes('add a driveway') || text.includes('add driveway')) {
        return { type: 'DESIGN_ADD_PART', part: 'driveway' };
    }
    if (text.includes('add a road') || text.includes('add road')) {
        return { type: 'DESIGN_ADD_AMENITY', amenity: 'road' };
    }

    // ── Style Preset Commands ────────────────────────────────
    if (text.includes('make it modern') || text.includes('modern style') || text.includes('apply modern')) {
        return { type: 'DESIGN_APPLY_PRESET', preset: 'modern' };
    }
    if (text.includes('make it traditional') || text.includes('traditional style') || text.includes('apply traditional')) {
        return { type: 'DESIGN_APPLY_PRESET', preset: 'traditional' };
    }
    if (text.includes('make it luxury') || text.includes('luxury style') || text.includes('apply luxury') || text.includes('make it luxurious')) {
        return { type: 'DESIGN_APPLY_PRESET', preset: 'luxury' };
    }
    if (text.includes('make it colorful') || text.includes('colorful style') || text.includes('apply colorful')) {
        return { type: 'DESIGN_APPLY_PRESET', preset: 'colorful' };
    }

    // ── Color Commands (specific part) ───────────────────────
    const wallColorMatch = text.match(/(?:make|change|set|paint)\s+(?:the\s+)?walls?\s+(?:to\s+)?(\w[\w\s]*)/);
    if (wallColorMatch) {
        const color = parseColorFromCommand(wallColorMatch[1]);
        if (color) return { type: 'DESIGN_COLOR_PART', part: 'wall', color };
    }

    const roofColorMatch = text.match(/(?:make|change|set|paint)\s+(?:the\s+)?roofs?\s+(?:to\s+)?(\w[\w\s]*)/);
    if (roofColorMatch) {
        const color = parseColorFromCommand(roofColorMatch[1]);
        if (color) return { type: 'DESIGN_COLOR_PART', part: 'roof', color };
    }

    const doorColorMatch = text.match(/(?:make|change|set|paint)\s+(?:the\s+)?doors?\s+(?:to\s+)?(\w[\w\s]*)/);
    if (doorColorMatch) {
        const color = parseColorFromCommand(doorColorMatch[1]);
        if (color) return { type: 'DESIGN_COLOR_PART', part: 'door', color };
    }

    // ── Generic color command: "make it [color]" or "change color to [color]"
    const genericColorMatch = text.match(/(?:make it|change color to|color it|paint it)\s+(\w[\w\s]*)/);
    if (genericColorMatch) {
        const color = parseColorFromCommand(genericColorMatch[1]);
        if (color) return { type: 'DESIGN_COLOR_ALL', color };
    }

    // ── Layout Commands ──────────────────────────────────────
    if (text.includes('rotate house') || text.includes('turn house') || text.includes('rotate building')) {
        return { type: 'DESIGN_ROTATE_HOUSE' };
    }
    if (text.includes('zoom in') || text.includes('closer')) {
        return { type: 'ZOOM_IN' };
    }
    if (text.includes('zoom out') || text.includes('farther') || text.includes('further')) {
        return { type: 'ZOOM_OUT' };
    }

    // ── Community Commands ────────────────────────────────────
    const houseCountMatch = text.match(/add\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+house/);
    if (houseCountMatch) {
        const count = extractCount(text);
        return { type: 'DESIGN_ADD_HOUSE_ROW', count, template: 'simple' };
    }

    if (text.includes('add a park') || text.includes('add park') || text.includes('place park')) {
        return { type: 'DESIGN_ADD_AMENITY', amenity: 'park' };
    }
    if (text.includes('add main gate') || text.includes('add gate') || text.includes('place gate')) {
        return { type: 'DESIGN_ADD_AMENITY', amenity: 'gate' };
    }
    if (text.includes('add clubhouse') || text.includes('add a clubhouse') || text.includes('place clubhouse')) {
        return { type: 'DESIGN_ADD_AMENITY', amenity: 'clubhouse' };
    }
    if (text.includes('add parking') || text.includes('add a parking') || text.includes('place parking')) {
        return { type: 'DESIGN_ADD_AMENITY', amenity: 'parking' };
    }
    if (text.includes('add play area') || text.includes('add playground') || text.includes('place playground')) {
        return { type: 'DESIGN_ADD_AMENITY', amenity: 'play area' };
    }

    // ── Community mode toggle ────────────────────────────────
    if (text.includes('community mode') || text.includes('community layout') || text.includes('gated community') || text.includes('switch to community')) {
        return { type: 'DESIGN_COMMUNITY_MODE' };
    }

    // ── Exit design mode ─────────────────────────────────────
    if (text.includes('exit design') || text.includes('leave design') || text.includes('back to editor') || text.includes('editor mode')) {
        return { type: 'DESIGN_EXIT' };
    }

    // Not a design command — fall through to regular parser
    return { type: 'UNKNOWN', raw: text };
}
