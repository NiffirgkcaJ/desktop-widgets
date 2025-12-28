import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import { buildBaseStyleSettings } from '../../shared/settings/settingsBaseStyle.js';
import { FormatPresets, formatDateTime } from '../../shared/utilities/utilityDateFormat.js';
import { truncateLines, TextDefaults } from '../../shared/utilities/utilityText.js';

const DEFAULT_FORMAT = 'HH:mm:ss';
const PREVIEW_INTERVAL_SECONDS = 1;

/**
 * Build settings UI for the DateTime widget
 * @param {Object} config - Current widget configuration
 * @param {Function} onConfigChange - Callback when config changes: (key, value) => void
 * @returns {Adw.PreferencesGroup[]} Array of settings groups
 */
export function buildSettings(config, onConfigChange) {
    const contentGroups = [];
    const appearanceGroups = [];

    // Widget-specific settings
    const formatGroup = new Adw.PreferencesGroup({ title: 'Format' });

    // Format string entry
    const formatRow = new Adw.ActionRow({
        title: 'Format String',
        subtitle: 'Luxon-style format (e.g., HH:mm:ss, MMMM d, yyyy)',
    });
    const formatEntry = new Gtk.Entry({
        text: config.format || DEFAULT_FORMAT,
        valign: Gtk.Align.CENTER,
        hexpand: true,
        width_chars: TextDefaults.ENTRY_WIDTH_CHARS,
    });
    formatRow.add_suffix(formatEntry);
    formatGroup.add(formatRow);

    // Presets dropdown
    const presetRow = new Adw.ActionRow({
        title: 'Presets',
        subtitle: 'Select a common format',
    });
    const presets = FormatPresets;
    const presetModel = new Gtk.StringList();
    presetModel.append('Custom');
    presets.forEach((p) => presetModel.append(p.name));

    const presetDropdown = new Gtk.DropDown({
        model: presetModel,
        valign: Gtk.Align.CENTER,
    });

    // Find current preset index
    const currentFormat = config.format || DEFAULT_FORMAT;
    const presetIndex = presets.findIndex((p) => p.format === currentFormat);
    presetDropdown.set_selected(presetIndex >= 0 ? presetIndex + 1 : 0);

    presetRow.add_suffix(presetDropdown);
    formatGroup.add(presetRow);

    // Live preview
    const previewRow = new Adw.ActionRow({
        title: 'Preview',
        subtitle: 'Current time in selected format',
    });
    const previewLabel = new Gtk.Label({
        label: truncateLines(formatDateTime(currentFormat)),
        valign: Gtk.Align.CENTER,
        css_classes: ['dim-label'],
        max_width_chars: TextDefaults.PREVIEW_MAX_CHARS,
    });
    previewRow.add_suffix(previewLabel);
    formatGroup.add(previewRow);

    // Update preview periodically
    const updatePreview = () => {
        previewLabel.label = truncateLines(formatDateTime(formatEntry.text || DEFAULT_FORMAT));
        return GLib.SOURCE_CONTINUE;
    };
    const previewTimeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, PREVIEW_INTERVAL_SECONDS, updatePreview);

    // Clean up timer when widget is destroyed
    previewLabel.connect('destroy', () => {
        if (previewTimeoutId) GLib.source_remove(previewTimeoutId);
    });

    // Guard flag to prevent circular updates between entry and dropdown
    let updatingFromPreset = false;

    // Connect format entry changes
    formatEntry.connect('changed', () => {
        if (updatingFromPreset) return;

        const newFormat = formatEntry.text;
        onConfigChange('format', newFormat);
        updatePreview();

        // Update dropdown to "Custom" if format doesn't match any preset
        const matchingPreset = presets.findIndex((p) => p.format === newFormat);
        presetDropdown.set_selected(matchingPreset >= 0 ? matchingPreset + 1 : 0);
    });

    // Connect preset dropdown changes
    presetDropdown.connect('notify::selected', () => {
        const selected = presetDropdown.selected;
        if (selected > 0) {
            const preset = presets[selected - 1];
            updatingFromPreset = true;
            formatEntry.text = preset.format;
            onConfigChange('format', preset.format);
            updatePreview();
            updatingFromPreset = false;
        }
    });

    contentGroups.push(formatGroup);

    // Appearance settings
    let currentStyle = { ...(config.style || {}) };
    const onStyleChange = (key, value) => {
        currentStyle = { ...currentStyle, [key]: value };
        onConfigChange('style', currentStyle);
    };
    appearanceGroups.push(...buildBaseStyleSettings(currentStyle, onStyleChange));

    return { contentGroups, appearanceGroups };
}
