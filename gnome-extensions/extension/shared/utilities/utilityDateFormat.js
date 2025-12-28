import GLib from 'gi://GLib';

import { processEscapeSequences } from './utilityText.js';

const TOKEN_MAP = [
    // Year
    ['yyyyyy', '%Y'], // 6-digit year
    ['yyyyy', '%Y'], // 5-digit year
    ['yyyy', '%Y'], // 4-digit year
    ['yy', '%y'], // 2-digit year
    ['y', '%Y'], // 1-6 digit year

    // ISO Week Year
    ['kkkk', '%G'], // ISO week year, 4 digits
    ['kk', '%g'], // ISO week year, 2 digits

    // Month text
    ['MMMM', '%B'], // Full month name
    ['MMM', '%b'], // Abbreviated month name
    ['LLLL', '%B'], // Alias
    ['LLL', '%b'], // Alias

    // Month number
    ['MM', '%m'], // Month, padded
    ['LL', '%m'], // Alias
    ['M', '%-m'], // Month, no padding
    ['L', '%-m'], // Alias

    // ISO Week Number
    ['WW', '%V'], // ISO week, padded
    ['W', '%-V'], // ISO week, no padding

    // Day of month
    ['dd', '%d'], // Day, padded
    ['d', '%-d'], // Day, no padding

    // Ordinal day of year
    ['ooo', '%j'], // Day of year, padded to 3
    ['o', '%-j'], // Day of year, no padding

    // Weekday text
    ['EEEE', '%A'], // Full weekday
    ['cccc', '%A'], // Alias
    ['EEE', '%a'], // Abbreviated weekday
    ['ccc', '%a'], // Alias

    // Weekday number
    ['E', '%u'], // Day of week 1-7, Monday=1
    ['c', '%u'], // Alias

    // Hour 24h
    ['HH', '%H'], // 24h hour, padded
    ['H', '%-H'], // 24h hour, no padding

    // Hour 12h
    ['hh', '%I'], // 12h hour, padded
    ['h', '%-I'], // 12h hour, no padding

    // Minute
    ['mm', '%M'], // Minute, padded
    ['m', '%-M'], // Minute, no padding

    // Second
    ['ss', '%S'], // Second, padded
    ['s', '%-S'], // Second, no padding

    // AM/PM
    ['a', '%p'], // Meridiem

    // Timezone
    ['ZZZ', '%z'], // Techie offset +0500
    ['ZZ', '%:z'], // Short offset +05:00
    ['Z', '%:::z'], // Narrow offset +5
    ['z', '%Z'], // IANA zone abbreviation

    // Localized composite formats
    ['TT', '%H:%M:%S'], // 24h time with seconds
    ['T', '%H:%M'], // 24h time
    ['tt', '%-I:%M:%S %p'], // 12h time with seconds
    ['t', '%-I:%M %p'], // 12h time
    ['DDDD', '%A, %B %-d, %Y'], // Full date with weekday
    ['DDD', '%B %-d, %Y'], // Full date
    ['DD', '%b %-d, %Y'], // Date with abbreviated month
    ['D', '%x'], // Localized date
    ['FF', '%b %-d, %Y, %-I:%M:%S %p'], // Date + time with seconds
    ['ff', '%b %-d, %Y, %-I:%M %p'], // Date + time
    ['F', '%x, %-I:%M:%S %p'], // Short date + time with seconds
    ['f', '%x, %-I:%M %p'], // Short date + time
];

const CUSTOM_TOKENS = [
    // Milliseconds
    ['SSS', '__MS3__'], // Millisecond, padded to 3
    ['SS', '__MS2__'], // Millisecond, padded to 2
    ['S', '__MS1__'], // Millisecond, no padding

    // Fractional seconds
    ['uuu', '__FRAC1__'], // One digit fractional
    ['uu', '__FRAC2__'], // Two digit fractional
    ['u', '__FRAC2__'], // Fractional seconds

    // Quarter
    ['q', '__Q__'], // Quarter 1-4

    // Era
    ['GGGGG', '__ERA5__'], // One-letter era A/B
    ['GG', '__ERA2__'], // Full era Anno Domini/Before Christ
    ['G', '__ERA1__'], // Abbreviated era AD/BC
];

export const FormatPresets = [
    { id: 'time24', name: 'Time 24h', format: 'HH:mm' },
    { id: 'time24sec', name: 'Time 24h + Seconds', format: 'HH:mm:ss' },
    { id: 'time12', name: 'Time 12h', format: 'h:mm a' },
    { id: 'time12sec', name: 'Time 12h + Seconds', format: 'h:mm:ss a' },
    { id: 'dateShort', name: 'Date Short', format: 'MM/dd/yyyy' },
    { id: 'dateLong', name: 'Date Long', format: 'MMMM d, yyyy' },
    { id: 'dateISO', name: 'Date ISO', format: 'yyyy-MM-dd' },
    { id: 'full', name: 'Full DateTime', format: 'EEEE, MMMM d, yyyy HH:mm' },
    { id: 'weekdayTime', name: 'Weekday + Time', format: 'EEE HH:mm' },
    { id: 'isoWeek', name: 'ISO Week', format: "kkkk-'W'WW" },
    { id: 'ordinal', name: 'Ordinal Date', format: 'yyyy-ooo' },
    { id: 'quarter', name: 'Quarter', format: "'Q'q yyyy" },
    { id: 'withMillis', name: 'Time with Milliseconds', format: 'HH:mm:ss.SSS' },
];

/**
 * Convert a Luxon-style format string to GLib strftime format
 * @param {string} luxonFormat - Luxon-style format like 'yyyy-MM-dd HH:mm:ss'
 * @returns {string} GLib strftime format with placeholders for custom tokens
 */
export function toGLibFormat(luxonFormat) {
    const escaped = processEscapeSequences(luxonFormat);
    let result = '';
    let i = 0;

    while (i < escaped.length) {
        if (escaped[i] === "'") {
            const endQuote = escaped.indexOf("'", i + 1);
            if (endQuote !== -1) {
                result += escaped.slice(i + 1, endQuote);
                i = endQuote + 1;
                continue;
            }
        }

        let matched = false;
        for (const [token, placeholder] of CUSTOM_TOKENS) {
            if (escaped.slice(i, i + token.length) === token) {
                result += placeholder;
                i += token.length;
                matched = true;
                break;
            }
        }
        if (matched) continue;

        for (const [token, glib] of TOKEN_MAP) {
            if (escaped.slice(i, i + token.length) === token) {
                result += glib;
                i += token.length;
                matched = true;
                break;
            }
        }

        if (!matched) {
            result += escaped[i];
            i++;
        }
    }

    return result;
}

/**
 * Replace custom placeholders with computed values from the datetime
 * @param {string} formattedString - String containing placeholders from phase 1
 * @param {GLib.DateTime} datetime - GLib DateTime instance for value computation
 * @returns {string} Final formatted string with all placeholders resolved
 */
function postProcessFormat(formattedString, datetime) {
    let result = formattedString;

    if (result.includes('__MS')) {
        const microseconds = datetime.get_microsecond();
        const milliseconds = Math.floor(microseconds / 1000);
        result = result.replace(/__MS3__/g, String(milliseconds).padStart(3, '0'));
        result = result.replace(/__MS2__/g, String(milliseconds).padStart(2, '0'));
        result = result.replace(/__MS1__/g, String(milliseconds));
    }

    if (result.includes('__FRAC')) {
        const microseconds = datetime.get_microsecond();
        const frac1 = Math.floor(microseconds / 100000);
        const frac2 = String(Math.floor(microseconds / 10000)).padStart(2, '0');
        result = result.replace(/__FRAC1__/g, String(frac1));
        result = result.replace(/__FRAC2__/g, frac2);
    }

    if (result.includes('__Q')) {
        const month = datetime.get_month();
        const quarter = Math.ceil(month / 3);
        result = result.replace(/__Q__/g, String(quarter));
    }

    if (result.includes('__ERA')) {
        const year = datetime.get_year();
        const isAD = year >= 1;
        result = result.replace(/__ERA5__/g, isAD ? 'A' : 'B');
        result = result.replace(/__ERA2__/g, isAD ? 'Anno Domini' : 'Before Christ');
        result = result.replace(/__ERA1__/g, isAD ? 'AD' : 'BC');
    }

    return result;
}

/**
 * Format the current datetime using a Luxon-style format string
 * @param {string} luxonFormat - Luxon-style format like 'yyyy-MM-dd HH:mm:ss'
 * @returns {string} Formatted datetime string
 */
export function formatDateTime(luxonFormat) {
    const glibFormat = toGLibFormat(luxonFormat);
    const now = GLib.DateTime.new_now_local();
    let formatted = now.format(glibFormat);
    formatted = postProcessFormat(formatted, now);
    return formatted;
}

/**
 * Check if a format string contains sub-second tokens
 * @param {string} luxonFormat - Luxon-style format string to check
 * @returns {boolean} True if format includes seconds, milliseconds, or fractional seconds
 */
export function hasSecondTokens(luxonFormat) {
    if (luxonFormat.includes('s') || luxonFormat.includes('S')) return true;
    if (luxonFormat.includes('u')) return true;
    return false;
}
