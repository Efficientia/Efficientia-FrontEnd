import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <main style={{ textAlign: 'center', padding: '50px' }}>
      <h1>404 - Página não encontrada</h1>
      <p>Ops! A página que você está procurando não existe ou foi movida.</p>
      <Link to="/" style={{ color: '#27ae60', fontWeight: 'bold' }}>
        Voltar para o Início
      </Link>
    </main>
  );
}
