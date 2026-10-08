import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import {
  authService,
  USER_STORAGE_KEY,
  EMPRESA_STORAGE_KEY,
  getStoredToken,
  setStoredToken,
  removeStoredToken,
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
  ROLES_STORAGE_KEY,
  type AuthContextData,
} from './authContextDef';

interface AuthState {
  token: string | null;
  user: AdminResponse | UsuarioResponse | null;
  empresa: EmpresaResponse | null;
  roles: string[];
  isLoading: boolean;
}

type AuthAction =
  | { type: 'restore'; session: Omit<AuthState, 'isLoading'> | null }
  | { type: 'requestStarted' }
  | { type: 'authenticated'; session: Omit<AuthState, 'isLoading'> }
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
      return { ...(action.session ?? { token: null, user: null, empresa: null, roles: [] }), isLoading: false };
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
    localStorage.removeItem(ROLES_STORAGE_KEY);
    authService.logout();
  }, []);

  useEffect(() => {
    try {
      const token = getStoredToken();
      if (!token) {
        dispatch({ type: 'restore', session: null });
      } else {
        const userJson = localStorage.getItem(USER_STORAGE_KEY);
        const empresaJson = localStorage.getItem(EMPRESA_STORAGE_KEY);
        const rolesJson = localStorage.getItem(ROLES_STORAGE_KEY);
        const rolesValue: unknown = rolesJson ? JSON.parse(rolesJson) : [];
        const roles = Array.isArray(rolesValue)
          ? rolesValue.filter((role: unknown): role is string => typeof role === 'string')
          : [];

        dispatch({
          type: 'restore',
          session: {
            token,
            user: userJson ? JSON.parse(userJson) as AdminResponse | UsuarioResponse : null,
            empresa: empresaJson ? JSON.parse(empresaJson) as EmpresaResponse : null,
            roles,
          },
        });
      }
    } catch {
      removeStoredToken();
      localStorage.removeItem(ROLES_STORAGE_KEY);
      dispatch({ type: 'restore', session: null });
    }

    const handleUnauthorized = () => logout();
    window.addEventListener('efficientia:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('efficientia:unauthorized', handleUnauthorized);
  }, [logout]);

  const loginFuncionario = useCallback(async (dados: LoginRequest): Promise<void> => {
    dispatch({ type: 'requestStarted' });
    try {
      const response = await authService.loginUsuario(dados);
      const session = {
        token: response.token,
        user: response.usuario,
        empresa: null,
        roles: [response.usuario.tipo.toUpperCase()],
      };
      dispatch({ type: 'authenticated', session });
      setStoredToken(session.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));
      localStorage.removeItem(EMPRESA_STORAGE_KEY);
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(session.roles));
    } finally {
      dispatch({ type: 'requestFinished' });
    }
  }, []);

  const loginAdmin = useCallback(async (dados: LoginAdminRequest): Promise<void> => {
    dispatch({ type: 'requestStarted' });
    try {
      const response = await authService.loginAdmin(dados);
      const session = {
        token: response.token,
        user: response.admin,
        empresa: response.empresa,
        roles: response.roles,
      };
      dispatch({ type: 'authenticated', session });
      setStoredToken(session.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));
      localStorage.setItem(EMPRESA_STORAGE_KEY, JSON.stringify(session.empresa));
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(session.roles));
    } finally {
      dispatch({ type: 'requestFinished' });
    }
  }, []);

  const cadastrarPrimeiroAdmin = useCallback(async (dados: CriarPrimeiroAdminRequest): Promise<void> => {
    dispatch({ type: 'requestStarted' });
    try {
      const response = await authService.cadastrarPrimeiroAdmin(dados);
      const session = {
        token: response.token,
        user: response.admin,
        empresa: response.empresa,
        roles: response.roles,
      };
      dispatch({ type: 'authenticated', session });
      setStoredToken(session.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));
      localStorage.setItem(EMPRESA_STORAGE_KEY, JSON.stringify(session.empresa));
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(session.roles));
    } finally {
      dispatch({ type: 'requestFinished' });
    }
  }, []);

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
