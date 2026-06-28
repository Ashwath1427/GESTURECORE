// ============================================================
// design-ui.js — Dynamic DOM for Design Mode panels
// ============================================================
import { STYLE_PRESETS } from './style-presets.js';

// ── Create Design Mode UI (called once on init) ──────────────
export class DesignUI {
    constructor() {
        this.container = null;
        this.leftPanel = null;
        this.rightPanel = null;
        this.bottomBar = null;
        this.modeIndicator = null;
        this.created = false;

        // Callbacks (set by orchestrator)
        this.onTemplateSelect = null;
        this.onPartSelect = null;
        this.onPresetSelect = null;
        this.onSuggestionApply = null;
        this.onCommunityToggle = null;
    }

    create() {
        if (this.created) return;
        this.created = true;

        // ── Wrapper (hidden by default) ──────────────────────
        this.container = document.createElement('div');
        this.container.id = 'design-mode-ui';
        this.container.className = 'design-mode-ui hidden';

        // ── Mode Indicator (top) ─────────────────────────────
        this.modeIndicator = document.createElement('div');
        this.modeIndicator.id = 'design-mode-indicator';
        this.modeIndicator.className = 'design-mode-indicator';
        this.modeIndicator.innerHTML = `
            <span class="design-mode-label">MODE:</span>
            <span id="design-mode-current" class="design-mode-current">DESIGN</span>
        `;
        this.container.appendChild(this.modeIndicator);

        // ── Left Panel — Templates + Parts ───────────────────
        this.leftPanel = document.createElement('aside');
        this.leftPanel.id = 'design-left-panel';
        this.leftPanel.className = 'design-left-panel';
        this.leftPanel.innerHTML = `
            <h3 class="design-panel-title">🏠 House Templates</h3>
            <div class="design-template-grid">
                <button class="design-template-btn" data-template="simple">
                    <span class="template-icon">🏡</span>Simple House
                </button>
                <button class="design-template-btn" data-template="2bhk">
                    <span class="template-icon">🏘️</span>2BHK House
                </button>
                <button class="design-template-btn" data-template="villa">
                    <span class="template-icon">🏰</span>Villa
                </button>
                <button class="design-template-btn" data-template="modern">
                    <span class="template-icon">🏢</span>Modern House
                </button>
                <button class="design-template-btn" data-template="traditional">
                    <span class="template-icon">🏠</span>Traditional
                </button>
            </div>

            <h3 class="design-panel-title" style="margin-top:16px;">🧱 Add Parts</h3>
            <div class="design-parts-grid">
                <button class="design-part-btn" data-part="garage">🚗 Garage</button>
                <button class="design-part-btn" data-part="garden">🌿 Garden</button>
                <button class="design-part-btn" data-part="pool">🏊 Pool</button>
                <button class="design-part-btn" data-part="fence">🔒 Fence</button>
                <button class="design-part-btn" data-part="driveway">🛣️ Driveway</button>
            </div>

            <h3 class="design-panel-title" style="margin-top:16px;">🏘️ Community</h3>
            <div class="design-parts-grid">
                <button class="design-part-btn design-community-btn" data-amenity="gate">🚧 Main Gate</button>
                <button class="design-part-btn design-community-btn" data-amenity="road">🛤️ Road</button>
                <button class="design-part-btn design-community-btn" data-amenity="park">🌳 Park</button>
                <button class="design-part-btn design-community-btn" data-amenity="clubhouse">🏛️ Clubhouse</button>
                <button class="design-part-btn design-community-btn" data-amenity="parking">🅿️ Parking</button>
                <button class="design-part-btn design-community-btn" data-amenity="play area">🎠 Play Area</button>
            </div>
        `;
        this.container.appendChild(this.leftPanel);

        // ── Right Panel — AI Suggestions ─────────────────────
        this.rightPanel = document.createElement('aside');
        this.rightPanel.id = 'design-right-panel';
        this.rightPanel.className = 'design-right-panel';
        this.rightPanel.innerHTML = `
            <h3 class="design-panel-title">✨ AI Suggestions</h3>
            <div id="design-suggestions-list" class="design-suggestions-list">
                <div class="design-suggestion-empty">Select or build a house to get AI suggestions</div>
            </div>
            <button id="design-refresh-suggestions" class="design-refresh-btn">🔄 Refresh</button>
        `;
        this.container.appendChild(this.rightPanel);

        // ── Bottom Bar — Style Presets ───────────────────────
        this.bottomBar = document.createElement('div');
        this.bottomBar.id = 'design-bottom-bar';
        this.bottomBar.className = 'design-bottom-bar';

        let presetsHTML = '<span class="design-presets-label">Style Presets:</span>';
        const presetIcons = { modern: '🏢', traditional: '🏡', luxury: '💎', colorful: '🎨' };
        for (const [name] of Object.entries(STYLE_PRESETS)) {
            presetsHTML += `<button class="design-preset-btn" data-preset="${name}">${presetIcons[name] || '🎨'} ${name.charAt(0).toUpperCase() + name.slice(1)}</button>`;
        }
        this.bottomBar.innerHTML = presetsHTML;
        this.container.appendChild(this.bottomBar);

        // ── Append to body ───────────────────────────────────
        document.body.appendChild(this.container);

        // ── Wire up events ───────────────────────────────────
        this._wireEvents();
    }

    _wireEvents() {
        // Template buttons
        this.leftPanel.querySelectorAll('.design-template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const template = btn.dataset.template;
                if (this.onTemplateSelect) this.onTemplateSelect(template);
            });
        });

        // Part buttons
        this.leftPanel.querySelectorAll('.design-part-btn:not(.design-community-btn)').forEach(btn => {
            btn.addEventListener('click', () => {
                const part = btn.dataset.part;
                if (this.onPartSelect) this.onPartSelect(part);
            });
        });

        // Community amenity buttons
        this.leftPanel.querySelectorAll('.design-community-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const amenity = btn.dataset.amenity;
                if (this.onCommunityToggle) this.onCommunityToggle(amenity);
            });
        });

        // Preset buttons
        this.bottomBar.querySelectorAll('.design-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                if (this.onPresetSelect) this.onPresetSelect(preset);
            });
        });

        // Refresh suggestions
        const refreshBtn = document.getElementById('design-refresh-suggestions');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                if (this.onSuggestionRefresh) this.onSuggestionRefresh();
            });
        }
    }

    // ── Show/Hide ────────────────────────────────────────────
    show() {
        if (this.container) this.container.classList.remove('hidden');
    }

    hide() {
        if (this.container) this.container.classList.add('hidden');
    }

    // ── Update mode indicator ────────────────────────────────
    setMode(mode) {
        const el = document.getElementById('design-mode-current');
        if (el) {
            el.textContent = mode;
            el.className = 'design-mode-current design-mode-' + mode.toLowerCase();
        }
    }

    // ── Update suggestions panel ─────────────────────────────
    updateSuggestions(suggestions) {
        const list = document.getElementById('design-suggestions-list');
        if (!list) return;

        if (!suggestions || suggestions.length === 0) {
            list.innerHTML = '<div class="design-suggestion-empty">✅ Your design looks great!</div>';
            return;
        }

        list.innerHTML = suggestions.map((s, i) => `
            <div class="design-suggestion-card" data-index="${i}">
                <p class="suggestion-text">${s.text}</p>
                ${s.autoApply || s.autoAction ? `<button class="suggestion-apply-btn" data-suggestion-id="${s.id}">Apply</button>` : ''}
            </div>
        `).join('');

        // Wire apply buttons
        list.querySelectorAll('.suggestion-apply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.suggestionId;
                const suggestion = suggestions.find(s => s.id === id);
                if (suggestion && this.onSuggestionApply) {
                    this.onSuggestionApply(suggestion);
                }
            });
        });
    }

    // ── Show toast notification ──────────────────────────────
    showDesignToast(message) {
        let toast = document.getElementById('design-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'design-toast';
            toast.className = 'design-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.remove('hidden');
        toast.classList.add('design-toast-show');

        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.classList.remove('design-toast-show');
            toast.classList.add('hidden');
        }, 2500);
    }
}
