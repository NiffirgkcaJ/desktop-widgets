import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { formatDateTime, hasSecondTokens } from '../../shared/utilities/utilityDateFormat.js';

const DEFAULT_FORMAT = 'HH:mm:ss';
const LOADING_TEXT = 'Loading...';
const TIMER_INTERVAL_SECONDS = 1;
const TIMER_INTERVAL_MINUTES = 60;
const ELLIPSIZE_NONE = 0;

// Container widget that supports background and border styling
const DateTimeWidget = GObject.registerClass(
    /**
     * DateTimeWidget
     * @class
     * @classdesc A widget that displays the current date and time
     */
    class DateTimeWidget extends St.Bin {
        constructor(config) {
            super({
                style_class: 'datetime-widget-container',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
            });

            this._config = config || {};
            this._format = this._config.format || DEFAULT_FORMAT;

            // Inner label for text
            this._label = new St.Label({
                style_class: 'datetime-widget-label',
                text: LOADING_TEXT,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
            });
            this._label.clutter_text.ellipsize = ELLIPSIZE_NONE;
            this.set_child(this._label);

            this._updateTime();
            this._startTimer();
        }

        /**
         * Start the update timer
         * @private
         */
        _startTimer() {
            const interval = hasSecondTokens(this._format) ? TIMER_INTERVAL_SECONDS : TIMER_INTERVAL_MINUTES;
            this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
                this._updateTime();
                return GLib.SOURCE_CONTINUE;
            });
        }

        /**
         * Update the label text with current time
         * @private
         */
        _updateTime() {
            this._label.text = formatDateTime(this._format);
        }

        /**
         * Destroy the widget and clean up timer
         */
        destroy() {
            if (this._timeoutId) {
                GLib.source_remove(this._timeoutId);
                this._timeoutId = null;
            }
            super.destroy();
        }
    },
);

/**
 * @typedef {Object} DateTimeWidgetConfig
 * @property {string} [format] - The format string for the date and time
 */
export default {
    createWidget: (config) => {
        return new DateTimeWidget(config);
    },
};
