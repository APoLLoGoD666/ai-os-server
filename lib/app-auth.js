'use strict';

// Canonical app auth is requireAppAccess from lib/middleware (supports x-app-key + JWT cookie).
// Route files that require this module gain both auth paths.
module.exports = require('./middleware').requireAppAccess;
