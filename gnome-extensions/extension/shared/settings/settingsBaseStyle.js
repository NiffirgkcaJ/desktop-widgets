import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
import Pango from 'gi://Pango';

import { DefaultStyle } from '../constants/constantStyleDefaults.js';

// Opacity spin button config from 0 to 100 percent
const OPACITY_LOWER = 0;
const OPACITY_UPPER = 100;
const OPACITY_STEP = 5;
const OPACITY_MULTIPLIER = 100;

// Font config
const FONT_SIZE_LOWER = 8;
const FONT_SIZE_UPPER = 128;
const LETTER_SPACING_LOWER = -10;
const LETTER_SPACING_UPPER = 20;

// Border config
const BORDER_WIDTH_UPPER = 20;
const BORDER_RADIUS_UPPER = 50;

// Spacing config
const SPACING_UPPER = 50;

// Shadow offset config
const SHADOW_OFFSET_LOWER = -20;
const SHADOW_OFFSET_UPPER = 20;
const TEXT_SHADOW_BLUR_UPPER = 20;
const BOX_SHADOW_BLUR_UPPER = 30;
const BOX_SHADOW_SPREAD_LOWER = -10;
const BOX_SHADOW_SPREAD_UPPER = 20;

// Default weight index corresponding to Bold
const DEFAULT_WEIGHT_INDEX = 6;

// Default text align index corresponding to Center
const DEFAULT_ALIGN_INDEX = 1;

// Font weight options
const FONT_WEIGHTS = [
    { label: 'Thin', value: '100' },
    { label: 'Extra Light', value: '200' },
    { label: 'Light', value: '300' },
    { label: 'Regular', value: '400' },
    { label: 'Medium', value: '500' },
    { label: 'Semi Bold', value: '600' },
    { label: 'Bold', value: '700' },
    { label: 'Extra Bold', value: '800' },
    { label: 'Black', value: '900' },
];

// Text alignment options
const TEXT_ALIGNMENTS = [
    { label: 'Left', value: 'left' },
    { label: 'Center', value: 'center' },
    { label: 'Right', value: 'right' },
];

/**
 * Get style value with fallback to default
 * @param {Object} style - User style object
 * @param {string} key - Style property key
 * @returns {*} Value from style or default
 */
function getStyleValue(style, key) {
    const val = style[key];
    return val !== null && val !== undefined ? val : DefaultStyle[key];
}

/**
 * Convert RGBA to hex color string
 * @param {Gdk.RGBA} rgba - RGBA color object
 * @returns {string} Hex color string like #rrggbb
 */
function rgbaToHex(rgba) {
    const r = Math.round(rgba.red * 255)
        .toString(16)
        .padStart(2, '0');
    const g = Math.round(rgba.green * 255)
        .toString(16)
        .padStart(2, '0');
    const b = Math.round(rgba.blue * 255)
        .toString(16)
        .padStart(2, '0');
    return `#${r}${g}${b}`;
}

/**
 * Create a spin button row
 * @param {string} title - Row title
 * @param {string} styleKey - Style property key
 * @param {Object} style - Current style object
 * @param {Function} onStyleChange - Callback when value changes
 * @param {Object} options - Spin button options
 * @returns {Adw.ActionRow} Configured action row with spin button
 */
function createSpinRow(title, styleKey, style, onStyleChange, options = {}) {
    const { lower = 0, upper = 100, step = 1, multiplier = 1, subtitle = null } = options;
    const row = new Adw.ActionRow({ title, subtitle });
    const spin = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower,
            upper,
            step_increment: step,
            page_increment: step * 10,
            value: (getStyleValue(style, styleKey) ?? lower) * multiplier,
        }),
        valign: Gtk.Align.CENTER,
    });
    spin.connect('value-changed', () => {
        onStyleChange(styleKey, spin.get_value() / multiplier);
    });
    row.add_suffix(spin);
    return row;
}

/**
 * Create a color button row
 * @param {string} title - Row title
 * @param {string} styleKey - Style property key
 * @param {Object} style - Current style object
 * @param {Function} onStyleChange - Callback when value changes
 * @param {Object} options - Color button options
 * @returns {Adw.ActionRow} Configured action row with color button
 */
function createColorRow(title, styleKey, style, onStyleChange, options = {}) {
    const { useAlpha = false, outputFormat = 'string' } = options;
    const row = new Adw.ActionRow({ title });
    const btn = new Gtk.ColorButton({
        valign: Gtk.Align.CENTER,
        use_alpha: useAlpha,
    });
    const currentColor = getStyleValue(style, styleKey);
    if (currentColor) {
        const rgba = new Gdk.RGBA();
        if (rgba.parse(currentColor)) {
            btn.set_rgba(rgba);
        }
    }
    btn.connect('color-set', () => {
        const rgba = btn.get_rgba();
        const value = outputFormat === 'hex' ? rgbaToHex(rgba) : rgba.to_string();
        onStyleChange(styleKey, value);
    });
    row.add_suffix(btn);
    return row;
}

/**
 * Build font settings section
 * @param {Adw.PreferencesGroup} group - Group to add rows to
 * @param {Object} style - Current style object
 * @param {Function} onStyleChange - Callback when style changes
 */
function buildFontSettings(group, style, onStyleChange) {
    group.add(createColorRow('Color', 'fontColor', style, onStyleChange, { outputFormat: 'hex' }));

    group.add(
        createSpinRow('Opacity', 'fontOpacity', style, onStyleChange, {
            lower: OPACITY_LOWER,
            upper: OPACITY_UPPER,
            step: OPACITY_STEP,
            multiplier: OPACITY_MULTIPLIER,
        }),
    );

    const fontFamilyRow = new Adw.ActionRow({ title: 'Family' });
    const fontFamilyBtn = new Gtk.FontButton({
        valign: Gtk.Align.CENTER,
        use_font: true,
        use_size: false,
        level: Gtk.FontChooserLevel.FAMILY,
    });
    const currentFont = getStyleValue(style, 'fontFamily');
    if (currentFont) {
        fontFamilyBtn.set_font(currentFont);
    }
    fontFamilyBtn.connect('font-set', () => {
        const desc = Pango.FontDescription.from_string(fontFamilyBtn.get_font());
        onStyleChange('fontFamily', desc.get_family());
    });
    fontFamilyRow.add_suffix(fontFamilyBtn);
    group.add(fontFamilyRow);

    group.add(createSpinRow('Size', 'fontSize', style, onStyleChange, { lower: FONT_SIZE_LOWER, upper: FONT_SIZE_UPPER }));

    const fontWeightRow = new Adw.ActionRow({ title: 'Weight' });
    const fontWeightCombo = new Gtk.ComboBoxText({ valign: Gtk.Align.CENTER });
    for (const w of FONT_WEIGHTS) {
        fontWeightCombo.append_text(w.label);
    }
    const currentWeight = getStyleValue(style, 'fontWeight');
    const normalizedWeight = currentWeight === 'normal' ? '400' : currentWeight === 'bold' ? '700' : currentWeight;
    const currentWeightIndex = FONT_WEIGHTS.findIndex((w) => w.value === normalizedWeight);
    fontWeightCombo.set_active(currentWeightIndex >= 0 ? currentWeightIndex : DEFAULT_WEIGHT_INDEX);
    fontWeightCombo.connect('changed', () => {
        onStyleChange('fontWeight', FONT_WEIGHTS[fontWeightCombo.get_active()].value);
    });
    fontWeightRow.add_suffix(fontWeightCombo);
    group.add(fontWeightRow);

    group.add(createSpinRow('Letter Spacing', 'letterSpacing', style, onStyleChange, { lower: LETTER_SPACING_LOWER, upper: LETTER_SPACING_UPPER }));

    const textAlignRow = new Adw.ActionRow({ title: 'Text Align' });
    const textAlignCombo = new Gtk.ComboBoxText({ valign: Gtk.Align.CENTER });
    for (const a of TEXT_ALIGNMENTS) {
        textAlignCombo.append_text(a.label);
    }
    const currentAlign = getStyleValue(style, 'textAlign') || 'center';
    const currentAlignIndex = TEXT_ALIGNMENTS.findIndex((a) => a.value === currentAlign);
    textAlignCombo.set_active(currentAlignIndex >= 0 ? currentAlignIndex : DEFAULT_ALIGN_INDEX);
    textAlignCombo.connect('changed', () => {
        onStyleChange('textAlign', TEXT_ALIGNMENTS[textAlignCombo.get_active()].value);
    });
    textAlignRow.add_suffix(textAlignCombo);
    group.add(textAlignRow);
}

/**
 * Build background settings group with enable switch
 * @param {Object} style - Current style object
 * @param {Function} onStyleChange - Callback when style changes
 * @returns {Adw.PreferencesGroup} Background settings group
 */
function buildBackgroundGroup(style, onStyleChange) {
    const group = new Adw.PreferencesGroup({ title: 'Background' });

    const colorRow = createColorRow('Color', 'backgroundColor', style, onStyleChange, { outputFormat: 'hex' });
    const opacityRow = createSpinRow('Opacity', 'backgroundOpacity', style, onStyleChange, {
        lower: OPACITY_LOWER,
        upper: OPACITY_UPPER,
        step: OPACITY_STEP,
        multiplier: OPACITY_MULTIPLIER,
    });

    const dependentRows = [colorRow, opacityRow];
    const isEnabled = style.background ?? DefaultStyle.background;
    const switchRow = new Adw.ActionRow({ title: 'Enable Background' });
    const sw = new Gtk.Switch({ active: isEnabled, valign: Gtk.Align.CENTER });

    for (const row of dependentRows) row.set_visible(isEnabled);

    sw.connect('notify::active', () => {
        const active = sw.active;
        for (const row of dependentRows) row.set_visible(active);
        onStyleChange('background', active);
    });

    switchRow.add_suffix(sw);
    switchRow.set_activatable_widget(sw);
    group.add(switchRow);

    for (const row of dependentRows) group.add(row);

    return group;
}

/**
 * Build border settings group with enable switch
 * @param {Object} style - Current style object
 * @param {Function} onStyleChange - Callback when style changes
 * @returns {Adw.PreferencesGroup} Border settings group
 */
function buildBorderGroup(style, onStyleChange) {
    const group = new Adw.PreferencesGroup({ title: 'Border' });

    const colorRow = createColorRow('Color', 'borderColor', style, onStyleChange, { outputFormat: 'hex' });
    const opacityRow = createSpinRow('Opacity', 'borderOpacity', style, onStyleChange, {
        lower: OPACITY_LOWER,
        upper: OPACITY_UPPER,
        step: OPACITY_STEP,
        multiplier: OPACITY_MULTIPLIER,
    });
    const widthRow = createSpinRow('Width', 'borderWidth', style, onStyleChange, { upper: BORDER_WIDTH_UPPER });
    const radiusRow = createSpinRow('Radius', 'borderRadius', style, onStyleChange, { upper: BORDER_RADIUS_UPPER });

    const dependentRows = [colorRow, opacityRow, widthRow, radiusRow];
    const isEnabled = style.border ?? DefaultStyle.border;
    const switchRow = new Adw.ActionRow({ title: 'Enable Border' });
    const sw = new Gtk.Switch({ active: isEnabled, valign: Gtk.Align.CENTER });

    for (const row of dependentRows) row.set_visible(isEnabled);

    sw.connect('notify::active', () => {
        const active = sw.active;
        for (const row of dependentRows) row.set_visible(active);
        onStyleChange('border', active);
    });

    switchRow.add_suffix(sw);
    switchRow.set_activatable_widget(sw);
    group.add(switchRow);

    for (const row of dependentRows) group.add(row);

    return group;
}

/**
 * Build spacing settings group
 * @param {Object} style - Current style object
 * @param {Function} onStyleChange - Callback when style changes
 * @returns {Adw.PreferencesGroup} Spacing settings group
 */
function buildSpacingGroup(style, onStyleChange) {
    const group = new Adw.PreferencesGroup({ title: 'Spacing' });
    group.add(createSpinRow('Padding', 'padding', style, onStyleChange, { upper: SPACING_UPPER }));
    group.add(createSpinRow('Margin', 'margin', style, onStyleChange, { upper: SPACING_UPPER }));
    return group;
}

/**
 * Build text shadow settings group with enable switch
 * @param {Object} style - Current style object
 * @param {Function} onStyleChange - Callback when style changes
 * @returns {Adw.PreferencesGroup} Text shadow settings group
 */
function buildTextShadowGroup(style, onStyleChange) {
    const group = new Adw.PreferencesGroup({ title: 'Text Shadow' });

    const colorRow = createColorRow('Color', 'textShadowColor', style, onStyleChange, { outputFormat: 'hex' });
    const opacityRow = createSpinRow('Opacity', 'textShadowOpacity', style, onStyleChange, {
        lower: OPACITY_LOWER,
        upper: OPACITY_UPPER,
        step: OPACITY_STEP,
        multiplier: OPACITY_MULTIPLIER,
    });
    const offsetXRow = createSpinRow('Offset X', 'textShadowOffsetX', style, onStyleChange, { lower: SHADOW_OFFSET_LOWER, upper: SHADOW_OFFSET_UPPER });
    const offsetYRow = createSpinRow('Offset Y', 'textShadowOffsetY', style, onStyleChange, { lower: SHADOW_OFFSET_LOWER, upper: SHADOW_OFFSET_UPPER });
    const blurRow = createSpinRow('Blur', 'textShadowBlur', style, onStyleChange, { upper: TEXT_SHADOW_BLUR_UPPER });

    const dependentRows = [colorRow, opacityRow, offsetXRow, offsetYRow, blurRow];
    const isEnabled = getStyleValue(style, 'textShadow') === true;
    const switchRow = new Adw.ActionRow({ title: 'Enable Text Shadow' });
    const sw = new Gtk.Switch({ active: isEnabled, valign: Gtk.Align.CENTER });

    for (const row of dependentRows) row.set_visible(isEnabled);

    sw.connect('notify::active', () => {
        const active = sw.active;
        for (const row of dependentRows) row.set_visible(active);
        onStyleChange('textShadow', active);
    });

    switchRow.add_suffix(sw);
    switchRow.set_activatable_widget(sw);
    group.add(switchRow);

    for (const row of dependentRows) group.add(row);

    return group;
}

/**
 * Build box shadow settings group with enable switch
 * @param {Object} style - Current style object
 * @param {Function} onStyleChange - Callback when style changes
 * @returns {Adw.PreferencesGroup} Box shadow settings group
 */
function buildBoxShadowGroup(style, onStyleChange) {
    const group = new Adw.PreferencesGroup({ title: 'Box Shadow' });

    const colorRow = createColorRow('Color', 'boxShadowColor', style, onStyleChange, { outputFormat: 'hex' });
    const opacityRow = createSpinRow('Opacity', 'boxShadowOpacity', style, onStyleChange, {
        lower: OPACITY_LOWER,
        upper: OPACITY_UPPER,
        step: OPACITY_STEP,
        multiplier: OPACITY_MULTIPLIER,
    });
    const offsetXRow = createSpinRow('Offset X', 'boxShadowOffsetX', style, onStyleChange, { lower: SHADOW_OFFSET_LOWER, upper: SHADOW_OFFSET_UPPER });
    const offsetYRow = createSpinRow('Offset Y', 'boxShadowOffsetY', style, onStyleChange, { lower: SHADOW_OFFSET_LOWER, upper: SHADOW_OFFSET_UPPER });
    const blurRow = createSpinRow('Blur', 'boxShadowBlur', style, onStyleChange, { upper: BOX_SHADOW_BLUR_UPPER });
    const spreadRow = createSpinRow('Spread', 'boxShadowSpread', style, onStyleChange, { lower: BOX_SHADOW_SPREAD_LOWER, upper: BOX_SHADOW_SPREAD_UPPER });

    const dependentRows = [colorRow, opacityRow, offsetXRow, offsetYRow, blurRow, spreadRow];
    const isEnabled = getStyleValue(style, 'boxShadow') === true;
    const switchRow = new Adw.ActionRow({ title: 'Enable Box Shadow' });
    const sw = new Gtk.Switch({ active: isEnabled, valign: Gtk.Align.CENTER });

    for (const row of dependentRows) row.set_visible(isEnabled);

    sw.connect('notify::active', () => {
        const active = sw.active;
        for (const row of dependentRows) row.set_visible(active);
        onStyleChange('boxShadow', active);
    });

    switchRow.add_suffix(sw);
    switchRow.set_activatable_widget(sw);
    group.add(switchRow);

    for (const row of dependentRows) group.add(row);

    return group;
}

/**
 * Build settings groups for base style options
 * @param {Object} style - Current style config
 * @param {Function} onStyleChange - Callback when style changes
 * @returns {Adw.PreferencesGroup[]} Array of settings groups
 */
export function buildBaseStyleSettings(style, onStyleChange) {
    const groups = [];

    const fontGroup = new Adw.PreferencesGroup({ title: 'Typography' });
    buildFontSettings(fontGroup, style, onStyleChange);
    groups.push(fontGroup);

    groups.push(buildBackgroundGroup(style, onStyleChange));
    groups.push(buildBorderGroup(style, onStyleChange));
    groups.push(buildSpacingGroup(style, onStyleChange));
    groups.push(buildTextShadowGroup(style, onStyleChange));
    groups.push(buildBoxShadowGroup(style, onStyleChange));

    return groups;
}
