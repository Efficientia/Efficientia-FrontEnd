import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface PrivateRouteProps {
  allowedRoles?: string[];
}

export function PrivateRoute({ allowedRoles }: PrivateRouteProps) {
  const { isAuthenticated, isLoading, roles } = useAuth();

  // Enquanto restaura a sessão armazenada, evita redirecionamentos falsos
  if (isLoading) {
    return (
      <main
        aria-busy="true"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          fontFamily: 'sans-serif',
          color: '#333',
        }}
      >
        <p role="status" aria-live="polite">Carregando sessão...</p>
      </main>
    );
  }

  // Se não estiver logado, redireciona para a página de login pública
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se a rota exige roles específicas e o usuário não possui nenhuma compatível
  if (allowedRoles && allowedRoles.length > 0) {
    const temPermissao = allowedRoles.some((role: string) =>
      roles.map((r: string) => r.toUpperCase()).includes(role.toUpperCase())
    );

    if (!temPermissao) {
      return <Navigate to="/" replace />;
    }
  }

  // Se passou em todas as validações, renderiza a rota filha protegida
  return <Outlet />;
}

export default PrivateRoute;
