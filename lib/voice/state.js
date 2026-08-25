'use strict';

const voiceState = {
    active:      false,
    ttsPlaying:  false,
    interrupted: false,
    sessionId:   null,
    listeners:   new Set()
};

function broadcastVoiceState() {
    const payload = JSON.stringify({ type: 'voice_state', ...voiceState, listeners: undefined });
    for (const ws of voiceState.listeners) {
        try { if (ws.readyState === 1) ws.send(payload); } catch {}
    }
}

module.exports = { voiceState, broadcastVoiceState };
