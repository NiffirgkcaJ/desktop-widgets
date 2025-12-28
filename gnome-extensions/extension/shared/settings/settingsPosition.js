import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import { PositionMode } from '../services/serviceConfig.js';

// Grid config
const GRID_STEP_INCREMENT = 0.25;
const GRID_SPIN_DIGITS = 2;

// Coordinate config
const COORDINATE_UPPER = 10000;
const COORDINATE_STEP = 10;
const COORDINATE_DEFAULT = 100;

// Anchor config
const DEFAULT_ANCHOR = 'center-center';
const DEFAULT_ANCHOR_INDEX = 4;

const ANCHOR_OPTIONS = [
    { value: 'top-left', label: 'Top-Left Corner' },
    { value: 'top-center', label: 'Top Edge' },
    { value: 'top-right', label: 'Top-Right Corner' },
    { value: 'center-left', label: 'Left Edge' },
    { value: 'center-center', label: 'Center' },
    { value: 'center-right', label: 'Right Edge' },
    { value: 'bottom-left', label: 'Bottom-Left Corner' },
    { value: 'bottom-center', label: 'Bottom Edge' },
    { value: 'bottom-right', label: 'Bottom-Right Corner' },
];

/**
 * Build position controls for grid or coordinate mode
 * @param {Adw.PreferencesGroup} posGroup - Group to add rows to
 * @param {Object} widget - Widget data with position info
 * @param {Object} profile - Profile with positionMode, gridColumns, gridRows
 * @param {PluginRegistry} pluginRegistry - For getting plugin metadata
 * @returns {Object} Controls object with spin buttons and selectedAnchor getter
 */
export function buildPositionControls(posGroup, widget, profile, pluginRegistry) {
    const pluginMeta = pluginRegistry.getPluginMetadata(widget.type);
    let selectedAnchor = widget.anchor || (pluginMeta && pluginMeta.anchor) || DEFAULT_ANCHOR;

    const controls = { selectedAnchor: () => selectedAnchor };

    if (profile.positionMode === PositionMode.GRID) {
        const colRow = new Adw.ActionRow({ title: 'Column' });
        controls.colSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: profile.gridColumns,
                step_increment: GRID_STEP_INCREMENT,
                value: widget.gridCol ?? profile.gridColumns / 2,
            }),
            digits: GRID_SPIN_DIGITS,
            valign: Gtk.Align.CENTER,
        });
        colRow.add_suffix(controls.colSpin);
        posGroup.add(colRow);

        const rowRow = new Adw.ActionRow({ title: 'Row' });
        controls.rowSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: profile.gridRows,
                step_increment: GRID_STEP_INCREMENT,
                value: widget.gridRow ?? profile.gridRows / 2,
            }),
            digits: GRID_SPIN_DIGITS,
            valign: Gtk.Align.CENTER,
        });
        rowRow.add_suffix(controls.rowSpin);
        posGroup.add(rowRow);
    } else {
        const xRow = new Adw.ActionRow({ title: 'X Position' });
        controls.xSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: COORDINATE_UPPER,
                step_increment: COORDINATE_STEP,
                value: widget.x ?? COORDINATE_DEFAULT,
            }),
            valign: Gtk.Align.CENTER,
        });
        xRow.add_suffix(controls.xSpin);
        posGroup.add(xRow);

        const yRow = new Adw.ActionRow({ title: 'Y Position' });
        controls.ySpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: COORDINATE_UPPER,
                step_increment: COORDINATE_STEP,
                value: widget.y ?? COORDINATE_DEFAULT,
            }),
            valign: Gtk.Align.CENTER,
        });
        yRow.add_suffix(controls.ySpin);
        posGroup.add(yRow);
    }

    const anchorRow = new Adw.ActionRow({
        title: 'Anchor Point',
        subtitle: 'Which part of the widget aligns to position',
    });
    const anchorCombo = new Gtk.ComboBoxText({ valign: Gtk.Align.CENTER });
    for (const opt of ANCHOR_OPTIONS) {
        anchorCombo.append_text(opt.label);
    }
    const currentAnchorIndex = ANCHOR_OPTIONS.findIndex((o) => o.value === selectedAnchor);
    anchorCombo.set_active(currentAnchorIndex >= 0 ? currentAnchorIndex : DEFAULT_ANCHOR_INDEX);
    anchorCombo.connect('changed', () => {
        selectedAnchor = ANCHOR_OPTIONS[anchorCombo.get_active()].value;
    });
    anchorRow.add_suffix(anchorCombo);
    posGroup.add(anchorRow);

    return controls;
}
