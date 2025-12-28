import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import { escapeMarkup } from '../utilities/utilityText.js';
import { Icons } from '../constants/constantIcons.js';
import { PositionMode, GridLimits } from '../services/serviceConfig.js';
import { getIconName, createStaticIcon, createStaticIconButton } from '../utilities/utilityIconGtk.js';

const DEFAULT_GRID_COLUMNS = 6;
const DEFAULT_GRID_ROWS = 4;
const GRID_STEP = 1;

// UI timing and drag constants
const REBUILD_DELAY_MS = 50;
const DRAG_HOTSPOT_X = 24;
const DRAG_OPACITY = 0.5;
const FULL_OPACITY = 1.0;

/**
 * WidgetListBuilder
 * @class
 * @classdesc Builder for the widget list page including settings and widget list
 */
export class WidgetListBuilder {
    /**
     * @param {Object} params - Parameters object
     * @param {Adw.PreferencesPage} params.prefsPage - Base preferences page
     * @param {Adw.NavigationPage} params.widgetListPage - Navigation page (for title)
     * @param {ConfigManager} params.configManager - Config manager instance
     * @param {PluginRegistry} params.pluginRegistry - Plugin registry instance
     * @param {Function} params.getSelectedProfileId - Getter for selected profile ID
     * @param {Function} params.setSelectedProfileId - Setter for selected profile ID
     * @param {Function} params.onEditWidget - Callback when edit button clicked
     * @param {Function} params.onProfileListRebuild - Callback to rebuild profile list
     */
    constructor(params) {
        this._prefsPage = params.prefsPage;
        this._widgetListPage = params.widgetListPage;
        this._configManager = params.configManager;
        this._pluginRegistry = params.pluginRegistry;
        this._getSelectedProfileId = params.getSelectedProfileId;
        this._setSelectedProfileId = params.setSelectedProfileId;
        this._onEditWidget = params.onEditWidget;
        this._onProfileListRebuild = params.onProfileListRebuild;

        this._settingsGroup = null;
        this._widgetsGroup = null;
        this._actionsGroup = null;
        this._rebuildPending = false;
    }

    /**
     * Schedule a deferred rebuild after mode changes
     */
    scheduleRebuild() {
        if (this._rebuildPending) return;
        this._rebuildPending = true;

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, REBUILD_DELAY_MS, () => {
            this._rebuildPending = false;
            this.rebuildWidgetList();
            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * Rebuild only the widgets group (not settings) - for grid size changes
     */
    rebuildWidgetsOnly() {
        const profile = this._configManager.getProfile(this._getSelectedProfileId());
        if (!profile) return;

        if (this._widgetsGroup) {
            this._prefsPage.remove(this._widgetsGroup);
            this._widgetsGroup = null;
        }
        if (this._actionsGroup) {
            this._prefsPage.remove(this._actionsGroup);
            this._actionsGroup = null;
        }

        this._buildWidgetsGroup(profile);
    }

    /**
     * Full rebuild of the widget list page
     */
    rebuildWidgetList() {
        if (this._settingsGroup) {
            this._prefsPage.remove(this._settingsGroup);
            this._settingsGroup = null;
        }
        if (this._widgetsGroup) {
            this._prefsPage.remove(this._widgetsGroup);
            this._widgetsGroup = null;
        }
        if (this._actionsGroup) {
            this._prefsPage.remove(this._actionsGroup);
            this._actionsGroup = null;
        }

        const selectedProfileId = this._getSelectedProfileId();
        const profile = this._configManager.getProfile(selectedProfileId);

        if (!profile) {
            this._buildEmptyState();
            return;
        }

        this._widgetListPage.set_title(profile.name);
        this._buildSettingsGroup(profile, selectedProfileId);
        this._buildWidgetsGroup(profile);
    }

    /**
     * Build empty state when no profile is selected
     */
    _buildEmptyState() {
        this._widgetListPage.set_title('No Profile');
        const emptyGroup = new Adw.PreferencesGroup({
            title: 'No Profile Selected',
            description: 'Create a new profile to get started.',
        });
        const createRow = new Adw.ActionRow({
            title: 'Create Profile',
            subtitle: 'Add a new profile to configure widgets',
        });
        const createBtn = createStaticIconButton(Icons.ADD, {
            valign: Gtk.Align.CENTER,
        });
        createBtn.add_css_class('suggested-action');
        createBtn.connect('clicked', () => {
            const newId = this._configManager.createProfile('New Profile');
            this._setSelectedProfileId(newId);
            this._configManager.setActiveProfile(newId);
            this._onProfileListRebuild();
            this.rebuildWidgetList();
        });
        createRow.add_suffix(createBtn);
        createRow.set_activatable_widget(createBtn);
        emptyGroup.add(createRow);

        this._prefsPage.add(emptyGroup);
        this._actionsGroup = emptyGroup;
    }

    /**
     * Build the position settings group
     */
    _buildSettingsGroup(profile, selectedProfileId) {
        this._settingsGroup = new Adw.PreferencesGroup({ title: 'Position Settings' });
        this._prefsPage.add(this._settingsGroup);

        const modeRow = new Adw.ActionRow({
            title: 'Position Mode',
            subtitle: profile.positionMode === PositionMode.GRID ? 'Grid-based' : 'Coordinates',
        });
        const modeSwitch = new Gtk.Switch({
            active: profile.positionMode === PositionMode.GRID,
            valign: Gtk.Align.CENTER,
        });
        modeSwitch.connect('notify::active', () => {
            this._configManager.setProfilePositionMode(selectedProfileId, modeSwitch.active ? PositionMode.GRID : PositionMode.COORDINATE);
            this.scheduleRebuild();
        });
        modeRow.add_suffix(new Gtk.Label({ label: 'Grid', margin_end: 8 }));
        modeRow.add_suffix(modeSwitch);
        this._settingsGroup.add(modeRow);

        if (profile.positionMode === PositionMode.GRID) {
            this._buildGridSizeRow(profile, selectedProfileId);
        }
    }

    /**
     * Build grid size controls row
     */
    _buildGridSizeRow(profile, selectedProfileId) {
        const gridRow = new Adw.ActionRow({ title: 'Grid Size' });

        const colSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: GridLimits.MIN,
                upper: GridLimits.MAX,
                step_increment: GRID_STEP,
                value: profile.gridColumns || DEFAULT_GRID_COLUMNS,
            }),
            valign: Gtk.Align.CENTER,
        });
        const rowSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: GridLimits.MIN,
                upper: GridLimits.MAX,
                step_increment: GRID_STEP,
                value: profile.gridRows || DEFAULT_GRID_ROWS,
            }),
            valign: Gtk.Align.CENTER,
        });

        colSpin.connect('value-changed', () => {
            const newVal = colSpin.get_value();
            const currentProfile = this._configManager.getProfile(selectedProfileId);
            if (currentProfile && newVal !== currentProfile.gridColumns) {
                this._configManager.setProfileGridSize(selectedProfileId, newVal, rowSpin.get_value());
                this.rebuildWidgetsOnly();
            }
        });
        rowSpin.connect('value-changed', () => {
            const newVal = rowSpin.get_value();
            const currentProfile = this._configManager.getProfile(selectedProfileId);
            if (currentProfile && newVal !== currentProfile.gridRows) {
                this._configManager.setProfileGridSize(selectedProfileId, colSpin.get_value(), newVal);
                this.rebuildWidgetsOnly();
            }
        });

        const gridBox = new Gtk.Box({ spacing: 6 });
        gridBox.append(new Gtk.Label({ label: 'Cols:' }));
        gridBox.append(colSpin);
        gridBox.append(new Gtk.Label({ label: 'Rows:' }));
        gridBox.append(rowSpin);
        gridRow.add_suffix(gridBox);
        this._settingsGroup.add(gridRow);
    }

    /**
     * Build the widgets group with add button in header
     */
    _buildWidgetsGroup(profile) {
        const selectedProfileId = this._getSelectedProfileId();

        this._widgetsGroup = new Adw.PreferencesGroup({
            title: 'Widgets',
            description: `${profile.widgets.length} widget(s)`,
        });

        // Add Widget Button in Header
        const types = this._pluginRegistry.getAvailableTypes();
        let headerSuffix;

        if (types.length === 0) {
            // No types available, do nothing or show disabled button
            const btn = createStaticIconButton(Icons.ADD, {
                sensitive: false,
            });
            btn.add_css_class('flat');
            headerSuffix = btn;
        } else if (types.length === 1) {
            const addWidgetBtn = createStaticIconButton(Icons.ADD, {
                tooltip_text: 'Add Widget',
            });
            addWidgetBtn.add_css_class('flat');
            addWidgetBtn.connect('clicked', () => {
                this._configManager.addWidget(selectedProfileId, {
                    type: types[0].id,
                    config: {},
                });
                this.rebuildWidgetsOnly();
            });
            headerSuffix = addWidgetBtn;
        } else {
            const menu = new Gio.Menu();
            for (const t of types) {
                menu.append(t.name, `widget.add::${t.id}`);
            }

            const menuBtn = new Gtk.MenuButton({
                icon_name: getIconName(Icons.ADD),
                menu_model: menu,
                tooltip_text: 'Add Widget',
            });
            menuBtn.add_css_class('flat');

            // We need to attach actions to the window or a shared group
            // Since we don't have easy access to the window actions here,
            // we can use a simpler approach for the menu activation
            // OR stick to the ActionGroup on the button itself if possible.
            // ActionGroups usually attach to widgets.

            const actionGroup = new Gio.SimpleActionGroup();
            const addAction = new Gio.SimpleAction({
                name: 'add',
                parameter_type: GLib.VariantType.new('s'),
            });
            addAction.connect('activate', (action, param) => {
                const typeId = param.get_string()[0];
                this._configManager.addWidget(selectedProfileId, {
                    type: typeId,
                    config: {},
                });
                this.rebuildWidgetsOnly();
            });
            actionGroup.add_action(addAction);
            menuBtn.insert_action_group('widget', actionGroup);

            headerSuffix = menuBtn;
        }

        if (headerSuffix) {
            this._widgetsGroup.set_header_suffix(headerSuffix);
        }

        this._prefsPage.add(this._widgetsGroup);

        this._buildWidgetRows(profile, selectedProfileId);
    }

    /**
     * Build individual widget rows with drag-and-drop reordering
     */
    _buildWidgetRows(profile, selectedProfileId) {
        for (let i = 0; i < profile.widgets.length; i++) {
            const widget = profile.widgets[i];
            const widgetIndex = i;
            const meta = this._pluginRegistry.getPluginMetadata(widget.type);
            const rawName = meta && meta.name ? meta.name : widget.type || 'Unknown Widget';
            const widgetName = escapeMarkup(rawName);

            let posText;
            if (profile.positionMode === PositionMode.GRID) {
                const col = (widget.gridCol ?? 0).toFixed(1);
                const rowNum = (widget.gridRow ?? 0).toFixed(1);
                posText = `Grid: (${col}, ${rowNum})`;
            } else {
                posText = `Pos: (${widget.x || 0}, ${widget.y || 0})`;
            }

            const row = new Adw.ActionRow({
                title: widgetName,
                subtitle: posText,
            });

            // Drag handle on the left
            const dragHandle = createStaticIcon(Icons.DRAG_HANDLE);
            dragHandle.valign = Gtk.Align.CENTER;
            dragHandle.add_css_class('dim-label');
            row.add_prefix(dragHandle);

            // Drag source - provides the widget UUID when dragging
            const dragSource = new Gtk.DragSource({
                actions: Gdk.DragAction.MOVE,
            });
            dragSource.connect('prepare', () => {
                const value = new GObject.Value();
                value.init(GObject.TYPE_STRING);
                value.set_string(widget.uuid);
                return Gdk.ContentProvider.new_for_value(value);
            });
            dragSource.connect('drag-begin', (_source, drag) => {
                // Capture a static snapshot of the row
                const paintable = new Gtk.WidgetPaintable({ widget: row });
                const staticImage = paintable.get_current_image();

                // Create drag icon with background frame
                const dragIcon = Gtk.DragIcon.get_for_drag(drag);
                const frame = new Gtk.Frame({
                    css_classes: ['background'],
                });
                const picture = new Gtk.Picture({
                    paintable: staticImage,
                    can_shrink: false,
                });
                frame.set_child(picture);
                dragIcon.set_child(frame);

                // Calculate hotspot at center of drag handle (left side, vertically centered)
                const hotspotX = DRAG_HOTSPOT_X;
                const hotspotY = row.get_height() / 2;
                drag.set_hotspot(hotspotX, hotspotY);

                // Dim the original row
                row.set_opacity(DRAG_OPACITY);
            });
            dragSource.connect('drag-end', () => {
                row.set_opacity(FULL_OPACITY);
            });
            row.add_controller(dragSource);

            // Drop target - receives dropped widget UUIDs
            const dropTarget = Gtk.DropTarget.new(GObject.TYPE_STRING, Gdk.DragAction.MOVE);
            dropTarget.connect('drop', (_target, draggedUuid) => {
                if (draggedUuid === widget.uuid) return false;
                this._configManager.reorderWidget(selectedProfileId, draggedUuid, widgetIndex);
                this.rebuildWidgetsOnly();
                return true;
            });
            row.add_controller(dropTarget);

            // Edit button
            const editBtn = createStaticIconButton(Icons.EDIT, {
                valign: Gtk.Align.CENTER,
            });
            editBtn.add_css_class('flat');
            editBtn.connect('clicked', () => {
                this._onEditWidget(widget, profile);
            });
            row.add_suffix(editBtn);

            // Delete button
            const removeBtn = createStaticIconButton(Icons.DELETE, {
                valign: Gtk.Align.CENTER,
            });
            removeBtn.add_css_class('flat');
            const widgetUuid = widget.uuid;
            const profileIdForRemoval = selectedProfileId;
            removeBtn.connect('clicked', () => {
                this._configManager.removeWidget(profileIdForRemoval, widgetUuid);
                this.rebuildWidgetsOnly();
            });
            row.add_suffix(removeBtn);
            this._widgetsGroup.add(row);
        }
    }
}
