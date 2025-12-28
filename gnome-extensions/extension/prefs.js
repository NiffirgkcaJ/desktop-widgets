import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { ConfigManager } from './shared/services/serviceConfig.js';
import { createStaticIconButton } from './shared/utilities/utilityIconGtk.js';
import { Icons } from './shared/constants/constantIcons.js';
import { PluginRegistry } from './shared/services/servicePluginRegistry.js';
import { ProfileRow } from './shared/components/componentProfileRow.js';
import { pushEditPage } from './shared/settings/settingsEditPage.js';
import { WidgetListBuilder } from './shared/settings/settingsWidgetListPage.js';
import { showRenameDialog, showDeleteDialog, showCreateDialog } from './shared/settings/settingsProfileDialogs.js';

const WINDOW_WIDTH = 960;
const WINDOW_HEIGHT = 700;
const SIDEBAR_WIDTH = 280;
const SIDEBAR_FRACTION = 0.3;

/**
 * DesktopWidgetsPreferences
 * @class
 * @classdesc DesktopWidgetsPreferences is the main class that handles the preferences window.
 */
export default class DesktopWidgetsPreferences extends ExtensionPreferences {
    /**
     * @param {Object} window - The preferences window
     */
    async fillPreferencesWindow(window) {
        const configManager = new ConfigManager(this);
        const pluginRegistry = new PluginRegistry(this);
        await pluginRegistry.init();

        let selectedProfileId = configManager.getActiveProfileId();

        // Lock window size
        window.set_default_size(WINDOW_WIDTH, WINDOW_HEIGHT);
        window.set_size_request(WINDOW_WIDTH, WINDOW_HEIGHT);
        window.set_resizable(false);

        const splitView = new Adw.NavigationSplitView({
            min_sidebar_width: SIDEBAR_WIDTH,
            max_sidebar_width: SIDEBAR_WIDTH,
            sidebar_width_fraction: SIDEBAR_FRACTION,
        });
        window.set_content(splitView);

        const { sidebarPage, profileListBox, addProfileBtn } = this._buildSidebar();
        splitView.set_sidebar(sidebarPage);

        const contentNavView = new Adw.NavigationView();
        const { widgetListPage, prefsPage } = this._buildWidgetListPage();
        contentNavView.add(widgetListPage);

        const contentWrapper = new Adw.NavigationPage({ title: 'Content' });
        contentWrapper.set_child(contentNavView);
        splitView.set_content(contentWrapper);

        // Profile list handlers
        const getSelectedProfileId = () => selectedProfileId;
        const setSelectedProfileId = (id) => {
            selectedProfileId = id;
        };

        let widgetListBuilder = null;
        const getWidgetListBuilder = () => widgetListBuilder;

        const rebuildProfileList = () => {
            let child = profileListBox.get_first_child();
            while (child) {
                const next = child.get_next_sibling();
                profileListBox.remove(child);
                child = next;
            }

            const profiles = configManager.getProfileList();
            for (const profile of profiles) {
                const row = new ProfileRow(profile.id, profile.name, profile.isActive);
                profileListBox.append(row);

                row.connect('rename', () => {
                    showRenameDialog(window, profile, configManager, (success) => {
                        if (success) {
                            rebuildProfileList();
                            if (profile.id === getSelectedProfileId()) {
                                getWidgetListBuilder()?.rebuildWidgetList();
                            }
                        }
                    });
                });

                row.connect('delete', () => {
                    showDeleteDialog(window, profile, configManager, (wasSelected, newSelectedId) => {
                        if (getSelectedProfileId() === wasSelected) {
                            setSelectedProfileId(newSelectedId);
                        }
                        rebuildProfileList();
                        getWidgetListBuilder()?.rebuildWidgetList();
                    });
                });

                if (profile.id === getSelectedProfileId()) {
                    profileListBox.select_row(row);
                }
            }
        };

        widgetListBuilder = new WidgetListBuilder({
            prefsPage,
            widgetListPage,
            configManager,
            pluginRegistry,
            getSelectedProfileId,
            setSelectedProfileId,
            onEditWidget: (widget, profile) => {
                pushEditPage({
                    widget,
                    profile,
                    navView: contentNavView,
                    pluginRegistry,
                    configManager,
                    selectedProfileId: getSelectedProfileId(),
                    onSave: () => widgetListBuilder?.rebuildWidgetsOnly(),
                });
            },
            onProfileListRebuild: () => rebuildProfileList(),
        });

        profileListBox.connect('row-selected', (listBox, row) => {
            if (row && row.profileId) {
                setSelectedProfileId(row.profileId);
                configManager.setActiveProfile(row.profileId);

                // Update row indicators
                let rowChild = profileListBox.get_first_child();
                while (rowChild) {
                    if (rowChild.setActive) {
                        rowChild.setActive(rowChild.profileId === row.profileId);
                    }
                    rowChild = rowChild.get_next_sibling();
                }

                widgetListBuilder?.rebuildWidgetList();
                splitView.set_show_content(true);
            }
        });

        addProfileBtn.connect('clicked', () => {
            showCreateDialog(window, configManager, (newId) => {
                setSelectedProfileId(newId);
                rebuildProfileList();
                widgetListBuilder?.rebuildWidgetList();
            });
        });

        // Initial build
        rebuildProfileList();
        widgetListBuilder.rebuildWidgetList();
    }

    /**
     * Build the sidebar with profile list
     */
    _buildSidebar() {
        const sidebarPage = new Adw.NavigationPage({ title: 'Profiles' });
        const sidebarToolbar = new Adw.ToolbarView();
        sidebarPage.set_child(sidebarToolbar);

        const sidebarHeader = new Adw.HeaderBar();
        const addProfileBtn = createStaticIconButton(Icons.ADD, {
            tooltip_text: 'Add Profile',
        });
        sidebarHeader.pack_end(addProfileBtn);
        sidebarToolbar.add_top_bar(sidebarHeader);

        const profileListBox = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.SINGLE,
            vexpand: true,
        });
        profileListBox.add_css_class('navigation-sidebar');

        const sidebarScroll = new Gtk.ScrolledWindow({
            child: profileListBox,
            vexpand: true,
        });
        sidebarToolbar.set_content(sidebarScroll);

        return { sidebarPage, profileListBox, addProfileBtn };
    }

    /**
     * Build the widget list page structure
     */
    _buildWidgetListPage() {
        const widgetListPage = new Adw.NavigationPage({
            title: 'Widgets',
            tag: 'widget-list',
        });

        const toolbar = new Adw.ToolbarView();
        widgetListPage.set_child(toolbar);

        const header = new Adw.HeaderBar();
        toolbar.add_top_bar(header);

        const scroll = new Gtk.ScrolledWindow({ vexpand: true });
        const prefsPage = new Adw.PreferencesPage();
        scroll.set_child(prefsPage);
        toolbar.set_content(scroll);

        return { widgetListPage, prefsPage };
    }
}
