import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { DASHBOARD_ALLOWED_ROLES } from './constants/auth';
import './App.css';

const Home = lazy(() => import('./pages/Home').then(({ Home }) => ({ default: Home })));
const Login = lazy(() => import('./pages/Login').then(({ Login }) => ({ default: Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(({ Dashboard }) => ({ default: Dashboard })));
const NotFound = lazy(() => import('./pages/NotFound').then(({ NotFound }) => ({ default: NotFound })));
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
          <>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route
                element={<PrivateRoute allowedRoles={[...DASHBOARD_ALLOWED_ROLES]} />}
              >
                <Route path="/dashboard" element={<Dashboard />} />
              </Route>
              {DevApiTestWorkbench && (
                <Route path="/dev/api-test" element={<DevApiTestWorkbench />} />
              )}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <RouteFocusManager />
          </>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
