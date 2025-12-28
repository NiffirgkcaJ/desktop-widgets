import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import { buildBaseStyleSettings } from '../../shared/settings/settingsBaseStyle.js';
import { TextDefaults } from '../../shared/utilities/utilityText.js';

const DEFAULT_TEXT = 'Hello, World!';

/**
 * Build settings UI for the Custom Text widget
 * @param {Object} config - Current widget configuration
 * @param {Function} onConfigChange - Callback when config changes: (key, value) => void
 * @returns {Adw.PreferencesGroup[]} Array of settings groups
 */
export function buildSettings(config, onConfigChange) {
    const contentGroups = [];
    const appearanceGroups = [];

    // Widget-specific settings
    const textGroup = new Adw.PreferencesGroup({ title: 'Text Settings' });

    const textRow = new Adw.ActionRow({
        title: 'Display Text',
        subtitle: 'The text to show on the desktop',
    });
    const textEntry = new Gtk.Entry({
        text: config.text || DEFAULT_TEXT,
        valign: Gtk.Align.CENTER,
        hexpand: true,
        width_chars: TextDefaults.ENTRY_WIDTH_CHARS,
    });
    textEntry.connect('changed', () => {
        onConfigChange('text', textEntry.get_text());
    });
    textRow.add_suffix(textEntry);
    textGroup.add(textRow);
    contentGroups.push(textGroup);

    // Appearance settings
    let currentStyle = { ...(config.style || {}) };
    const onStyleChange = (key, value) => {
        currentStyle = { ...currentStyle, [key]: value };
        onConfigChange('style', currentStyle);
    };
    appearanceGroups.push(...buildBaseStyleSettings(currentStyle, onStyleChange));

    return { contentGroups, appearanceGroups };
}
