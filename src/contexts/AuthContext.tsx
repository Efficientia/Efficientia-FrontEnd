import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import {
  authService,
  clearStoredAuthSession,
  getStoredAuthSession,
  writeStoredAuthSession,
} from '../services';
import type {
  AdminResponse,
  UsuarioResponse,
  LoginRequest,
  LoginAdminRequest,
  CriarPrimeiroAdminRequest,
} from '../types/auth';
import type { EmpresaResponse } from '../types/empresa';
import {
  AuthContext,
  type AuthContextData,
} from './authContextDef';

interface AuthState {
  token: string | null;
  user: AdminResponse | UsuarioResponse | null;
  empresa: EmpresaResponse | null;
  roles: string[];
  isLoading: boolean;
}

type AuthSessionState = Omit<AuthState, 'isLoading'>;
type AuthenticatedSession = Omit<AuthSessionState, 'token'> & { token: string };

type AuthAction =
  | { type: 'restore'; session: AuthSessionState | null }
  | { type: 'requestStarted' }
  | { type: 'authenticated'; session: AuthenticatedSession }
  | { type: 'requestFinished' }
  | { type: 'loggedOut' };

const initialAuthState: AuthState = {
  token: null,
  user: null,
  empresa: null,
  roles: [],
  isLoading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'restore':
      return { ...(action.session ?? initialAuthState), isLoading: false };
    case 'requestStarted':
      return { ...state, isLoading: true };
    case 'authenticated':
      return { ...action.session, isLoading: false };
    case 'requestFinished':
      return { ...state, isLoading: false };
    case 'loggedOut':
      return { ...initialAuthState, isLoading: false };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  const logout = useCallback((): void => {
    dispatch({ type: 'loggedOut' });
    authService.logout();
  }, []);

  const persistSession = useCallback((session: AuthenticatedSession): void => {
    writeStoredAuthSession(session);
    dispatch({ type: 'authenticated', session });
  }, []);

  useEffect(() => {
    try {
      const storedSession = getStoredAuthSession();
      dispatch({
        type: 'restore',
        session: storedSession
          ? {
              token: storedSession.token,
              user: storedSession.user,
              empresa: storedSession.empresa,
              roles: storedSession.roles,
            }
          : null,
      });
    } catch {
      clearStoredAuthSession();
      dispatch({ type: 'restore', session: null });
    }

    const handleUnauthorized = () => logout();
    window.addEventListener('efficientia:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('efficientia:unauthorized', handleUnauthorized);
  }, [logout]);

  const loginFuncionario = useCallback(async (dados: LoginRequest): Promise<string[]> => {
    dispatch({ type: 'requestStarted' });
    try {
      const response = await authService.loginUsuario(dados);
      const roles = [response.usuario.tipo.toUpperCase()];
      persistSession({
        token: response.token,
        user: response.usuario,
        empresa: null,
        roles,
      });
      return roles;
    } finally {
      dispatch({ type: 'requestFinished' });
    }
  }, [persistSession]);

  const loginAdmin = useCallback(async (dados: LoginAdminRequest): Promise<string[]> => {
    dispatch({ type: 'requestStarted' });
    try {
      const response = await authService.loginAdmin(dados);
      const roles = response.roles;
      persistSession({
        token: response.token,
        user: response.admin,
        empresa: response.empresa,
        roles,
      });
      return roles;
    } finally {
      dispatch({ type: 'requestFinished' });
    }
  }, [persistSession]);

  const cadastrarPrimeiroAdmin = useCallback(async (dados: CriarPrimeiroAdminRequest): Promise<void> => {
    dispatch({ type: 'requestStarted' });
    try {
      const response = await authService.cadastrarPrimeiroAdmin(dados);
      persistSession({
        token: response.token,
        user: response.admin,
        empresa: response.empresa,
        roles: response.roles,
      });
    } finally {
      dispatch({ type: 'requestFinished' });
    }
  }, [persistSession]);

  const hasRole = useCallback(
    (role: string): boolean => state.roles.includes(role.toUpperCase()),
    [state.roles]
  );

  const value = useMemo<AuthContextData>(() => ({
    ...state,
    isAuthenticated: Boolean(state.token),
    loginFuncionario,
    loginAdmin,
    cadastrarPrimeiroAdmin,
    logout,
    hasRole,
  }), [state, loginFuncionario, loginAdmin, cadastrarPrimeiroAdmin, logout, hasRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
