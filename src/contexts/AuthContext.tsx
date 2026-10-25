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

function normalizeRole(role: string): string {
  return role.toUpperCase().replace(/^ROLE_/, '');
}

type AuthAction =
  | { type: 'restore'; session: AuthSessionState | null }
  | { type: 'requestStarted' }
  | { type: 'authenticated'; session: AuthenticatedSession }
  | { type: 'requestFinished' }
  | { type: 'empresaUpdated'; empresa: EmpresaResponse }
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
    case 'empresaUpdated':
      return { ...state, empresa: action.empresa };
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

  const atualizarEmpresaLocal = useCallback((dados: Partial<EmpresaResponse>): void => {
    const baseEmpresa: EmpresaResponse = state.empresa || {
      id: 1,
      codigoEmpresa: 'EMP00001',
      codigo: 'EMP00001',
      codigoInterno: 'EMP00001',
      nomeEmpresa: (dados.nomeEmpresa || dados.nomeFantasia || 'Minha Empresa') as string,
      nome: (dados.nomeEmpresa || dados.nomeFantasia || 'Minha Empresa') as string,
      nomeFantasia: (dados.nomeFantasia || dados.nomeEmpresa || 'Minha Empresa') as string,
      razaoSocial: dados.razaoSocial ?? null,
      cnpj: dados.cnpj || '',
      emailCorporativo: dados.emailCorporativo || '',
      email: dados.emailCorporativo || '',
      telefone: dados.telefone ?? null,
      enderecoId: null,
      endereco: {
        id: null,
        cep: dados.cep ?? null,
        logradouro: dados.logradouro ?? null,
        numero: dados.numero ?? null,
        cidade: dados.cidade ?? null,
        estado: dados.estado ?? null,
        uf: dados.uf ?? dados.estado ?? null,
      },
      cep: dados.cep ?? null,
      logradouro: dados.logradouro ?? null,
      numero: dados.numero ?? null,
      cidade: dados.cidade ?? null,
      estado: dados.estado ?? null,
      uf: dados.uf ?? dados.estado ?? null,
      logoUrl: dados.logoUrl ?? null,
      etapaCadastro: 1,
      cadastroCompleto: false,
      status: 'PENDENTE_PRIMEIRO_ADMIN',
      requerPrimeiroAdmin: true,
      proximoPasso: 'CADASTRO_PRIMEIRO_ADMIN',
      mensagem: null,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    const novaEmpresa: EmpresaResponse = {
      ...baseEmpresa,
      ...dados,
      nomeEmpresa: (dados.nomeEmpresa || dados.nomeFantasia || baseEmpresa.nomeEmpresa) as string,
      nomeFantasia: (dados.nomeFantasia || dados.nomeEmpresa || baseEmpresa.nomeFantasia) as string,
      nome: (dados.nomeEmpresa || dados.nomeFantasia || baseEmpresa.nome) as string,
      endereco: {
        ...(baseEmpresa.endereco || {
          id: null,
          cep: null,
          logradouro: null,
          numero: null,
          cidade: null,
          estado: null,
          uf: null,
        }),
        ...(dados.endereco || {}),
        ...(dados.cep ? { cep: dados.cep } : {}),
        ...(dados.logradouro ? { logradouro: dados.logradouro } : {}),
        ...(dados.numero ? { numero: dados.numero } : {}),
        ...(dados.cidade ? { cidade: dados.cidade } : {}),
        ...(dados.estado ? { estado: dados.estado, uf: dados.estado } : {}),
        ...(dados.uf ? { uf: dados.uf, estado: dados.uf } : {}),
      },
      atualizadoEm: new Date().toISOString(),
    };

    dispatch({ type: 'empresaUpdated', empresa: novaEmpresa });

    const storedSession = getStoredAuthSession();
    if (storedSession) {
      writeStoredAuthSession({
        ...storedSession,
        empresa: novaEmpresa,
      });
    } else if (state.token) {
      writeStoredAuthSession({
        token: state.token,
        user: state.user,
        empresa: novaEmpresa,
        roles: state.roles,
      });
    }
  }, [state.empresa, state.token, state.user, state.roles]);

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
      const roles = [normalizeRole(response.usuario.tipo)];
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
      const roles = response.roles.map(normalizeRole);
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
    atualizarEmpresaLocal,
    logout,
    hasRole,
  }), [state, loginFuncionario, loginAdmin, cadastrarPrimeiroAdmin, atualizarEmpresaLocal, logout, hasRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
