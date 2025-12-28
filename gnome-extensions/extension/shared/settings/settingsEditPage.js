import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import { buildPositionControls } from './settingsPosition.js';
import { getIconName } from '../utilities/utilityIconGtk.js';
import { Icons } from '../constants/constantIcons.js';
import { loadPluginSettings } from './settingsPluginLoader.js';
import { PositionMode } from '../services/serviceConfig.js';

/**
 * Build and push the edit page for a widget
 * @param {Object} params - Parameters object
 * @param {Object} params.widget - Widget data object
 * @param {Object} params.profile - Profile object
 * @param {Adw.NavigationView} params.navView - Navigation view to push page to
 * @param {PluginRegistry} params.pluginRegistry - Plugin registry instance
 * @param {ConfigManager} params.configManager - Config manager instance
 * @param {string} params.selectedProfileId - Currently selected profile ID
 * @param {Function} params.onSave - Callback after save
 */
export async function pushEditPage(params) {
    const { widget, profile, navView, pluginRegistry, configManager, selectedProfileId, onSave } = params;

    const meta = pluginRegistry.getPluginMetadata(widget.type);
    const widgetName = meta ? meta.name : widget.type;

    const editPage = new Adw.NavigationPage({
        title: `Edit: ${widgetName}`,
        tag: 'widget-edit',
    });

    const toolbar = new Adw.ToolbarView();
    editPage.set_child(toolbar);

    const header = new Adw.HeaderBar();
    const saveBtn = new Gtk.Button({ label: 'Save' });
    saveBtn.add_css_class('suggested-action');
    header.pack_end(saveBtn);
    toolbar.add_top_bar(header);

    // Tab View Stack
    const viewStack = new Adw.ViewStack();
    toolbar.set_content(viewStack);

    // Widget Tab
    const widgetPage = new Adw.PreferencesPage();
    const widgetScroll = new Gtk.ScrolledWindow({ vexpand: true });
    widgetScroll.set_child(widgetPage);
    const widgetStackPage = viewStack.add_titled(widgetScroll, 'widget', 'Widget');
    widgetStackPage.set_icon_name(getIconName(Icons.SETTINGS));

    // Appearance Tab
    const appearancePage = new Adw.PreferencesPage();
    const appearanceScroll = new Gtk.ScrolledWindow({ vexpand: true });
    appearanceScroll.set_child(appearancePage);
    const appearanceStackPage = viewStack.add_titled(appearanceScroll, 'appearance', 'Appearance');
    appearanceStackPage.set_icon_name(getIconName(Icons.APPEARANCE));

    // Bottom Switcher
    const switcherBar = new Adw.ViewSwitcherBar({ stack: viewStack });
    toolbar.add_bottom_bar(switcherBar);
    switcherBar.set_reveal(true);

    // Position group for the widget tab
    const posGroup = new Adw.PreferencesGroup({ title: 'Position' });
    widgetPage.add(posGroup);

    const posControls = buildPositionControls(posGroup, widget, profile, pluginRegistry);

    // Widget Settings
    let currentStyle = { ...(widget.config?.style || {}) };
    const configChanges = { ...widget.config };
    const onConfigChange = (key, value) => {
        if (key === 'style') {
            currentStyle = value;
            configChanges.style = currentStyle;
        } else {
            configChanges[key] = value;
        }
    };

    await loadPluginSettings(widget, widgetPage, appearancePage, onConfigChange, pluginRegistry);

    // Save Handler
    saveBtn.connect('clicked', () => {
        const positionUpdate =
            profile.positionMode === PositionMode.GRID
                ? {
                      gridCol: posControls.colSpin.get_value(),
                      gridRow: posControls.rowSpin.get_value(),
                      anchor: posControls.selectedAnchor(),
                  }
                : {
                      x: posControls.xSpin.get_value(),
                      y: posControls.ySpin.get_value(),
                      anchor: posControls.selectedAnchor(),
                  };

        configManager.updateWidgetPosition(selectedProfileId, widget.uuid, positionUpdate);

        if (Object.keys(configChanges).length > 0) {
            configManager.updateWidgetConfig(selectedProfileId, widget.uuid, configChanges);
        }

        onSave();
        navView.pop();
    });

    navView.push(editPage);
}
