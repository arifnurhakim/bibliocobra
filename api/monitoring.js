/**
 * Monitoring Dashboard Endpoint
 * Provides cost analytics and performance metrics
 */

import { getCostTracker } from './utils/costTracker.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method tidak diizinkan. Gunakan GET.' });
  }

  try {
    const tracker = getCostTracker();
    const stats = tracker.exportStats();

    return res.status(200).json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Monitoring] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengambil monitoring data'
    });
  }
}
