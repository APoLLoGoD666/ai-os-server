'use strict';

// APEX v1 Kernel — Gate composition
// Every /api request traverses these 4 gates in order before reaching its route handler.
//
// Gate 1 (resolveIdentity):  Who is making this request? Sets req.identity.
// Gate 2 (resolveOwnership): What resource are they accessing? Sets req.ownership.
// Gate 3 (checkAuthority):   Are they permitted to perform this action?
// Gate 4 (checkGovernance):  Does a standing approval exist? Sets req.governance.
//
// Gates 5 (Execution) and 6 (Memory) are enforced structurally:
//   - All execution must go through lib/agent-task-cycle.js
//   - All memory writes must go through lib/memory/gateway.js

const { resolveIdentity, resolveOwnership } = require('./middleware');
const { checkAuthority, checkGovernance }   = require('./agent-file-utils');

const kernelChain = [
    resolveIdentity,
    resolveOwnership,
    checkAuthority,
    checkGovernance,
];

module.exports = { kernelChain };
