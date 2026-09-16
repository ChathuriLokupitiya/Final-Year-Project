const { GoogleGenAI } = require('@google/genai');
const logger = require('./logger.util');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error) => {
  const msg = error?.message || '';
  return (
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('"code":503') ||
    msg.includes('"code":429')
  );
};

const getModelCandidates = () => {
  const primary = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-flash-latest')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  return [...new Set([primary, ...fallbacks])].slice(0, 2);
};

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`TIMEOUT: ${label} exceeded ${ms}ms`)), ms);
    }),
  ]);

/**
 * Generate text with Gemini (retry + model fallback).
 */
const generateGeminiText = async ({
  systemInstruction,
  userMessage,
  temperature = 0.5,
  maxOutputTokens = 2048,
  timeoutMs,
}) => {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error('GEMINI_API_KEY is not configured');
    err.code = 'GEMINI_CONFIG';
    throw err;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = getModelCandidates();
  const perCallMs = timeoutMs || Number(process.env.GEMINI_TIMEOUT_MS) || 20000;
  let lastError;

  const contents = [{ role: 'user', parts: [{ text: userMessage }] }];
  const config = { systemInstruction, temperature, maxOutputTokens };

  for (const model of models) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({ model, contents, config }),
        perCallMs,
        model
      );
      return (response.text || '').trim();
    } catch (error) {
      lastError = error;
      const msg = error?.message || '';
      if (msg.startsWith('TIMEOUT:') || isRetryableError(error)) {
        logger.warn(`Gemini ${model} unavailable, trying next model...`);
        continue;
      }
      throw error;
    }
  }

  if (models[0]) {
    await sleep(400);
    const response = await ai.models.generateContent({
      model: models[0],
      contents,
      config,
    });
    return (response.text || '').trim();
  }

  throw lastError || new Error('Gemini generation failed');
};

const extractJsonObject = (text = '') => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text.trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
};

module.exports = {
  generateGeminiText,
  extractJsonObject,
  isRetryableError,
};
