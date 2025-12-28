import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

const DIALOG_MARGIN = 12;

/**
 * Show dialog to rename a profile
 * @param {Gtk.Window} window - Parent window
 * @param {Object} profile - Profile object with id and name
 * @param {ConfigManager} configManager - Config manager instance
 * @param {Function} onComplete - Callback after successful rename
 */
export function showRenameDialog(window, profile, configManager, onComplete) {
    const dialog = new Adw.MessageDialog({
        heading: 'Rename Profile',
        body: 'Enter a new name for the profile:',
    });
    dialog.add_response('cancel', 'Cancel');
    dialog.add_response('rename', 'Rename');
    dialog.set_response_appearance('rename', Adw.ResponseAppearance.SUGGESTED);

    const entry = new Gtk.Entry({
        text: profile.name,
        margin_top: DIALOG_MARGIN,
        margin_bottom: DIALOG_MARGIN,
        margin_start: DIALOG_MARGIN,
        margin_end: DIALOG_MARGIN,
    });
    dialog.set_extra_child(entry);

    dialog.connect('response', (d, response) => {
        if (response === 'rename') {
            const newName = entry.get_text();
            if (newName && newName !== profile.name) {
                configManager.renameProfile(profile.id, newName);
                onComplete(true);
            }
        }
    });
    dialog.present(window);
}

/**
 * Show confirmation dialog to delete a profile
 * @param {Gtk.Window} window - Parent window
 * @param {Object} profile - Profile object with id and name
 * @param {ConfigManager} configManager - Config manager instance
 * @param {Function} onComplete - Callback with updated selectedProfileId or null
 */
export function showDeleteDialog(window, profile, configManager, onComplete) {
    const dialog = new Adw.MessageDialog({
        heading: 'Delete Profile?',
        body: `Are you sure you want to delete "${profile.name}"?`,
    });
    dialog.add_response('cancel', 'Cancel');
    dialog.add_response('delete', 'Delete');
    dialog.set_response_appearance('delete', Adw.ResponseAppearance.DESTRUCTIVE);

    dialog.connect('response', (d, response) => {
        if (response === 'delete') {
            const wasSelected = profile.id;
            configManager.deleteProfile(profile.id);
            const updatedProfiles = configManager.getProfileList();
            const newSelectedId = updatedProfiles.length > 0 ? updatedProfiles[0].id : null;
            onComplete(wasSelected, newSelectedId);
        }
    });
    dialog.present(window);
}

/**
 * Show dialog to create a new profile
 * @param {Gtk.Window} window - Parent window
 * @param {ConfigManager} configManager - Config manager instance
 * @param {Function} onComplete - Callback with new profile ID
 */
export function showCreateDialog(window, configManager, onComplete) {
    const dialog = new Adw.MessageDialog({
        transient_for: window,
        heading: 'New Profile',
        body: 'Enter a name:',
    });
    const entry = new Gtk.Entry({
        placeholder_text: 'Profile Name',
        margin_top: DIALOG_MARGIN,
    });
    dialog.set_extra_child(entry);
    dialog.add_response('cancel', 'Cancel');
    dialog.add_response('create', 'Create');
    dialog.set_response_appearance('create', Adw.ResponseAppearance.SUGGESTED);

    dialog.connect('response', (d, response) => {
        if (response === 'create') {
            const name = entry.get_text().trim() || 'New Profile';
            const newId = configManager.createProfile(name);
            onComplete(newId);
        }
    });
    dialog.present();
}
