import api from './api';

export type GoalStatus = 'active' | 'archived';

/** 'target' = event goal (finish line); 'recurring' = monthly habit. */
export type GoalType = 'target' | 'recurring';

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

export interface GoalContribution {
  id: string;
  amount: number;
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

  /** Deposits in the caller's own name. */
  async contribute(
    id: string,
    data: ContributeData,
  ): Promise<{ goal: Goal; contribution: GoalContribution }> {
    const response = await api.post(`/goals/${id}/contributions`, data);
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
