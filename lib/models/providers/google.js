'use strict';
// lib/models/providers/google.js — Gemini provider

const { ModelInterface, ModelResult } = require('../interface');
const vault = require('../../secrets/vault');

class GeminiModel extends ModelInterface {
  constructor(modelId, config) {
    super({ modelId, provider: 'google', ...config });
    this._genAI = null;  // lazy init
  }

  _getGenAI() {
    if (!this._genAI) {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      this._genAI = new GoogleGenerativeAI(vault.get('GOOGLE_API_KEY'));
    }
    return this._genAI;
  }

  _adaptContext(contextPackage) {
    const founder = contextPackage?.founder_context || {};
    const lessons = contextPackage?.lessons || [];

    const systemText = [
      'You are APEX, a personal AI operating system.',
      founder.identity_summary || '',
      lessons.length ? lessons.slice(0, 3).map(l => `Lesson: ${l.content}`).join('\n') : '',
    ].filter(Boolean).join('\n');

    const userText = contextPackage?.task?.description || '';
    return {
      systemInstruction: { parts: [{ text: systemText }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
    };
  }

  async complete(taskDescription, contextPackage, options = {}) {
    const adapted = this._adaptContext(contextPackage);
    const start   = Date.now();
    const model   = this._getGenAI().getGenerativeModel({
      model:             this.modelId,
      systemInstruction: adapted.systemInstruction,
    });

    const result = await model.generateContent(adapted.contents);
    const resp   = result.response;

    return new ModelResult({
      content:      resp.text(),
      inputTokens:  resp.usageMetadata?.promptTokenCount     || 0,
      outputTokens: resp.usageMetadata?.candidatesTokenCount || 0,
      stopReason:   'end_turn',
      modelId:      this.modelId,
      provider:     'google',
      durationMs:   Date.now() - start,
    });
  }

  async ping() {
    try {
      await this.complete('ping', { task: { description: 'ping' } }, { maxTokens: 5 });
      return true;
    } catch { return false; }
  }
}

module.exports = GeminiModel;
