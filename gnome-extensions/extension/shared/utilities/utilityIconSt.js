import Gio from 'gi://Gio';
import St from 'gi://St';

const DEFAULT_ICON_SIZE = 16;

/**
 * Create a static icon.
 * @param {Object} config - Icon config: { icon, iconSize, iconOptions }
 * @param {Object} [options={}] - Options: { styleClass }
 * @returns {St.Icon} Static icon widget
 */
export function createStaticIcon(config, options = {}) {
    const styleClass = options.styleClass || 'system-status-icon';
    const icon = new St.Icon({
        icon_size: config.iconSize || DEFAULT_ICON_SIZE,
        style_class: styleClass,
    });
    _applyIconConfig(icon, config);
    return icon;
}

/**
 * Create a dynamic icon that supports state-based switching.
 * @param {Object} states - State map: { stateName: iconConfig, ... }
 * @param {Object} [options={}] - Options: { initial, styleClass }
 * @returns {St.Icon} Icon widget with `state` property for switching
 */
export function createDynamicIcon(states, options = {}) {
    const styleClass = options.styleClass || 'system-status-icon';
    const stateNames = Object.keys(states);
    const initialState = options.initial || stateNames[0];

    const firstConfig = states[stateNames[0]];
    const icon = new St.Icon({
        icon_size: firstConfig.iconSize || 16,
        style_class: styleClass,
    });

    let _currentState = initialState;
    _applyIconConfig(icon, states[_currentState]);

    Object.defineProperty(icon, 'state', {
        get: () => _currentState,
        set: (newState) => {
            if (states[newState] && newState !== _currentState) {
                _currentState = newState;
                _applyIconConfig(icon, states[_currentState]);
            }
        },
    });

    return icon;
}

/**
 * Create a button with a static icon child.
 * @param {Object} config - Icon configuration object
 * @param {Object} [buttonParams={}] - Button parameters
 * @returns {St.Button} Button with icon child
 */
export function createStaticIconButton(config, buttonParams = {}) {
    const { tooltip_text, iconStyleClass, ...otherParams } = buttonParams;
    const icon = createStaticIcon(config, { styleClass: iconStyleClass });

    const button = new St.Button({
        style_class: 'button',
        can_focus: true,
        child: icon,
        ...otherParams,
    });

    if (tooltip_text) button.tooltip_text = tooltip_text;
    return button;
}

/**
 * Create a button with a dynamic (stateful) icon child.
 * @param {Object} states - State map: { stateName: iconConfig, ... }
 * @param {Object} [buttonParams={}] - Button parameters
 * @returns {St.Button} Button with dynamic icon child
 */
export function createDynamicIconButton(states, buttonParams = {}) {
    const { tooltip_text, initial, iconStyleClass, ...otherParams } = buttonParams;
    const icon = createDynamicIcon(states, { initial, styleClass: iconStyleClass });

    const button = new St.Button({
        style_class: 'button',
        can_focus: true,
        child: icon,
        ...otherParams,
    });

    if (tooltip_text) button.tooltip_text = tooltip_text;
    return button;
}

/**
 * Apply icon configuration to an icon widget.
 * @param {St.Icon} iconWidget - The icon widget to configure
 * @param {Object} iconConfig - Config with `icon`, `iconSize`, and optional `iconOptions`
 * @private
 */
function _applyIconConfig(iconWidget, iconConfig) {
    const options = { ...iconConfig.iconOptions };
    if (iconConfig.iconSize) options.iconSize = iconConfig.iconSize;
    _setIcon(iconWidget, iconConfig.icon, options);
}

/**
 * Set the icon of an existing St.Icon widget.
 * Handles system icon names and custom SVG files (detected by file extension).
 * @param {St.Icon} iconWidget - The icon widget
 * @param {string} iconName - Icon name or filename (with extension for custom files)
 * @param {Object} [options={}] - Options: iconSize, color, opacity
 * @private
 */
function _setIcon(iconWidget, iconName, options = {}) {
    if (options.iconSize) iconWidget.set_icon_size(options.iconSize);

    const styles = [];
    if (options.color) styles.push(`color: ${options.color}`);
    iconWidget.set_style(styles.length > 0 ? styles.join('; ') + ';' : null);

    if (options.opacity !== undefined) {
        iconWidget.set_opacity(Math.round(options.opacity * 255));
    } else {
        iconWidget.set_opacity(255);
    }

    // Custom SVG files have extensions, system icons do not
    if (iconName && iconName.includes('.')) {
        const file = Gio.File.new_for_path(iconName);
        iconWidget.set_icon_name(null);
        iconWidget.set_gicon(new Gio.FileIcon({ file }));
    } else {
        iconWidget.set_gicon(null);
        iconWidget.set_icon_name(iconName);
    }
}
