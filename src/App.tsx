import { Component, lazy, Suspense, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PrivateRoute } from './components/PrivateRoute';
import { DASHBOARD_ALLOWED_ROLES } from './constants/auth';
const Home = lazy(() => import('./pages/Home').then(({ Home }) => ({ default: Home })));
const Login = lazy(() => import('./pages/Login').then(({ Login }) => ({ default: Login })));
const Cadastro = lazy(() => import('./pages/Cadastro').then(({ Cadastro }) => ({ default: Cadastro })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(({ Dashboard }) => ({ default: Dashboard })));
const NotFound = lazy(() => import('./pages/NotFound').then(({ NotFound }) => ({ default: NotFound })));
const Onboarding = lazy(() => import('./pages/Onboarding').then(({ Onboarding }) => ({ default: Onboarding })));
const OnboardingStep2 = lazy(() => import('./pages/Onboarding/Step2').then(({ OnboardingStep2 }) => ({ default: OnboardingStep2 })));
const OnboardingStep3 = lazy(() => import('./pages/Onboarding/Step3').then(({ OnboardingStep3 }) => ({ default: OnboardingStep3 })));
const Configuracao = lazy(() => import('./pages/Configuracao').then(({ Configuracao }) => ({ default: Configuracao })));
const Motoristas = lazy(() => import('./pages/Motoristas').then(({ Motoristas }) => ({ default: Motoristas })));
const Frota = lazy(() => import('./pages/Frota').then(({ Frota }) => ({ default: Frota })));
const FazendasUnidades = lazy(() => import('./pages/FazendasUnidades').then(({ FazendasUnidades }) => ({ default: FazendasUnidades })));
const EsqueciSenha = lazy(() =>
  import('./pages/EsqueciSenha').then(({ EsqueciSenha }) => ({ default: EsqueciSenha }))
);
const AiTestWorkbench = lazy(() =>
  import('./pages/AiTestWorkbench').then(({ AiTestWorkbench }) => ({ default: AiTestWorkbench }))
);
const DevApiTestWorkbench = import.meta.env.DEV
  ? lazy(() =>
      import('./pages/ApiTestWorkbench').then(({ ApiTestWorkbench }) => ({ default: ApiTestWorkbench }))
    )
  : null;

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Erro inesperado na interface do Efficientia:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main id="main-content" role="alert" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem', fontFamily: 'sans-serif', color: '#09264d' }}>
          <section style={{ maxWidth: 520, textAlign: 'center' }}>
            <h1>Não foi possível carregar esta tela</h1>
            <p>Ocorreu um erro inesperado na interface. Recarregue a página para tentar novamente.</p>
            <button type="button" onClick={() => window.location.reload()}>Recarregar página</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
function RouteFocusManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      document.getElementById('main-content')?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
function AppLayout() {

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/esqueci-minha-senha" element={<EsqueciSenha />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/onboarding/etapa-2" element={<OnboardingStep2 />} />
        <Route path="/onboarding/etapa-3" element={<OnboardingStep3 />} />
        <Route element={<PrivateRoute allowedRoles={[...DASHBOARD_ALLOWED_ROLES]} />}>
          <Route path="/visao-geral" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/auditoria" element={<Dashboard initialTab="audit" />} />
          <Route path="/motoristas" element={<Motoristas />} />
          <Route path="/motorista" element={<Navigate to="/motoristas" replace />} />
          <Route path="/frota" element={<Frota />} />
          <Route path="/fazenda-unidades" element={<FazendasUnidades />} />
          <Route path="/configuracao" element={<Configuracao />} />
          <Route path="/diarios" element={<Dashboard initialTab="reports" />} />
        </Route>
        <Route path="/ai-test" element={<AiTestWorkbench />} />
        {DevApiTestWorkbench && (
          <Route path="/dev/api-test" element={<DevApiTestWorkbench />} />
        )}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <RouteFocusManager />
    </>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Suspense
              fallback={
                <main id="main-content" tabIndex={-1} aria-busy="true">
                  <p role="status" aria-live="polite">Carregando página...</p>
                </main>
              }
            >
              <AppLayout />
            </Suspense>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;
