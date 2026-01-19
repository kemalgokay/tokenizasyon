import { STORAGE_KEYS } from './storage';

export type ActorRole =
  | 'ADMIN'
  | 'ISSUER'
  | 'OPS'
  | 'AUDITOR'
  | 'TRADER'
  | 'MARKET_MAKER';

export interface AuthContext {
  actorId: string;
  actorRole: ActorRole;
}

export const getAuthContext = (): AuthContext | null => {
  const actorId = localStorage.getItem(STORAGE_KEYS.actorId) ?? '';
  const actorRole = localStorage.getItem(STORAGE_KEYS.actorRole) as ActorRole | null;
  if (!actorId || !actorRole) {
    return null;
  }
  return { actorId, actorRole };
};

export const setAuthContext = (context: AuthContext): void => {
  localStorage.setItem(STORAGE_KEYS.actorId, context.actorId);
  localStorage.setItem(STORAGE_KEYS.actorRole, context.actorRole);
};

export const clearAuthContext = (): void => {
  localStorage.removeItem(STORAGE_KEYS.actorId);
  localStorage.removeItem(STORAGE_KEYS.actorRole);
};

export const getAuthHeaders = (): Record<string, string> => {
  const auth = getAuthContext();
  if (!auth) {
    return {};
  }
  return {
    'X-Actor-Id': auth.actorId,
    'X-Actor-Role': auth.actorRole
  };
};
