import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { applyAnchor } from './shared/utilities/utilityAnchor.js';
import { PluginRegistry } from './shared/services/servicePluginRegistry.js';
import { ConfigManager, PositionMode } from './shared/services/serviceConfig.js';
import { buildContainerCSS, buildTextCSS, applyTextAlignment, mergeStyles } from './shared/utilities/utilityWidgetStyle.js';

const DEFAULT_GRID_COLUMNS = 6;
const DEFAULT_GRID_ROWS = 4;
const DEFAULT_COORDINATE = 100;
const DEFAULT_ANCHOR = 'center-center';

/**
 * WidgetCanvas
 * @class
 * @classdesc WidgetCanvas is the main class that handles the widget canvas.
 */
class WidgetCanvas {
    /**
     * @param {ConfigManager} configManager
     * @param {PluginRegistry} pluginRegistry
     */
    constructor(configManager, pluginRegistry) {
        this._configManager = configManager;
        this._pluginRegistry = pluginRegistry;
        this._activeWidgets = new Map();

        const monitor = Main.layoutManager.primaryMonitor;
        this._container = new St.Widget({
            name: 'DesktopWidgetsCanvas',
            reactive: false,
            x: monitor.x,
            y: monitor.y,
            width: monitor.width,
            height: monitor.height,
        });

        this._settingsChangedId = this._configManager.connect('profiles-changed', () => {
            this._render();
        });
    }

    /**
     * Add the widget container to the desktop layout
     */
    addToDesktop() {
        const bgGroup = Main.layoutManager._backgroundGroup;
        if (bgGroup) {
            bgGroup.add_child(this._container);
        } else {
            Main.layoutManager.uiGroup.add_child(this._container);
        }
    }

    /**
     * Destroy the canvas and all widgets
     */
    destroy() {
        this._configManager.disconnect('profiles-changed', this._settingsChangedId);
        this._container.destroy();
        this._activeWidgets.clear();
    }

    /**
     * Render the widgets
     */
    async _render() {
        this._clearWidgets();
        const profileId = this._configManager.getActiveProfileId();
        const profile = this._configManager.getProfile(profileId);
        if (!profile || !profile.widgets || profile.widgets.length === 0) return;

        await Promise.allSettled(profile.widgets.map((widgetData) => this._addWidget(widgetData, profile)));
    }

    /**
     * Clear the widgets
     */
    _clearWidgets() {
        for (const { actor, signalId } of this._activeWidgets.values()) {
            if (signalId) actor.disconnect(signalId);
            actor.destroy();
        }
        this._activeWidgets.clear();
    }

    /**
     * Calculate the position of the widget
     * @param {Object} widgetData - The widget data
     * @param {Object} profile - The profile
     * @returns {Object} The position of the widget
     */
    _calculatePosition(widgetData, profile) {
        const monitor = Main.layoutManager.primaryMonitor;
        if (profile.positionMode === PositionMode.GRID) {
            const gridCols = profile.gridColumns || DEFAULT_GRID_COLUMNS;
            const gridRows = profile.gridRows || DEFAULT_GRID_ROWS;
            const cellWidth = monitor.width / gridCols;
            const cellHeight = monitor.height / gridRows;

            const col = widgetData.gridCol ?? gridCols / 2;
            const row = widgetData.gridRow ?? gridRows / 2;

            return {
                x: col * cellWidth,
                y: row * cellHeight,
            };
        } else {
            return {
                x: widgetData.x || DEFAULT_COORDINATE,
                y: widgetData.y || DEFAULT_COORDINATE,
            };
        }
    }

    /**
     * Add a widget to the canvas
     * @param {Object} widgetData - The widget data
     * @param {Object} profile - The profile
     */
    async _addWidget(widgetData, profile) {
        const createWidget = await this._pluginRegistry.getWidgetFactory(widgetData.type);
        if (!createWidget) {
            console.error('[DesktopWidgets] No factory for widget type:', widgetData.type);
            return;
        }

        const pluginMeta = this._pluginRegistry.getPluginMetadata(widgetData.type);
        const anchor = widgetData.anchor || (pluginMeta && pluginMeta.anchor) || DEFAULT_ANCHOR;

        const widgetActor = createWidget(widgetData.config || {});
        const { x, y } = this._calculatePosition(widgetData, profile);

        const styleConfig = widgetData.config?.style || {};
        const containerCSS = buildContainerCSS(styleConfig);
        const textCSS = buildTextCSS(styleConfig);

        if (containerCSS) widgetActor.set_style(containerCSS);

        const childLabel = widgetActor.get_child ? widgetActor.get_child() : null;
        if (childLabel) {
            if (textCSS) childLabel.set_style(textCSS);
            const fullStyle = mergeStyles(styleConfig);
            applyTextAlignment(childLabel, fullStyle.textAlign);
        }

        const positionWidget = () => {
            if (widgetActor.width === 0 && widgetActor.height === 0) return;
            const pos = applyAnchor(x, y, widgetActor.width, widgetActor.height, anchor);
            widgetActor.set_position(pos.x, pos.y);
        };

        const signalId = widgetActor.connect('notify::allocation', positionWidget);

        this._container.add_child(widgetActor);
        this._activeWidgets.set(widgetData.uuid, { actor: widgetActor, signalId });
    }
}

/**
 * DesktopWidgetsExtension
 * @class
 * @classdesc DesktopWidgetsExtension is the main class that handles the extension.
 */
export default class DesktopWidgetsExtension extends Extension {
    /**
     * @param {Object} extension - The extension
     */
    async enable() {
        this._configManager = new ConfigManager(this);
        this._pluginRegistry = new PluginRegistry(this);

        await this._pluginRegistry.init();
        await this._pluginRegistry.loadStyles();

        this._canvas = new WidgetCanvas(this._configManager, this._pluginRegistry);
        this._canvas.addToDesktop();
        await this._canvas._render();
    }

    /**
     * Disable the extension
     */
    disable() {
        if (this._canvas) {
            this._canvas.destroy();
            this._canvas = null;
        }
        if (this._pluginRegistry) {
            this._pluginRegistry.destroy();
            this._pluginRegistry = null;
        }
    }
}
