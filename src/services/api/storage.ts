import type { AdminResponse, UsuarioResponse } from '../../types/auth';
import type { EmpresaResponse } from '../../types/empresa';

const AUTH_TOKEN_KEY = '@efficientia:v1:token';
const AUTH_PROFILE_KEY = '@efficientia:v1:profile';
const LEGACY_AUTH_KEYS = ['@efficientia:token', '@efficientia:user', '@efficientia:empresa', '@efficientia:roles', 'token'];

let legacyAuthKeysRemoved = false;

export interface StoredAuthSession {
  token: string;
  user: AdminResponse | UsuarioResponse | null;
  empresa: EmpresaResponse | null;
  roles: string[];
}

interface StoredAuthProfile {
  version: 1;
  user: AdminResponse | UsuarioResponse | null;
  empresa: EmpresaResponse | null;
  roles: string[];
}

function clearLegacyAuthKeys(): void {
  if (legacyAuthKeysRemoved) {
    return;
  }

  for (const key of LEGACY_AUTH_KEYS) {
    localStorage.removeItem(key);
  }
  sessionStorage.removeItem('@efficientia:token');
  legacyAuthKeysRemoved = true;
}

function isStoredAuthProfile(value: unknown): value is StoredAuthProfile {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  if (!('version' in value) || value.version !== 1 || !('roles' in value) || !Array.isArray(value.roles)) {
    return false;
  }

  if (!value.roles.every((role: unknown) => typeof role === 'string') || !('user' in value) || !('empresa' in value)) {
    return false;
  }

  const userIsObject = value.user === null || (
    typeof value.user === 'object' && value.user !== null && !Array.isArray(value.user)
  );
  const empresaIsObject = value.empresa === null || (
    typeof value.empresa === 'object' && value.empresa !== null && !Array.isArray(value.empresa)
  );
  return userIsObject && empresaIsObject;
}

export function getStoredToken(): string | null {
  clearLegacyAuthKeys();
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredAuthSession(): StoredAuthSession | null {
  clearLegacyAuthKeys();
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const rawProfile = localStorage.getItem(AUTH_PROFILE_KEY);
  if (!token || !rawProfile) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_PROFILE_KEY);
    return null;
  }

  try {
    const profile: unknown = JSON.parse(rawProfile);
    if (!isStoredAuthProfile(profile)) {
      clearStoredAuthSession();
      return null;
    }

    return {
      token,
      user: profile.user as AdminResponse | UsuarioResponse | null,
      empresa: profile.empresa as EmpresaResponse | null,
      roles: profile.roles,
    };
  } catch {
    clearStoredAuthSession();
    return null;
  }
}

export function writeStoredAuthSession(session: StoredAuthSession): void {
  clearLegacyAuthKeys();
  localStorage.setItem(AUTH_TOKEN_KEY, session.token);
  const profile: StoredAuthProfile = {
    version: 1,
    user: session.user,
    empresa: session.empresa,
    roles: session.roles,
  };
  localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile));
}

export function clearStoredAuthSession(): void {
  clearLegacyAuthKeys();
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_PROFILE_KEY);
}
