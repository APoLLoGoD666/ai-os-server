'use strict';
let _count = 0;
module.exports = {
    increment() { _count++; },
    get() { return _count; },
    reset() { _count = 0; }
};
