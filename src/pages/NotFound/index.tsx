import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogoBoiIcon, ArrowRightIcon } from '../../components/icons';
import './NotFound.css';

export function NotFound() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <main id="main-content" tabIndex={-1} className="notfound-container">
      <div className="notfound-card">
        <LogoBoiIcon size={52} className="notfound-logo" />
        <span className="notfound-code">404</span>
        <h1 className="notfound-title">Página não encontrada</h1>
        <p className="notfound-text">
          A rota que você tentou acessar não existe, foi alterada ou você não possui permissão para visualizá-la.
        </p>
        <div className="notfound-actions">
          <button
            type="button"
            className="notfound-btn-secondary"
            onClick={() => navigate('/')}
          >
            Ir para o Início
          </button>
          <button
            type="button"
            className="notfound-btn-primary"
            onClick={() => navigate(isAuthenticated ? '/visao-geral' : '/login')}
          >
            <span>{isAuthenticated ? 'Voltar ao Painel' : 'Fazer Login'}</span>
            <ArrowRightIcon size={16} />
          </button>
        </div>
      </div>
    </main>
  );
}

export default NotFound;
