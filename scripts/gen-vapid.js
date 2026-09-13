'use strict';
// Run once: node scripts/gen-vapid.js
// Add the output to Render env vars as VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log('\nAdd these to Render environment variables:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:arwwork1@gmail.com\n`);
