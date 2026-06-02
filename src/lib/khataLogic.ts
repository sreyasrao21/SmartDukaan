export const SCORE_MIN = 300;
export const SCORE_MAX = 900;
export const SCORE_DEFAULT = 600;

export interface KhataExplanation {
  score: number;
  limit: number;
  availableCredit: number;
  reasons: string[];
  riskLevel: 'LOW' | 'SOFT' | 'STRONG';
  riskMessage?: string;
  components: {
    pts: number;
    cs: number;
    ors: number;
    rs: number;
  };
}

/**
 * Calculates the Khata Limit based on the Khata Score.
 * @param score Khata Score (300-900)
 */
export const calculateKhataLimit = (score: number): number => {
  if (score >= 800) return 10000;
  if (score >= 700) return 6000;
  if (score >= 600) return 3000;
  if (score >= 500) return 1000;
  return 0;
};

/**
 * Gets credit health explanation and risk status for the UI.
 * This is a pure, offline-free calculation using values provided by our Mongoose API.
 */
export const getKhataStatus = (
  balance: number,
  globalScore?: number,
  globalLimit?: number
): KhataExplanation => {
  const score = globalScore !== undefined ? globalScore : SCORE_DEFAULT;
  const limit = globalLimit !== undefined ? globalLimit : calculateKhataLimit(score);
  
  const reasons: string[] = [];

  // Logic-based explanation reasons
  if (score < 500) {
    reasons.push("Score is low based on network-wide credit history.");
  } else if (score < 700) {
    reasons.push("Good network-wide score, with some room for improvement.");
  } else {
    reasons.push("Excellent global creditworthiness across all shops.");
  }

  if (balance > limit) {
    reasons.push("Currently exceeding the approved credit limit.");
  } else if (balance > 0.8 * limit) {
    reasons.push("Close to the credit limit threshold.");
  }

  // Risk Assessment
  let riskLevel: 'LOW' | 'SOFT' | 'STRONG' = 'LOW';
  let riskMessage = "";

  const usageRatio = limit > 0 ? (balance / limit) : (balance > 0 ? 2 : 0);

  if (score < 450 || usageRatio > 1.5) {
    riskLevel = 'STRONG';
    riskMessage = score < 450
      ? "High risk: Poor repayment history and low credit trust."
      : "High risk: Limit exceeded significantly.";
  } else if (score < 600 || usageRatio >= 0.9) {
    riskLevel = 'SOFT';
    riskMessage = score < 600
      ? "Caution: Moderate repayment history."
      : "Customer is close to or has exceeded their limit.";
  }

  return {
    score,
    limit,
    availableCredit: Math.max(0, limit - balance),
    reasons,
    riskLevel,
    riskMessage,
    components: {
      pts: 0,
      cs: 0,
      ors: 0,
      rs: 0
    }
  };
};
