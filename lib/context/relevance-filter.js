'use strict';

// UX-08 §8: Relevance filter — evaluates items against current context.

function filter(items, ctx) {
    if (!Array.isArray(items) || !ctx) return [];
    return items.filter(function(item) {
        if (!item) return false;
        if (item.targetPage && ctx.activePage && item.targetPage !== ctx.activePage) return false;
        if (typeof item.minScore === 'number' && typeof item.score === 'number' && item.score < item.minScore) return false;
        return true;
    });
}

function isRelevant(item, ctx) {
    return filter([item], ctx).length > 0;
}

module.exports = { filter, isRelevant };
