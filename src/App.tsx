import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AiSupportBox } from './components/AiSupportBox';
import './App.css';
const Home = lazy(() => import('./pages/Home').then(({ Home }) => ({ default: Home })));
const Login = lazy(() => import('./pages/Login').then(({ Login }) => ({ default: Login })));
const Cadastro = lazy(() => import('./pages/Cadastro').then(({ Cadastro }) => ({ default: Cadastro })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(({ Dashboard }) => ({ default: Dashboard })));
const NotFound = lazy(() => import('./pages/NotFound').then(({ NotFound }) => ({ default: NotFound })));
const AiTestWorkbench = lazy(() =>
  import('./pages/AiTestWorkbench').then(({ AiTestWorkbench }) => ({ default: AiTestWorkbench }))
);
const DevApiTestWorkbench = import.meta.env.DEV
  ? lazy(() =>
      import('./pages/ApiTestWorkbench').then(({ ApiTestWorkbench }) => ({ default: ApiTestWorkbench }))
    )
  : null;

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
  const location = useLocation();
  const isNoFloatingWidgetPage =
    location.pathname === '/cadastro' ||
    location.pathname === '/login' ||
    location.pathname === '/visao-geral' ||
    location.pathname === '/dashboard';

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/visao-geral" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ai-test" element={<AiTestWorkbench />} />
        {DevApiTestWorkbench && (
          <Route path="/dev/api-test" element={<DevApiTestWorkbench />} />
        )}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <RouteFocusManager />
      {!isNoFloatingWidgetPage && <AiSupportBox />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <a className="skip-link" href="#main-content">Pular para o conteúdo principal</a>
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
    </BrowserRouter>
  );
}

export default App;
