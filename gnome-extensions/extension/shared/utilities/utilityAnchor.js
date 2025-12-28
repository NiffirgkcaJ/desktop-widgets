const ANCHOR = {
    TOP_LEFT: { x: 0, y: 0 },
    TOP_CENTER: { x: 0.5, y: 0 },
    TOP_RIGHT: { x: 1, y: 0 },
    CENTER_LEFT: { x: 0, y: 0.5 },
    CENTER_CENTER: { x: 0.5, y: 0.5 },
    CENTER_RIGHT: { x: 1, y: 0.5 },
    BOTTOM_LEFT: { x: 0, y: 1 },
    BOTTOM_CENTER: { x: 0.5, y: 1 },
    BOTTOM_RIGHT: { x: 1, y: 1 },
};

const ANCHOR_MAP = {
    'top-left': ANCHOR.TOP_LEFT,
    'top-center': ANCHOR.TOP_CENTER,
    'top-right': ANCHOR.TOP_RIGHT,
    'center-left': ANCHOR.CENTER_LEFT,
    'center-center': ANCHOR.CENTER_CENTER,
    'center-right': ANCHOR.CENTER_RIGHT,
    'bottom-left': ANCHOR.BOTTOM_LEFT,
    'bottom-center': ANCHOR.BOTTOM_CENTER,
    'bottom-right': ANCHOR.BOTTOM_RIGHT,
};

/**
 * Parse anchor from string or object
 * @param {string|object} anchor - Anchor string like 'top-left' or {x, y} object
 * @returns {{x: number, y: number}} Normalized anchor coordinates
 */
export function parseAnchor(anchor) {
    if (!anchor) return ANCHOR.CENTER_CENTER;
    if (typeof anchor === 'object' && anchor.x !== undefined) return anchor;
    if (typeof anchor === 'string') return ANCHOR_MAP[anchor.toLowerCase()] || ANCHOR.CENTER_CENTER;
    return ANCHOR.CENTER_CENTER;
}

/**
 * Calculate the top-left position for a widget given its anchor point and size
 * @param {number} targetX - Screen X where the anchor should align
 * @param {number} targetY - Screen Y where the anchor should align
 * @param {number} width - Widget width
 * @param {number} height - Widget height
 * @param {{x: number, y: number}} anchor - Normalized anchor point
 * @returns {{x: number, y: number}} Position for widget's top-left corner
 */
export function applyAnchor(targetX, targetY, width, height, anchor = ANCHOR.CENTER_CENTER) {
    const a = parseAnchor(anchor);
    return {
        x: targetX - width * a.x,
        y: targetY - height * a.y,
    };
}
