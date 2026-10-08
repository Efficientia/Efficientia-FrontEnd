import { createContext } from 'react';
import type {
  AdminResponse,
  UsuarioResponse,
  LoginRequest,
  LoginAdminRequest,
  CriarPrimeiroAdminRequest,
} from '../types/auth';
import type { EmpresaResponse } from '../types/empresa';

export interface AuthContextData {
  token: string | null;
  user: AdminResponse | UsuarioResponse | null;
  empresa: EmpresaResponse | null;
  roles: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  loginFuncionario: (dados: LoginRequest) => Promise<string[]>;
  loginAdmin: (dados: LoginAdminRequest) => Promise<string[]>;
  cadastrarPrimeiroAdmin: (dados: CriarPrimeiroAdminRequest) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
}


export const AuthContext = createContext<AuthContextData | undefined>(undefined);
