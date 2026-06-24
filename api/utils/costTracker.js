/**
 * Cost Tracking and Analytics
 * Monitors API usage, costs, and savings across the hybrid AI system
 */

class CostTracker {
  constructor() {
    this.sessions = new Map();
    this.totalStats = {
      totalCalls: 0,
      lightTaskCalls: 0,
      heavyTaskCalls: 0,
      totalCost: 0,
      estimatedSavings: 0,
      startTime: new Date()
    };
  }

  /**
   * Track an AI call
   * @param {object} callData - Call information including cost and model
   */
  trackCall(callData) {
    const {
      taskType,
      model,
      cost,
      promptTokens,
      outputTokens,
      timestamp = new Date()
    } = callData;

    const sessionId = this.getSessionId();

    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        calls: [],
        startTime: timestamp,
        totalCost: 0,
        totalSavings: 0
      });
    }

    const session = this.sessions.get(sessionId);
    session.calls.push({
      taskType,
      model,
      cost: cost.estimated,
      savings: cost.savings,
      tokens: { prompt: promptTokens, output: outputTokens },
      timestamp
    });

    session.totalCost += cost.estimated;
    session.totalSavings += cost.savings;

    // Update global stats
    this.totalStats.totalCalls++;
    if (model === 'gemini-2.0-flash-lite') {
      this.totalStats.lightTaskCalls++;
    } else {
      this.totalStats.heavyTaskCalls++;
    }
    this.totalStats.totalCost += cost.estimated;
    this.totalStats.estimatedSavings += cost.savings;
  }

  /**
   * Get session ID (in production, use actual session management)
   */
  getSessionId() {
    // Simplified - in production use proper session management
    return 'session_' + new Date().toISOString().split('T')[0];
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const uptime = new Date() - this.totalStats.startTime;
    const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(2);

    return {
      period: {
        start: this.totalStats.startTime,
        uptime: `${uptimeHours} hours`
      },
      calls: {
        total: this.totalStats.totalCalls,
        lightTasks: this.totalStats.lightTaskCalls,
        heavyTasks: this.totalStats.heavyTaskCalls,
        lightTaskPercentage: (
          (this.totalStats.lightTaskCalls / this.totalStats.totalCalls) *
          100
        ).toFixed(1) + '%'
      },
      costs: {
        totalSpent: `$${this.totalStats.totalCost.toFixed(4)}`,
        estimatedIfAllPremium: `$${(
          (this.totalStats.totalCost + this.totalStats.estimatedSavings).toFixed(4)
        )}`,
        totalSavings: `$${this.totalStats.estimatedSavings.toFixed(4)}`,
        savingsPercentage: (
          (this.totalStats.estimatedSavings /
            (this.totalStats.totalCost + this.totalStats.estimatedSavings)) *
          100
        ).toFixed(1) + '%',
        averageCostPerCall: `$${(
          this.totalStats.totalCost / this.totalStats.totalCalls
        ).toFixed(6)}`
      }
    };
  }

  /**
   * Export stats for monitoring/dashboard
   */
  exportStats() {
    return {
      summary: this.getSummary(),
      sessions: Array.from(this.sessions.entries()).map(([id, data]) => ({
        id,
        startTime: data.startTime,
        callCount: data.calls.length,
        totalCost: `$${data.totalCost.toFixed(4)}`,
        totalSavings: `$${data.totalSavings.toFixed(4)}`
      }))
    };
  }
}

// Singleton instance
let trackerInstance = null;

export function getCostTracker() {
  if (!trackerInstance) {
    trackerInstance = new CostTracker();
  }
  return trackerInstance;
}

export function resetCostTracker() {
  trackerInstance = new CostTracker();
}
