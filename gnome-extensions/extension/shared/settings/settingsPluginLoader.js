import Adw from 'gi://Adw';

/**
 * Load plugin settings into widget and appearance pages
 * @param {Object} widget - Widget data with type and config
 * @param {Adw.PreferencesPage} widgetPage - Page for widget-specific settings
 * @param {Adw.PreferencesPage} appearancePage - Page for appearance settings
 * @param {Function} onConfigChange - Callback when config changes
 * @param {PluginRegistry} pluginRegistry - For getting settings builder
 */
export async function loadPluginSettings(widget, widgetPage, appearancePage, onConfigChange, pluginRegistry) {
    try {
        const buildSettings = await pluginRegistry.getSettingsBuilder(widget.type);
        if (!buildSettings) {
            console.log('[DesktopWidgets] No settings builder found for:', widget.type);
            return;
        }

        console.log('[DesktopWidgets] Building settings for:', widget.type);
        const result = buildSettings(widget.config || {}, onConfigChange);
        console.log('[DesktopWidgets] Settings result:', result);

        let contentGroups = [];
        let appearanceGroups = [];

        if (Array.isArray(result)) {
            contentGroups = result;
        } else if (result && typeof result === 'object') {
            contentGroups = result.contentGroups || [];
            appearanceGroups = result.appearanceGroups || [];
        }

        for (const group of contentGroups) {
            if (group) widgetPage.add(group);
        }

        if (appearanceGroups.length > 0) {
            for (const group of appearanceGroups) {
                if (group) appearancePage.add(group);
            }
        } else {
            const emptyGroup = new Adw.PreferencesGroup();
            const emptyRow = new Adw.ActionRow({ title: 'No Style Settings' });
            emptyGroup.add(emptyRow);
            appearancePage.add(emptyGroup);
        }
    } catch (e) {
        console.error('[DesktopWidgets] Failed to load settings builder:', e);
    }
}
