'use strict';
const GIT_SHA = (() => {
    try { return require('child_process').execSync('git rev-parse --short HEAD').toString().trim(); }
    catch { return 'unknown'; }
})();

const _errBuffer = [];

function _sinkError(label, err) {
    const msg = err instanceof Error ? err.message : String(err);
    const entry = { label, msg, stack: err?.stack?.split('\n').slice(0,4).join(' | '), ts: new Date().toISOString() };
    _errBuffer.push(entry);
    if (_errBuffer.length > 20) _errBuffer.shift();
}

let _getMastraStatus = () => ({ apex: false, email: false, finance: false, routine: false, research: false, mastra: false, details: { status: 'not yet loaded' } });
let _initMastra = () => null;

module.exports = {
    GIT_SHA,
    _errBuffer,
    _sinkError,
    getMastraStatus: () => _getMastraStatus(),
    setMastraStatus: (fn) => { _getMastraStatus = fn; },
    getInitMastra: () => _initMastra,
    setInitMastra: (fn) => { _initMastra = fn; },
};
