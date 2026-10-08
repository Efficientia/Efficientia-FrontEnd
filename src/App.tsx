import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { NotFound } from './pages/NotFound';
import { PrivateRoute } from './components/PrivateRoute';
import { ApiTestWorkbench } from './pages/ApiTestWorkbench';
import { DASHBOARD_ALLOWED_ROLES } from './constants/auth';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          {/* Rotas Privadas */}
          <Route
            element={
              <PrivateRoute
                allowedRoles={[...DASHBOARD_ALLOWED_ROLES]}
              />
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>

        {import.meta.env.DEV && <Route path="/dev/api-test" element={<ApiTestWorkbench />} />}
          {/* Rota Curinga (404) */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
