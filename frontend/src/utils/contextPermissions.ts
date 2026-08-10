import { ContextMember, MemberRole } from '../services/contextApi';

/**
 * Mirrors the permission rules the API enforces (ContextMember in the backend).
 * The server remains the authority — this only decides which controls are worth
 * showing, so a member is never offered an action that would be refused.
 */

/** Highest first, so roles can be compared and listed consistently. */
export const MEMBER_ROLES: MemberRole[] = ['owner', 'admin', 'member', 'viewer'];

export const canManageMembers = (role?: MemberRole): boolean =>
  role === 'owner' || role === 'admin';

export const canManageContext = (role?: MemberRole): boolean => role === 'owner';

export const canEditTransactions = (member?: Pick<ContextMember, 'role' | 'status'>): boolean =>
  member?.status === 'active' && member.role !== 'viewer';

export const canViewTransactions = (member?: Pick<ContextMember, 'role' | 'status'>): boolean =>
  member?.status === 'active';

/**
 * Owners cannot be removed or demoted — the backend refuses it, and a context
 * without an owner would have nobody able to manage it.
 */
export const canRemoveMember = (actorRole: MemberRole | undefined, target: ContextMember): boolean =>
  canManageMembers(actorRole) && target.role !== 'owner';

export const canChangeRole = (actorRole: MemberRole | undefined, target: ContextMember): boolean =>
  canManageMembers(actorRole) && target.role !== 'owner';

/** Roles a member may be moved to. Ownership transfer is not exposed. */
export const assignableRoles = (actorRole: MemberRole | undefined): MemberRole[] =>
  canManageMembers(actorRole) ? ['admin', 'member', 'viewer'] : [];

/** The caller's own membership row, used to decide what the UI offers. */
export const findOwnMembership = (
  members: ContextMember[],
  userId?: string,
): ContextMember | undefined => members.find((member) => member.userId === userId);

export const isInvitationPending = (member: ContextMember): boolean =>
  member.status === 'invited';

/** An invitation is only useful while its token is still valid. */
export const isInvitationExpired = (member: ContextMember, now: Date = new Date()): boolean => {
  if (!member.inviteExpiresAt) return false;
  return new Date(member.inviteExpiresAt).getTime() < now.getTime();
};
