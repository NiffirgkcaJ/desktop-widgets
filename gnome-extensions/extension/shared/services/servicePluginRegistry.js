import Gio from 'gi://Gio';

/**
 * PluginRegistry
 * @class
 * @classdesc Registry/Manager for discovering, loading, and managing widget plugins.
 */
export class PluginRegistry {
    /**
     * Create a new plugin registry
     * @param {Extension} extension - The extension instance
     */
    constructor(extension) {
        this._extension = extension;
        this._plugins = new Map();
        this._cssTokens = new Map();
    }

    /**
     * Initialize the registry by discovering all plugins
     */
    async init() {
        const pluginsDir = this._extension.dir.get_child('plugins');
        if (!pluginsDir.query_exists(null)) return;

        const enumerator = pluginsDir.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
        const pluginDirs = [];
        let fileInfo;
        while ((fileInfo = enumerator.next_file(null)) !== null) {
            if (fileInfo.get_file_type() === Gio.FileType.DIRECTORY) {
                const pluginName = fileInfo.get_name();
                pluginDirs.push({ dir: pluginsDir.get_child(pluginName), name: pluginName });
            }
        }
        enumerator.close(null);
        await Promise.all(pluginDirs.map((p) => this._registerPlugin(p.dir, p.name)));
    }

    /**
     * Register a single plugin from its directory
     * @param {Gio.File} pluginDir - Plugin directory
     * @param {string} dirName - Directory name as fallback ID
     */
    async _registerPlugin(pluginDir, dirName) {
        try {
            const metaFile = pluginDir.get_child('plugin.json');
            let meta = { id: dirName, name: dirName };
            if (metaFile.query_exists(null)) {
                const [success, contents] = metaFile.load_contents(null);
                if (success) {
                    try {
                        meta = JSON.parse(new TextDecoder().decode(contents));
                    } catch {
                        // Invalid JSON, use default meta
                    }
                }
            }
            this._plugins.set(meta.id, {
                meta: meta,
                dir: pluginDir,
                widgetModule: null,
                widgetPath: pluginDir.get_child('widget.js'),
                stylesPath: pluginDir.get_child('styles.css'),
            });
        } catch (e) {
            console.error(`[DesktopWidgets] Failed to register plugin ${dirName}:`, e);
        }
    }

    /**
     * Load CSS stylesheets for all registered plugins
     */
    async loadStyles() {
        try {
            const St = (await import('gi://St')).default;
            const theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
            for (const [id, plugin] of this._plugins) {
                if (plugin.stylesPath.query_exists(null)) {
                    theme.load_stylesheet(plugin.stylesPath);
                    this._cssTokens.set(id, plugin.stylesPath);
                }
            }
        } catch (e) {
            console.error('[DesktopWidgets] Failed to load styles:', e);
        }
    }

    /**
     * Get plugin metadata by type ID
     * @param {string} typeId - Plugin type identifier
     * @returns {Object|null} Plugin metadata or null if not found
     */
    getPluginMetadata(typeId) {
        const p = this._plugins.get(typeId);
        return p ? p.meta : null;
    }

    /**
     * Get all available plugin types
     * @returns {Object[]} Array of plugin metadata objects
     */
    getAvailableTypes() {
        return Array.from(this._plugins.values()).map((p) => p.meta);
    }

    /**
     * Get the widget factory function for a plugin
     * @param {string} typeId - Plugin type identifier
     * @returns {Function|null} createWidget function or null
     */
    async getWidgetFactory(typeId) {
        const plugin = this._plugins.get(typeId);
        if (!plugin || !plugin.widgetPath.query_exists(null)) return null;
        if (!plugin.widgetModule) {
            plugin.widgetModule = await import(plugin.widgetPath.get_uri());
        }
        return plugin.widgetModule.default ? plugin.widgetModule.default.createWidget : null;
    }

    /**
     * Get the settings builder function for a plugin
     * @param {string} typeId - Plugin type identifier
     * @returns {Function|null} buildSettings function or null
     */
    async getSettingsBuilder(typeId) {
        const plugin = this._plugins.get(typeId);
        if (!plugin) return null;

        const settingsPath = plugin.dir.get_child('settings.js');
        if (!settingsPath.query_exists(null)) return null;

        if (!plugin.settingsModule) {
            plugin.settingsModule = await import(settingsPath.get_uri());
        }
        return plugin.settingsModule.buildSettings || null;
    }

    /**
     * Clean up and unload all plugin resources
     */
    destroy() {
        if (this._cssTokens.size > 0) {
            import('gi://St')
                .then((module) => {
                    const St = module.default;
                    if (global.stage) {
                        const theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
                        for (const stylesheet of this._cssTokens.values()) {
                            theme.unload_stylesheet(stylesheet);
                        }
                    }
                })
                .catch(() => {});
        }
        this._plugins.clear();
        this._cssTokens.clear();
    }
}
