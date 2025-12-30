import GLib from 'gi://GLib';

// Schema ID for Gio.Settings
const SchemaId = 'org.gnome.shell.extensions.desktop-widgets';
const KeyProfiles = 'profiles-json';

export const GridLimits = {
    MIN: 2,
    MAX: 12,
};

export const PositionMode = {
    GRID: 'grid',
    COORDINATE: 'coordinate',
};

// Default profile structure with grid support
const DefaultProfile = {
    name: 'Default',
    positionMode: PositionMode.GRID,
    gridColumns: 6,
    gridRows: 4,
    widgets: [],
};

/**
 * ConfigManager
 * @class
 * @classdesc Configuration manager for profiles and widgets, wrapping Gio.Settings
 */
export class ConfigManager {
    /**
     * Create a new config manager
     * @param {Extension} extension - The extension instance
     */
    constructor(extension) {
        this._extension = extension;
        this._settings = extension.getSettings(SchemaId);
        this._cache = null;

        this._signals = new Map();
        this._nextSignalId = 1;

        this._settingsChangedId = this._settings.connect(`changed::${KeyProfiles}`, () => {
            this._cache = null;
            this.emit('profiles-changed');
        });
    }

    /**
     * Connect a callback to a signal
     * @param {string} signal - Signal name
     * @param {Function} callback - Callback function
     * @returns {number} Handler ID for disconnection
     */
    connect(signal, callback) {
        if (!this._signals.has(signal)) {
            this._signals.set(signal, new Set());
        }
        const id = this._nextSignalId++;
        this._signals.get(signal).add({ id, callback });
        return id;
    }

    /**
     * Disconnect a callback from a signal
     * @param {string} signal - Signal name
     * @param {number} handlerId - Handler ID from connect()
     */
    disconnect(signal, handlerId) {
        if (this._signals.has(signal)) {
            const handlers = this._signals.get(signal);
            for (const handler of handlers) {
                if (handler.id === handlerId) {
                    handlers.delete(handler);
                    break;
                }
            }
        }
    }

    /**
     * Emit a signal to all connected callbacks
     * @param {string} signal - Signal name
     * @param {...*} args - Arguments to pass to callbacks
     */
    emit(signal, ...args) {
        if (this._signals.has(signal)) {
            for (const { callback } of this._signals.get(signal)) {
                try {
                    callback(...args);
                } catch (e) {
                    console.error(e);
                }
            }
        }
    }

    /**
     * Load profiles from settings
     * @returns {Object} Profiles data object
     */
    _load() {
        if (this._cache) return this._cache;
        const jsonString = this._settings.get_string(KeyProfiles);
        try {
            this._cache = JSON.parse(jsonString);
            this._migrateProfiles();
        } catch (e) {
            console.error('Failed to parse profiles JSON', e);
            this._cache = {
                activeProfileId: 'default',
                profiles: { default: { ...DefaultProfile } },
            };
        }
        return this._cache;
    }

    /**
     * Migrate older profile schemas to current format
     */
    _migrateProfiles() {
        let needsSave = false;
        for (const profile of Object.values(this._cache.profiles)) {
            if (!profile.positionMode) {
                profile.positionMode = PositionMode.GRID;
                needsSave = true;
            }
            if (profile.gridColumns === undefined) {
                profile.gridColumns = DefaultProfile.gridColumns;
                needsSave = true;
            }
            if (profile.gridRows === undefined) {
                profile.gridRows = DefaultProfile.gridRows;
                needsSave = true;
            }
            if (!profile.widgets) {
                profile.widgets = [];
                needsSave = true;
            }
        }
        if (needsSave) this._save();
    }

    /**
     * Save profiles to settings
     * @private
     */
    _save() {
        if (this._cache) {
            this._settings.set_string(KeyProfiles, JSON.stringify(this._cache));
        }
    }

    /**
     * Get list of all profiles with summary info
     * @returns {Object[]} Array of profile summary objects
     */
    getProfileList() {
        const data = this._load();
        return Object.entries(data.profiles).map(([id, profile]) => ({
            id,
            name: profile.name,
            isActive: id === data.activeProfileId,
            widgetCount: profile.widgets ? profile.widgets.length : 0,
            positionMode: profile.positionMode,
        }));
    }

    /**
     * Get a profile by ID
     * @param {string} profileId - Profile identifier
     * @returns {Object|null} Profile object or null
     */
    getProfile(profileId) {
        const data = this._load();
        return data.profiles[profileId] || null;
    }

    /**
     * Get the currently active profile
     * @returns {Object|null} Active profile or first available
     */
    getActiveProfile() {
        const data = this._load();
        const profile = data.profiles[data.activeProfileId];
        if (profile) return profile;
        // Fallback to first available profile
        const profileIds = Object.keys(data.profiles);
        return profileIds.length > 0 ? data.profiles[profileIds[0]] : null;
    }

    /**
     * Get the active profile ID
     * @returns {string} Active profile identifier
     */
    getActiveProfileId() {
        return this._load().activeProfileId;
    }

    /**
     * Set the active profile
     * @param {string} profileId - Profile to activate
     */
    setActiveProfile(profileId) {
        const data = this._load();
        if (data.profiles[profileId]) {
            data.activeProfileId = profileId;
            this._save();
            this.emit('profiles-changed');
        }
    }

    /**
     * Create a new profile
     * @param {string} name - Profile name
     * @returns {string} New profile ID
     */
    createProfile(name) {
        const data = this._load();
        const id = GLib.uuid_string_random();
        data.profiles[id] = {
            ...DefaultProfile,
            name: name,
        };
        this._save();
        return id;
    }

    /**
     * Rename a profile
     * @param {string} profileId - Profile to rename
     * @param {string} newName - New name
     * @returns {boolean} Success
     */
    renameProfile(profileId, newName) {
        const data = this._load();
        if (data.profiles[profileId]) {
            data.profiles[profileId].name = newName;
            this._save();
            this.emit('profiles-changed');
            return true;
        }
        return false;
    }

    /**
     * Delete a profile
     * @param {string} profileId - Profile to delete
     * @returns {boolean} Success
     */
    deleteProfile(profileId) {
        const data = this._load();
        if (!data.profiles[profileId]) return false;

        const profileIds = Object.keys(data.profiles);

        // If deleting the active profile, switch to another one
        if (data.activeProfileId === profileId) {
            const remaining = profileIds.filter((id) => id !== profileId);
            data.activeProfileId = remaining.length > 0 ? remaining[0] : null;
        }
        delete data.profiles[profileId];
        this._save();
        this.emit('profiles-changed');
        return true;
    }

    /**
     * Set a profile's position mode
     * @param {string} profileId - Profile to update
     * @param {string} mode - Position mode: 'grid' or 'coordinate'
     */
    setProfilePositionMode(profileId, mode) {
        const data = this._load();
        const profile = data.profiles[profileId];
        if (profile && (mode === PositionMode.GRID || mode === PositionMode.COORDINATE)) {
            profile.positionMode = mode;
            // Ensure grid values exist when switching to grid mode
            if (mode === PositionMode.GRID) {
                if (!profile.gridColumns) profile.gridColumns = DefaultProfile.gridColumns;
                if (!profile.gridRows) profile.gridRows = DefaultProfile.gridRows;
            }
            this._save();
            if (profileId === data.activeProfileId) {
                this.emit('profiles-changed');
            }
        }
    }

    /**
     * Set a profile's grid size
     * @param {string} profileId - Profile to update
     * @param {number} columns - Number of columns
     * @param {number} rows - Number of rows
     */
    setProfileGridSize(profileId, columns, rows) {
        const data = this._load();
        const profile = data.profiles[profileId];
        if (profile) {
            const newCols = Math.max(GridLimits.MIN, Math.min(GridLimits.MAX, columns));
            const newRows = Math.max(GridLimits.MIN, Math.min(GridLimits.MAX, rows));
            profile.gridColumns = newCols;
            profile.gridRows = newRows;

            // Clamp widget positions to new grid bounds
            if (profile.widgets) {
                for (const widget of profile.widgets) {
                    if (widget.gridCol !== undefined) {
                        widget.gridCol = Math.min(widget.gridCol, newCols);
                    }
                    if (widget.gridRow !== undefined) {
                        widget.gridRow = Math.min(widget.gridRow, newRows);
                    }
                }
            }

            this._save();
            if (profileId === data.activeProfileId) {
                this.emit('profiles-changed');
            }
        }
    }

    /**
     * Add a widget to a profile
     * @param {string} profileId - Target profile
     * @param {Object} widgetData - Widget configuration
     */
    addWidget(profileId, widgetData) {
        const data = this._load();
        const profile = data.profiles[profileId];
        if (profile) {
            if (!widgetData.uuid) widgetData.uuid = GLib.uuid_string_random();
            // Set default grid position if in grid mode
            if (profile.positionMode === PositionMode.GRID) {
                widgetData.gridCol = widgetData.gridCol ?? profile.gridColumns / 2;
                widgetData.gridRow = widgetData.gridRow ?? profile.gridRows / 2;
            }
            profile.widgets.push(widgetData);
            this._save();
            if (profileId === data.activeProfileId) {
                this.emit('profiles-changed');
            }
        }
    }

    /**
     * Remove a widget from a profile
     * @param {string} profileId - Target profile
     * @param {string} widgetUuid - Widget UUID to remove
     */
    removeWidget(profileId, widgetUuid) {
        const data = this._load();
        const profile = data.profiles[profileId];
        if (profile) {
            const idx = profile.widgets.findIndex((w) => w.uuid === widgetUuid);
            if (idx !== -1) {
                profile.widgets.splice(idx, 1);
                this._save();
                if (profileId === data.activeProfileId) {
                    this.emit('profiles-changed');
                }
            }
        }
    }

    /**
     * Reorder a widget within a profile
     * @param {string} profileId - Target profile
     * @param {string} widgetUuid - Widget UUID to move
     * @param {number} newIndex - New index position
     */
    reorderWidget(profileId, widgetUuid, newIndex) {
        const data = this._load();
        const profile = data.profiles[profileId];
        if (!profile) return;

        const oldIndex = profile.widgets.findIndex((w) => w.uuid === widgetUuid);
        if (oldIndex === -1 || oldIndex === newIndex) return;

        const [widget] = profile.widgets.splice(oldIndex, 1);
        profile.widgets.splice(newIndex, 0, widget);
        this._save();

        if (profileId === data.activeProfileId) {
            this.emit('profiles-changed');
        }
    }

    /**
     * Update a widget's position
     * @param {string} profileId - Target profile
     * @param {string} widgetUuid - Widget UUID
     * @param {Object} position - Position data with gridCol, gridRow, x, y, or anchor
     */
    updateWidgetPosition(profileId, widgetUuid, position) {
        const data = this._load();
        const profile = data.profiles[profileId];
        if (profile) {
            const widget = profile.widgets.find((w) => w.uuid === widgetUuid);
            if (widget) {
                if (position.gridCol !== undefined) widget.gridCol = position.gridCol;
                if (position.gridRow !== undefined) widget.gridRow = position.gridRow;
                if (position.x !== undefined) widget.x = position.x;
                if (position.y !== undefined) widget.y = position.y;
                if (position.anchor !== undefined) widget.anchor = position.anchor;
                this._save();
                if (profileId === data.activeProfileId) {
                    this.emit('profiles-changed');
                }
            }
        }
    }

    /**
     * Update a widget's configuration
     * @param {string} profileId - Target profile
     * @param {string} widgetUuid - Widget UUID
     * @param {Object} config - Configuration to merge
     */
    updateWidgetConfig(profileId, widgetUuid, config) {
        const data = this._load();
        const profile = data.profiles[profileId];
        if (profile) {
            const widget = profile.widgets.find((w) => w.uuid === widgetUuid);
            if (widget) {
                widget.config = { ...widget.config, ...config };
                this._save();
                if (profileId === data.activeProfileId) {
                    this.emit('profiles-changed');
                }
            }
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
        this._signals.clear();
        this._cache = null;
    }
}
