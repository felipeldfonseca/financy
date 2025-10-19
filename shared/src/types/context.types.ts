export enum ContextType {
  PERSONAL = 'personal',
  FAMILY = 'family',
  PROJECT = 'project',
}

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export interface Context {
  id: string;
  name: string;
  description?: string;
  type: ContextType;
  currency: string;
  timezone: string;
  ownerId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContextMember {
  id: string;
  contextId: string;
  userId: string;
  role: UserRole;
  joinedAt: Date;
}

export interface CreateContextDto {
  name: string;
  description?: string;
  type: ContextType;
  currency: string;
  timezone: string;
}

export interface UpdateContextDto {
  name?: string;
  description?: string;
  currency?: string;
  timezone?: string;
  isActive?: boolean;
}

export interface ContextResponse extends Context {
  memberCount: number;
  role?: UserRole;
}