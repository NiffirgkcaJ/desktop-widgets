import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

const DEFAULT_ICON_SIZE = 16;

/**
 * Create a static icon (Gtk.Image).
 * @param {Object} config - Icon config: { icon, iconSize, iconOptions }
 * @param {Object} [options={}] - Options: { styleClass }
 * @returns {Gtk.Image} Static icon widget
 */
export function createStaticIcon(config, options = {}) {
    const image = new Gtk.Image({
        icon_size: _getGtkIconSize(config.iconSize),
    });
    _applyIconConfig(image, config);
    if (options.styleClass) image.add_css_class(options.styleClass);
    return image;
}

/**
 * Create a dynamic icon that supports state-based switching (Gtk.Image).
 * @param {Object} states - State map: { stateName: iconConfig, ... }
 * @param {Object} [options={}] - Options: { initial, styleClass }
 * @returns {Gtk.Image} Image widget with `state` property for switching
 */
export function createDynamicIcon(states, options = {}) {
    const stateNames = Object.keys(states);
    const initialState = options.initial || stateNames[0];

    const firstConfig = states[stateNames[0]];
    const image = new Gtk.Image({
        icon_size: _getGtkIconSize(firstConfig.iconSize),
    });
    if (options.styleClass) image.add_css_class(options.styleClass);

    let _currentState = initialState;
    _applyIconConfig(image, states[_currentState]);

    Object.defineProperty(image, 'state', {
        get: () => _currentState,
        set: (newState) => {
            if (states[newState] && newState !== _currentState) {
                _currentState = newState;
                _applyIconConfig(image, states[_currentState]);
            }
        },
    });

    return image;
}

/**
 * Create a button with a static icon child (Gtk.Button).
 * @param {Object} config - Icon configuration object
 * @param {Object} [buttonParams={}] - Button parameters
 * @returns {Gtk.Button} Button with icon child
 */
export function createStaticIconButton(config, buttonParams = {}) {
    const { tooltip_text, iconStyleClass, ...otherParams } = buttonParams;
    const icon = createStaticIcon(config, { styleClass: iconStyleClass });

    const button = new Gtk.Button({
        child: icon,
        ...otherParams,
    });

    if (tooltip_text) button.set_tooltip_text(tooltip_text);
    return button;
}

/**
 * Create a button with a dynamic (stateful) icon child (Gtk.Button).
 * @param {Object} states - State map: { stateName: iconConfig, ... }
 * @param {Object} [buttonParams={}] - Button parameters
 * @returns {Gtk.Button} Button with dynamic icon child
 */
export function createDynamicIconButton(states, buttonParams = {}) {
    const { tooltip_text, initial, iconStyleClass, ...otherParams } = buttonParams;
    const icon = createDynamicIcon(states, { initial, styleClass: iconStyleClass });

    const button = new Gtk.Button({
        child: icon,
        ...otherParams,
    });

    if (tooltip_text) button.set_tooltip_text(tooltip_text);
    return button;
}

/**
 * Get the icon name string from a config object.
 * For cases where you need just the name (e.g., MenuButton.icon_name).
 * @param {string|Object} config - Icon name or config object
 * @returns {string} Icon name
 */
export function getIconName(config) {
    return typeof config === 'string' ? config : config.icon;
}

/**
 * Determine Gtk.IconSize from pixel size.
 * @param {number} pixelSize - Icon size in pixels
 * @returns {Gtk.IconSize}
 * @private
 */
function _getGtkIconSize(pixelSize) {
    return (pixelSize || DEFAULT_ICON_SIZE) <= DEFAULT_ICON_SIZE ? Gtk.IconSize.NORMAL : Gtk.IconSize.LARGE;
}

/**
 * Apply icon configuration to a Gtk.Image widget.
 * @param {Gtk.Image} imageWidget - The image widget to configure
 * @param {Object} iconConfig - Config with `icon` and optional `iconOptions`
 * @private
 */
function _applyIconConfig(imageWidget, iconConfig) {
    const iconName = typeof iconConfig === 'string' ? iconConfig : iconConfig.icon;
    const options = iconConfig.iconOptions || {};

    // Custom file vs system icon
    if (iconName && iconName.includes('.')) {
        const file = Gio.File.new_for_path(iconName);
        imageWidget.set_from_gicon(new Gio.FileIcon({ file }));
    } else {
        imageWidget.set_from_icon_name(iconName);
    }

    // Apply color via CSS
    if (options.color) {
        imageWidget.set_css_classes([...(imageWidget.css_classes || [])]);
        // GTK doesn't support inline color easily, would need custom CSS
    }
}
