import {
  assignableRoles,
  canChangeRole,
  canEditTransactions,
  canManageContext,
  canManageMembers,
  canRemoveMember,
  canViewTransactions,
  findOwnMembership,
  isInvitationExpired,
  isInvitationPending,
} from './contextPermissions';
import { ContextMember, MemberRole, MemberStatus } from '../services/contextApi';

const member = (role: MemberRole, status: MemberStatus = 'active', overrides = {}): ContextMember =>
  ({
    id: `member-${role}-${status}`,
    role,
    status,
    contextId: 'context-1',
    userId: `user-${role}`,
    ...overrides,
  }) as ContextMember;

describe('who may manage a context', () => {
  it('lets owners and admins manage members', () => {
    expect(canManageMembers('owner')).toBe(true);
    expect(canManageMembers('admin')).toBe(true);
    expect(canManageMembers('member')).toBe(false);
    expect(canManageMembers('viewer')).toBe(false);
    expect(canManageMembers(undefined)).toBe(false);
  });

  it('reserves editing the context itself for the owner', () => {
    expect(canManageContext('owner')).toBe(true);
    expect(canManageContext('admin')).toBe(false);
  });
});

describe('who may touch transactions', () => {
  it('lets every active member except viewers record transactions', () => {
    expect(canEditTransactions(member('owner'))).toBe(true);
    expect(canEditTransactions(member('admin'))).toBe(true);
    expect(canEditTransactions(member('member'))).toBe(true);
    expect(canEditTransactions(member('viewer'))).toBe(false);
  });

  it('lets viewers read but not write', () => {
    expect(canViewTransactions(member('viewer'))).toBe(true);
    expect(canEditTransactions(member('viewer'))).toBe(false);
  });

  it('grants nothing until an invitation is accepted', () => {
    expect(canViewTransactions(member('member', 'invited'))).toBe(false);
    expect(canEditTransactions(member('member', 'invited'))).toBe(false);
  });

  it('grants nothing to someone who left or was suspended', () => {
    expect(canViewTransactions(member('admin', 'left'))).toBe(false);
    expect(canViewTransactions(member('admin', 'suspended'))).toBe(false);
  });
});

describe('acting on other members', () => {
  it('never offers removing or demoting the owner', () => {
    const owner = member('owner');

    expect(canRemoveMember('owner', owner)).toBe(false);
    expect(canRemoveMember('admin', owner)).toBe(false);
    expect(canChangeRole('admin', owner)).toBe(false);
  });

  it('lets managers act on ordinary members', () => {
    const ordinary = member('member');

    expect(canRemoveMember('owner', ordinary)).toBe(true);
    expect(canChangeRole('admin', ordinary)).toBe(true);
  });

  it('offers nothing to members and viewers', () => {
    const ordinary = member('member');

    expect(canRemoveMember('member', ordinary)).toBe(false);
    expect(canChangeRole('viewer', ordinary)).toBe(false);
    expect(assignableRoles('member')).toEqual([]);
  });

  it('never offers to hand over ownership', () => {
    expect(assignableRoles('owner')).not.toContain('owner');
    expect(assignableRoles('owner')).toEqual(['admin', 'member', 'viewer']);
  });
});

describe('reading the caller own membership', () => {
  it('finds the row belonging to the signed-in user', () => {
    const members = [member('owner'), member('viewer')];

    expect(findOwnMembership(members, 'user-viewer')?.role).toBe('viewer');
    expect(findOwnMembership(members, 'someone-else')).toBeUndefined();
    expect(findOwnMembership(members, undefined)).toBeUndefined();
  });
});

describe('invitation state', () => {
  it('recognises a pending invitation', () => {
    expect(isInvitationPending(member('member', 'invited'))).toBe(true);
    expect(isInvitationPending(member('member', 'active'))).toBe(false);
  });

  it('compares the expiry against the given moment', () => {
    const invited = member('member', 'invited', {
      inviteExpiresAt: '2026-08-10T00:00:00.000Z',
    });

    expect(isInvitationExpired(invited, new Date('2026-08-09T23:59:00.000Z'))).toBe(false);
    expect(isInvitationExpired(invited, new Date('2026-08-11T00:00:00.000Z'))).toBe(true);
  });

  it('treats an invitation with no expiry as still valid', () => {
    expect(isInvitationExpired(member('member', 'invited'))).toBe(false);
  });
});
