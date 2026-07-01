const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://129b023610ae7b1efa9c0bcf03f337e8@o4511384783880192.ingest.de.sentry.io/4511510610706512",
  environment: process.env.NODE_ENV || "production",
  tracesSampleRate: 0.1,
});
