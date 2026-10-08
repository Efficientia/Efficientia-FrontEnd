import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { NotFound } from './pages/NotFound';
import { PrivateRoute } from './components/PrivateRoute';
import { ApiTestWorkbench } from './pages/ApiTestWorkbench';

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
                allowedRoles={[
                  'ANALISTA',
                  'ADMIN',
                  'ADMINISTRADOR',
                  'ADM_EMPRESA',
                  'FUNCIONARIO_FRIBOI',
                  'SISTEMA_DEV',
                ]}
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
