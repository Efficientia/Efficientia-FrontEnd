import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface PrivateRouteProps {
  allowedRoles?: string[];
}

export function PrivateRoute({ allowedRoles }: PrivateRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, roles, empresa } = useAuth();
  useEffect(() => {
    if (isLoading) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById('main-content')?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isLoading]);


  // Enquanto restaura a sessão armazenada, evita redirecionamentos falsos
  if (isLoading) {
    return (
      <main id="main-content" tabIndex={-1} aria-busy="true"
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
  const onboardingCompleted = (() => {
    try {
      return localStorage.getItem('@efficientia:onboarding:completed') === 'true';
    } catch {
      return false;
    }
  })() || (empresa?.cadastroCompleto === true && empresa.proximoPasso === 'PAINEL_ADMINISTRATIVO');

  if (!onboardingCompleted) {
    const currentStep = (() => {
      try {
        return localStorage.getItem('@efficientia:onboarding:current_step');
      } catch {
        return null;
      }
    })();
    const pendingPath = currentStep === '3'
      ? '/onboarding/etapa-3'
      : currentStep === '2'
      ? '/onboarding/etapa-2'
      : empresa?.etapaCadastro === 3
      ? '/onboarding/etapa-3'
      : empresa?.etapaCadastro === 2
      ? '/onboarding/etapa-2'
      : '/onboarding';
    return <Navigate to={pendingPath} replace state={{ from: location.pathname }} />;
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
