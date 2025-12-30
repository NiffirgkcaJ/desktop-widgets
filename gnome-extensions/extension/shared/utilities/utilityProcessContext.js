/**
 * Import a module only in the GNOME Shell process.
 * Returns null if called in the preferences process.
 * @param {string} module - Module path
 * @returns {Promise<Object|null>} Module default export or null
 */
export async function importInShellOnly(module) {
    if (typeof global !== 'undefined') {
        return (await import(module)).default;
    }
    return null;
}

/**
 * Import a module only in the Preferences process.
 * Returns null if called in the shell process.
 * @param {string} module - Module path
 * @returns {Promise<Object|null>} Module default export or null
 */
export async function importInPrefsOnly(module) {
    if (typeof global === 'undefined') {
        return (await import(module)).default;
    }
    return null;
}
