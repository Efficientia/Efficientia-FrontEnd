import { Navigate, Outlet } from 'react-router-dom';

interface PrivateRouteProps {
  allowedRoles?: string[];
}

export function PrivateRoute({ allowedRoles }: PrivateRouteProps) {
  // TODO: Isso será substituído pelo AuthContext na próxima fase (EFFICIENTI-103)
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole') || 'ANALISTA'; // Exemplo

  // Se não estiver logado, joga pro login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Se a rota exige roles específicas e o usuário não tem, joga pra uma página segura (ex: home)
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  // Se passou nas validações, renderiza a rota filha
  return <Outlet />;
}
