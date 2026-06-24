/**
 * Hybrid AI Chat Endpoint
 * Intelligently routes requests to appropriate AI model based on task type
 * Replaces the original api/chat.js with hybrid strategy
 */

import { routeToHybridAI } from './utils/hybridRouter.js';
import { getCostTracker } from './utils/costTracker.js';

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan. Gunakan POST.' });
  }

  const { prompt, taskType = 'default', options = {} } = req.body;

  // Validate input
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt tidak boleh kosong' });
  }

  if (typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt harus berupa string' });
  }

  if (prompt.length > 10000) {
    return res.status(400).json({ error: 'Prompt terlalu panjang (max 10000 karakter)' });
  }

  try {
    // Route request to appropriate model
    const aiResponse = await routeToHybridAI(taskType, prompt, options);

    // Track cost for analytics
    const tracker = getCostTracker();
    tracker.trackCall({
      taskType: aiResponse.taskType,
      model: aiResponse.model,
      cost: aiResponse.cost,
      promptTokens: aiResponse.usage.promptTokens,
      outputTokens: aiResponse.usage.outputTokens
    });

    // Return response with model info and cost tracking
    return res.status(200).json({
      success: true,
      response: aiResponse.text,
      metadata: {
        model: aiResponse.model,
        taskType: aiResponse.taskType,
        quality: aiResponse.quality,
        usage: aiResponse.usage,
        cost: aiResponse.cost,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Chat Hybrid] Error:', error.message);

    // Return user-friendly error
    return res.status(500).json({
      success: false,
      error: 'Gagal menghubungi AI',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
