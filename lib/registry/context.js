'use strict';
// RegistryContext — plain struct of singleton service modules.
// Pass as the last optional argument to analysis functions.
// Direct property access only — no .get(), no service locator.

const RegistryContext = {
    get engine()               { return require('./engine'); },
    get relationships()        { return require('./relationships'); },
    get capabilities()         { return require('./capabilities'); },
    get migrationLifecycle()   { return require('./migration-lifecycle'); },
    get projections()          { return require('./projections'); },
    get relationshipDiscovery(){ return require('./relationship-discovery'); },
    get graph()                { return require('./impact/graph').GraphCache; },
    get traversal()            { return require('./graph-traversal'); },
    get events()               { return require('./events'); },
};

module.exports = { RegistryContext };
