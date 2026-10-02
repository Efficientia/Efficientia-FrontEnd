import React, { useState, useEffect, useCallback } from 'react';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AdminResponse | UsuarioResponse | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaResponse | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback((): void => {
    setToken(null);
    setUser(null);
    setEmpresa(null);
    setRoles([]);
    localStorage.removeItem(ROLES_STORAGE_KEY);
    authService.logout();
  }, []);

  // Restaura a sessão armazenada no LocalStorage ao carregar a aplicação
  useEffect(() => {
    function carregarSessaoArmazenada() {
      try {
        const storedToken = getStoredToken();
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        const storedEmpresa = localStorage.getItem(EMPRESA_STORAGE_KEY);
        const storedRoles = localStorage.getItem(ROLES_STORAGE_KEY);

        if (storedToken) {
          setToken(storedToken);
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
          if (storedEmpresa) {
            setEmpresa(JSON.parse(storedEmpresa));
          }
          if (storedRoles) {
            setRoles(JSON.parse(storedRoles));
          }
        }
      } catch {
        removeStoredToken();
      } finally {
        setIsLoading(false);
      }
    }

    carregarSessaoArmazenada();

    // Ouve evento disparado pelo interceptor do Axios em caso de HTTP 401
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('efficientia:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('efficientia:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  const loginFuncionario = useCallback(async (dados: LoginRequest): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await authService.loginUsuario(dados);
      const userObj = response.usuario;
      const userRoles = [userObj.tipo.toUpperCase()];

      setToken(response.token);
      setUser(userObj);
      setRoles(userRoles);

      setStoredToken(response.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(userRoles));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginAdmin = useCallback(async (dados: LoginAdminRequest): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await authService.loginAdmin(dados);
      const adminObj = response.admin;
      const empresaObj = response.empresa;
      const adminRoles = response.roles || ['ADMIN', 'ADMINISTRADOR'];

      setToken(response.token);
      setUser(adminObj);
      setEmpresa(empresaObj);
      setRoles(adminRoles);

      setStoredToken(response.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(adminObj));
      localStorage.setItem(EMPRESA_STORAGE_KEY, JSON.stringify(empresaObj));
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(adminRoles));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cadastrarPrimeiroAdmin = useCallback(async (dados: CriarPrimeiroAdminRequest): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await authService.cadastrarPrimeiroAdmin(dados);
      const adminObj = response.admin;
      const empresaObj = response.empresa;
      const adminRoles = response.roles || ['ADMIN', 'ADMINISTRADOR'];

      setToken(response.token);
      setUser(adminObj);
      setEmpresa(empresaObj);
      setRoles(adminRoles);

      setStoredToken(response.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(adminObj));
      localStorage.setItem(EMPRESA_STORAGE_KEY, JSON.stringify(empresaObj));
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(adminRoles));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hasRole = useCallback((role: string): boolean => {
    return roles.includes(role.toUpperCase());
  }, [roles]);

  const value: AuthContextData = {
    token,
    user,
    empresa,
    roles,
    isAuthenticated: Boolean(token),
    isLoading,
    loginFuncionario,
    loginAdmin,
    cadastrarPrimeiroAdmin,
    logout,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
