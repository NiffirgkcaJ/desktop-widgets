import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';

import { processEscapeSequences } from '../../shared/utilities/utilityText.js';

const DEFAULT_TEXT = 'Hello, World!';
const ELLIPSIZE_NONE = 0;

// Container widget that supports background styling
const CustomTextWidget = GObject.registerClass(
    /**
     * CustomTextWidget
     * @class
     * @classdesc A widget that displays user-defined text
     */
    class CustomTextWidget extends St.Bin {
        constructor(config) {
            super({
                style_class: 'customtext-widget-container',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
            });

            this._config = config || {};

            const processedText = processEscapeSequences(config.text || DEFAULT_TEXT);

            this._label = new St.Label({
                style_class: 'customtext-widget-label',
                text: processedText,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
            });
            this._label.clutter_text.ellipsize = ELLIPSIZE_NONE;
            this.set_child(this._label);
        }

        /**
         * Update the displayed text
         * @param {string} newText - New text content
         */
        updateText(newText) {
            this._label.text = processEscapeSequences(newText);
        }
    },
);

/**
 * @typedef {Object} CustomTextWidgetConfig
 * @property {string} [text] - The text to display
 */
export default {
    createWidget: (config) => {
        return new CustomTextWidget(config);
    },
};
