import Clutter from 'gi://Clutter';

import { DefaultStyle } from '../constants/constantStyleDefaults.js';

/**
 * Merge user style with defaults
 * @param {Object} userStyle - User's style overrides
 * @returns {Object} Merged style configuration
 */
export function mergeStyles(userStyle) {
    return { ...DefaultStyle, ...(userStyle || {}) };
}

/**
 * Convert color to rgba with opacity
 * @param {string} color - Hex color or rgb format
 * @param {number} opacity - Opacity value from 0 to 1
 * @returns {string} rgba string or original color
 */
function colorToRgba(color, opacity = 1) {
    if (!color) return null;

    const rgbMatch = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i.exec(color);
    if (rgbMatch) {
        return `rgba(${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]},${opacity})`;
    }

    const hexResult = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    if (hexResult) {
        const r = parseInt(hexResult[1], 16);
        const g = parseInt(hexResult[2], 16);
        const b = parseInt(hexResult[3], 16);
        return `rgba(${r},${g},${b},${opacity})`;
    }

    const shortHex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(color);
    if (shortHex) {
        const r = parseInt(shortHex[1] + shortHex[1], 16);
        const g = parseInt(shortHex[2] + shortHex[2], 16);
        const b = parseInt(shortHex[3] + shortHex[3], 16);
        return `rgba(${r},${g},${b},${opacity})`;
    }

    return color;
}

/**
 * Build CSS for container elements like St.Bin
 * @param {Object} style - Style configuration object
 * @returns {string} CSS string for set_style() including background, border, padding, and box shadow
 */
export function buildContainerCSS(style) {
    const s = mergeStyles(style);
    const rules = [];

    if (s.background && s.backgroundColor) {
        const bgValue = colorToRgba(s.backgroundColor, s.backgroundOpacity);
        rules.push(`background-color: ${bgValue}`);
    }

    if (s.borderRadius > 0) rules.push(`border-radius: ${s.borderRadius}px`);
    if (s.border && s.borderWidth > 0 && s.borderColor) {
        const borderColor = colorToRgba(s.borderColor, s.borderOpacity ?? 1);
        rules.push(`border: ${s.borderWidth}px solid ${borderColor}`);
    }

    if (s.boxShadow) {
        const shadowColor = colorToRgba(s.boxShadowColor, s.boxShadowOpacity ?? 1);
        rules.push(`box-shadow: ${s.boxShadowOffsetX}px ${s.boxShadowOffsetY}px ${s.boxShadowBlur}px ${s.boxShadowSpread}px ${shadowColor}`);
    }

    if (s.padding > 0) rules.push(`padding: ${s.padding}px`);
    if (s.margin > 0) rules.push(`margin: ${s.margin}px`);
    if (s.maxWidth > 0) rules.push(`max-width: ${s.maxWidth}px`);
    if (s.maxHeight > 0) rules.push(`max-height: ${s.maxHeight}px`);

    return rules.join('; ');
}

/**
 * Build CSS for text elements like St.Label
 * @param {Object} style - Style configuration object
 * @returns {string} CSS string for set_style() including font, color, and text shadow
 */
export function buildTextCSS(style) {
    const s = mergeStyles(style);
    const rules = [];

    if (s.fontFamily) rules.push(`font-family: "${s.fontFamily}"`);
    if (s.fontSize) rules.push(`font-size: ${s.fontSize}px`);
    if (s.fontWeight) rules.push(`font-weight: ${s.fontWeight}`);
    if (s.fontColor) {
        const colorValue = s.fontOpacity < 1 ? colorToRgba(s.fontColor, s.fontOpacity) : s.fontColor;
        rules.push(`color: ${colorValue}`);
    }

    if (s.letterSpacing !== 0) rules.push(`letter-spacing: ${s.letterSpacing}px`);
    if (s.textAlign) rules.push(`text-align: ${s.textAlign}`);

    if (s.textShadow) {
        const shadowColor = colorToRgba(s.textShadowColor, s.textShadowOpacity ?? 1);
        rules.push(`text-shadow: ${s.textShadowOffsetX}px ${s.textShadowOffsetY}px ${s.textShadowBlur}px ${shadowColor}`);
    }

    return rules.join('; ');
}

/**
 * Build combined CSS for both container and text styles
 * @param {Object} style - Style configuration object
 * @returns {string} Combined CSS string
 * @deprecated Use buildContainerCSS and buildTextCSS separately
 */
export function buildStyleCSS(style) {
    const container = buildContainerCSS(style);
    const text = buildTextCSS(style);
    return [container, text].filter(Boolean).join('; ');
}

/**
 * Apply text alignment to an St.Label using clutter_text.x_align
 * @param {St.Label} label - The label to apply alignment to
 * @param {string} alignment - Alignment value: 'left', 'center', or 'right'
 */
export function applyTextAlignment(label, alignment) {
    if (!label || !label.clutter_text) return;

    switch (alignment) {
        case 'left':
            label.clutter_text.x_align = Clutter.ActorAlign.START;
            break;
        case 'right':
            label.clutter_text.x_align = Clutter.ActorAlign.END;
            break;
        case 'center':
        default:
            label.clutter_text.x_align = Clutter.ActorAlign.CENTER;
    }
}
