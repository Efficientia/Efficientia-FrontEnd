import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { DASHBOARD_ALLOWED_ROLES } from './constants/auth';

const Home = lazy(() => import('./pages/Home').then(({ Home }) => ({ default: Home })));
const Login = lazy(() => import('./pages/Login').then(({ Login }) => ({ default: Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(({ Dashboard }) => ({ default: Dashboard })));
const NotFound = lazy(() => import('./pages/NotFound').then(({ NotFound }) => ({ default: NotFound })));
const DevApiTestWorkbench = import.meta.env.DEV
  ? lazy(() =>
      import('./pages/ApiTestWorkbench').then(({ ApiTestWorkbench }) => ({ default: ApiTestWorkbench }))
    )
  : null;

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense
          fallback={
            <main aria-busy="true">
              <p role="status" aria-live="polite">Carregando página...</p>
            </main>
          }
        >
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
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
