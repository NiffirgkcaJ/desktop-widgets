import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Pango from 'gi://Pango';

import { Icons } from '../constants/constantIcons.js';
import { getIconName } from '../utilities/utilityIconGtk.js';
import { ProfileRowLayout } from '../constants/constantLayout.js';

/**
 * ProfileRow
 * @class
 * @classdesc Row widget representing a profile in the preferences list
 */
export const ProfileRow = GObject.registerClass(
    {
        GTypeName: 'DesktopWidgetsProfileRow',
        Signals: {
            rename: {},
            delete: {},
        },
    },
    class ProfileRow extends Gtk.ListBoxRow {
        /**
         * Create a profile row
         * @param {string} profileId - Profile identifier
         * @param {string} profileName - Display name
         * @param {boolean} isActive - Whether this profile is active
         */
        constructor(profileId, profileName, isActive) {
            super();
            this.profileId = profileId;

            const box = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: ProfileRowLayout.SPACING,
                margin_top: ProfileRowLayout.MARGIN_TOP,
                margin_bottom: ProfileRowLayout.MARGIN_BOTTOM,
                margin_start: ProfileRowLayout.MARGIN_START,
                margin_end: ProfileRowLayout.MARGIN_END,
            });

            this._indicator = new Gtk.Image({
                icon_name: isActive ? getIconName(Icons.OK) : '',
                valign: Gtk.Align.CENTER,
            });
            this._indicator.set_size_request(ProfileRowLayout.ICON_SIZE, ProfileRowLayout.ICON_SIZE);
            box.append(this._indicator);

            const label = new Gtk.Label({
                label: profileName,
                xalign: 0,
                hexpand: true,
                ellipsize: Pango.EllipsizeMode.END,
                max_width_chars: 1,
            });
            if (isActive) label.add_css_class('heading');
            box.append(label);

            const menuBtn = new Gtk.MenuButton({
                icon_name: getIconName(Icons.MORE),
                valign: Gtk.Align.CENTER,
            });
            menuBtn.add_css_class('flat');

            const menu = new Gio.Menu();
            menu.append('Rename', 'profile.rename');
            menu.append('Delete', 'profile.delete');
            menuBtn.set_menu_model(menu);

            const actionGroup = new Gio.SimpleActionGroup();

            const renameAction = new Gio.SimpleAction({ name: 'rename' });
            renameAction.connect('activate', () => this.emit('rename'));
            actionGroup.add_action(renameAction);

            const deleteAction = new Gio.SimpleAction({ name: 'delete' });
            deleteAction.connect('activate', () => this.emit('delete'));
            actionGroup.add_action(deleteAction);

            menuBtn.insert_action_group('profile', actionGroup);
            box.append(menuBtn);

            this.set_child(box);
            this._isActive = isActive;
        }

        /**
         * Get active state
         * @returns {boolean} Whether this profile is active
         */
        get isActive() {
            return this._isActive;
        }

        /**
         * Set active state and update visual indicators
         * @param {boolean} active - New active state
         */
        setActive(active) {
            this._isActive = active;
            this._indicator.set_from_icon_name(active ? getIconName(Icons.OK) : '');

            const box = this.get_child();
            const label = box.get_first_child().get_next_sibling();
            if (active) label.add_css_class('heading');
            else label.remove_css_class('heading');
        }
    },
);
