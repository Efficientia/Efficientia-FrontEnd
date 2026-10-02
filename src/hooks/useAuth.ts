import { useContext } from 'react';
import { AuthContext, type AuthContextData } from '../contexts/authContextDef';

/**
 * Hook para acessar os dados e ações da sessão de autenticação.
 */
export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um <AuthProvider />');
  }
  return context;
}

export default useAuth;
