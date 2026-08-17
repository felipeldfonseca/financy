import api from './api';

export type GoalStatus = 'active' | 'archived';

/** 'target' = event goal (finish line); 'recurring' = monthly habit. */
export type GoalType = 'target' | 'recurring';

/** Which period the expected growth rate was quoted in. */
export type GrowthRatePeriod = 'monthly' | 'yearly';

export interface Goal {
  id: string;
  name: string;
  goalType: GoalType;
  /** Event goals always have one; habits may not. */
  targetAmount?: number | null;
  /** The habit's monthly deposit target; null for event goals. */
  monthlyTarget?: number | null;
  /** This month's deposits, attached by the server for habits. */
  monthContributed?: number;
  /** Expected growth rate in %, exactly as quoted; projections only. */
  expectedGrowthRate?: number | null;
  /** Whether the rate is % per month or % per year; the server defaults to yearly. */
  growthRatePeriod?: GrowthRatePeriod;
  currentAmount: number;
  currency: string;
  /** Optional deadline, YYYY-MM-DD. */
  targetDate?: string | null;
  color?: string | null;
  status: GoalStatus;
  userId: string;
  contextId: string;
  createdAt: string;
  updatedAt: string;
  /** Derived server-side: currentAmount >= targetAmount. */
  isAchieved: boolean;
}

/** 'deposit' counts towards the month bar; 'adjustment' only moves the total. */
export type ContributionKind = 'deposit' | 'adjustment';

export interface GoalContribution {
  id: string;
  /** Negative only for adjustments. */
  amount: number;
  kind: ContributionKind;
  /** Why the balance was adjusted; null on deposits. */
  note?: string | null;
  date: string;
  goalId: string;
  userId: string;
  createdAt: string;
  /** Who saved it — naming fields only, present on the trail listing. */
  user?: { id: string; firstName: string; lastName: string };
}

export interface CreateGoalData {
  name: string;
  goalType?: GoalType;
  targetAmount?: number;
  monthlyTarget?: number;
  /** Expected growth rate in %, in the period below; projections only. */
  expectedGrowthRate?: number;
  growthRatePeriod?: GrowthRatePeriod;
  currency?: string;
  targetDate?: string;
  color?: string;
  /** Shared context the goal belongs to; omitted for personal ones. */
  contextId?: string;
}

export interface UpdateGoalData extends Partial<Omit<CreateGoalData, 'contextId'>> {
  status?: GoalStatus;
}

export interface ContributeData {
  amount: number;
  /** When the money was put aside; the server defaults to today. */
  date?: string;
}

export interface AdjustBalanceData {
  /** Signed: positive for yield, negative for a loss or withdrawal. */
  amount: number;
  note?: string;
  date?: string;
}

export const goalApi = {
  async list(filters?: { contextId?: string; status?: GoalStatus | 'all' }): Promise<Goal[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.append(key, String(value));
      });
    }
    const response = await api.get(`/goals?${params.toString()}`);
    return response.data;
  },

  async create(data: CreateGoalData): Promise<Goal> {
    const response = await api.post('/goals', data);
    return response.data;
  },

  async update(id: string, data: UpdateGoalData): Promise<Goal> {
    const response = await api.patch(`/goals/${id}`, data);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/goals/${id}`);
  },

  /** Hand-picked list order: index = position; first three reach the dashboard. */
  async reorder(goalIds: string[]): Promise<void> {
    await api.post('/goals/reorder', { goalIds });
  },

  /** Deposits in the caller's own name. */
  async contribute(
    id: string,
    data: ContributeData,
  ): Promise<{ goal: Goal; contribution: GoalContribution }> {
    const response = await api.post(`/goals/${id}/contributions`, data);
    return response.data;
  },

  /** ± balance correction, recorded in the trail as an adjustment. */
  async adjust(
    id: string,
    data: AdjustBalanceData,
  ): Promise<{ goal: Goal; contribution: GoalContribution }> {
    const response = await api.post(`/goals/${id}/adjust`, data);
    return response.data;
  },

  async listContributions(id: string): Promise<GoalContribution[]> {
    const response = await api.get(`/goals/${id}/contributions`);
    return response.data;
  },

  async removeContribution(goalId: string, contributionId: string): Promise<void> {
    await api.delete(`/goals/${goalId}/contributions/${contributionId}`);
  },
};
