import api from './api';

export type ContextType =
  | 'personal'
  | 'family'
  | 'business'
  | 'shared_living'
  | 'trip'
  | 'project'
  | 'friends'
  | 'shared';

export type ContextVisibility = 'private' | 'invite_only' | 'public';

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export type MemberStatus = 'active' | 'invited' | 'suspended' | 'left';

export interface FinancialContext {
  id: string;
  name: string;
  description?: string;
  type: ContextType;
  visibility: ContextVisibility;
  defaultCurrency: string;
  timezone?: string;
  isActive: boolean;
  color?: string;
  icon?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContextMember {
  id: string;
  role: MemberRole;
  status: MemberStatus;
  joinedAt?: string;
  invitedAt?: string;
  inviteMessage?: string;
  inviteToken?: string;
  inviteExpiresAt?: string;
  /** Only present on the invite response: whether the email actually went out. */
  invitationEmailSent?: boolean;
  contextId: string;
  userId: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName?: string;
  };
}

export interface CreateContextData {
  name: string;
  description?: string;
  type: ContextType;
  visibility?: ContextVisibility;
  defaultCurrency?: string;
  color?: string;
  icon?: string;
}

export type UpdateContextData = Partial<CreateContextData>;

export interface InviteMemberData {
  email: string;
  role: MemberRole;
  message?: string;
}

export const contextApi = {
  async list(): Promise<FinancialContext[]> {
    const response = await api.get('/contexts');
    return response.data;
  },

  async get(id: string): Promise<FinancialContext & { members?: ContextMember[] }> {
    const response = await api.get(`/contexts/${id}`);
    return response.data;
  },

  async create(data: CreateContextData): Promise<FinancialContext> {
    const response = await api.post('/contexts', data);
    return response.data;
  },

  async update(id: string, data: UpdateContextData): Promise<FinancialContext> {
    const response = await api.patch(`/contexts/${id}`, data);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/contexts/${id}`);
  },

  async getMembers(id: string): Promise<ContextMember[]> {
    const response = await api.get(`/contexts/${id}/members`);
    return response.data;
  },

  async invite(id: string, data: InviteMemberData): Promise<ContextMember> {
    const response = await api.post(`/contexts/${id}/invite`, data);
    return response.data;
  },

  async acceptInvitation(token: string): Promise<ContextMember> {
    const response = await api.post(`/contexts/invitations/${token}/accept`);
    return response.data;
  },

  async updateMemberRole(id: string, memberId: string, role: MemberRole): Promise<ContextMember> {
    const response = await api.patch(`/contexts/${id}/members/${memberId}/role`, { role });
    return response.data;
  },

  async removeMember(id: string, memberId: string): Promise<void> {
    await api.delete(`/contexts/${id}/members/${memberId}`);
  },

  async leave(id: string): Promise<void> {
    await api.post(`/contexts/${id}/leave`);
  },
};

/**
 * The invitation link a member shares out of band. The API issues a token but
 * sends no email, so the person who invites is the one who delivers it.
 */
export const invitationUrl = (token: string): string =>
  `${window.location.origin}/invitations/${token}`;
