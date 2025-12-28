export const TextDefaults = {
    MAX_LINES: 2,
    ENTRY_WIDTH_CHARS: 20,
    PREVIEW_MAX_CHARS: 30,
};

/**
 * Escape text for safe display in GTK/Pango markup
 * @param {string} text - The text to escape
 * @returns {string} Escaped text
 */
export function escapeMarkup(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Process escape sequences in a string
 * @param {string} text - Text containing \\n, \\t, or \\\\ sequences
 * @returns {string} Text with escape sequences converted to actual characters
 */
export function processEscapeSequences(text) {
    if (!text) return '';
    let result = '';
    let i = 0;

    while (i < text.length) {
        if (text[i] === '\\' && i + 1 < text.length) {
            const next = text[i + 1];
            if (next === 'n') {
                result += '\n';
                i += 2;
                continue;
            } else if (next === 't') {
                result += '\t';
                i += 2;
                continue;
            } else if (next === '\\') {
                result += '\\';
                i += 2;
                continue;
            }
        }
        result += text[i];
        i++;
    }

    return result;
}

/**
 * Truncate text to a maximum number of lines
 * @param {string} text - Text to truncate
 * @param {number} maxLines - Maximum lines, defaults to DEFAULT_MAX_LINES
 * @returns {string} Truncated text with ellipsis if needed
 */
export function truncateLines(text, maxLines = TextDefaults.MAX_LINES) {
    if (!text) return '';
    const lines = text.split('\n');
    if (lines.length <= maxLines) return text;
    return lines.slice(0, maxLines).join('\n') + '…';
}
