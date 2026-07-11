'use strict';
// tests/registry/index.js — Registry regression suite runner
//
// Usage:
//   node tests/registry/index.js
//   SUPABASE_URL=... node tests/registry/index.js   (also runs DB-backed tests)
//
// Exits 0 if all tests pass, 1 if any fail.

require('dotenv').config();

const { reset, totals } = require('./_runner');

const suites = [
    { name: 'engine',           run: require('./engine.test')           },
    { name: 'relationships',    run: require('./relationships.test')    },
    { name: 'discovery',        run: require('./discovery.test')        },
    { name: 'projections',      run: require('./projections.test')      },
    { name: 'health',           run: require('./health.test')           },
    { name: 'impact',           run: require('./impact.test')           },
    { name: 'constraints',      run: require('./constraints.test')      },
    { name: 'prediction',       run: require('./prediction.test')       },
    { name: 'capabilities',     run: require('./capabilities.test')     },
    { name: 'capability-graph', run: require('./capability-graph.test') },
    { name: 'monitor',          run: require('./monitor.test')          },
    { name: 'query',            run: require('./query.test')            },
    { name: 'scenario',         run: require('./scenario.test')         },
    { name: 'snapshot',         run: require('./snapshot.test')         },
    { name: 'twin',             run: require('./twin.test')             },
    { name: 'ctx',              run: require('./ctx.test')              },
    { name: 'events',           run: require('./events.test')           },
    { name: 'state-version',   run: require('./state-version.test')   },
    { name: 'kernel',          run: require('./kernel.test')          },
    { name: 'cache',            run: require('./cache.test')            },
    { name: 'traversal',        run: require('./traversal.test')        },
    { name: 'query-cache',      run: require('./query-cache.test')      },
    { name: 'visualize',        run: require('./visualize.test')        },
    { name: 'optimizer',        run: require('./optimizer.test')        },
    { name: 'universe',         run: require('./universe.test')         },
    { name: 'shadow-registry',    run: require('./shadow-registry.test')    },
    { name: 'genome-validator',   run: require('./genome-validator.test')   },
    { name: 'contract-validator', run: require('./contract-validator.test') },
    { name: 'clock',              run: require('./clock.test')              },
    { name: 'domain-loader',      run: require('./domain-loader.test')      },
    { name: 'consensus',          run: require('./consensus.test')          },
];

async function main() {
    console.log('\n══════════════════════════════════════════════════════');
    console.log('  Registry Regression Suite');
    console.log('══════════════════════════════════════════════════════');
    if (process.env.SUPABASE_URL) {
        console.log('  Supabase: connected — DB-backed tests enabled');
    } else {
        console.log('  Supabase: not configured — DB-backed tests skipped');
    }

    const totalStart = Date.now();

    for (const suite of suites) {
        try {
            await suite.run();
        } catch (e) {
            console.error(`\n  [SUITE CRASH] ${suite.name}:`, e.message);
        }
    }

    const { passed, failed, skipped } = totals();
    const elapsed = Date.now() - totalStart;

    console.log('\n══════════════════════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed, ${skipped} skipped  (${elapsed}ms)`);
    console.log('══════════════════════════════════════════════════════\n');

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
    console.error('[registry suite] Fatal:', e.message);
    process.exit(1);
});
