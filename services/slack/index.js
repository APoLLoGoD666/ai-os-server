'use strict';

module.exports = {
  client:       require('./slack-client'),
  alerts:       require('./slack-alerts'),
  agents:       require('./slack-agents'),
  briefings:    require('./slack-briefings'),
  systemHealth: require('./slack-system-health'),
};
