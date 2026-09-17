import React from 'react';
import './Home.css';

export function Home() {
  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Efficientia</h1>
        <nav className="home-nav" aria-label="Navegação principal">
          <a href="#sobre">Sobre o Projeto</a>
          <a href="#contato">Contato</a>
          {/* O link de login será atualizado na task de roteamento */}
          <a href="/login">Acessar Sistema</a>
        </nav>
      </header>

      <main>
        <section className="hero-section" aria-labelledby="hero-title">
          <h2 id="hero-title">Transporte Bovino Sustentável e Eficiente</h2>
          <p>
            Garantindo o bem-estar animal desde a fazenda até o frigorífico. 
            O Efficientia digitaliza o diário de viagem (Portaria SDA/MAPA nº 1.280), 
            trazendo segurança para o motorista da JBS/Friboi e sustentabilidade para o processo.
          </p>
          <button className="cta-button" aria-label="Começar a usar o sistema">
            Acessar Dashboard
          </button>
        </section>

        <section id="sobre" className="features-section" aria-label="Principais Funcionalidades">
          <div className="feature-card">
            <h3>Digitalização Segura</h3>
            <p>Substituímos o papel por registros automatizados, evitando perdas e letras ilegíveis.</p>
          </div>
          <div className="feature-card">
            <h3>Foco no Bem-Estar</h3>
            <p>Monitoramento rigoroso das paradas e condições dos animais durante todo o trajeto.</p>
          </div>
          <div className="feature-card">
            <h3>Inteligência Artificial</h3>
            <p>Chatbot integrado para auxiliar motoristas em dúvidas operacionais e logísticas.</p>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <p>&copy; 2026 Projeto Interdisciplinar Efficientia. Desenvolvido para a Friboi/JBS.</p>
        <p>Repositório Oficial no GitHub.</p>
      </footer>
    </div>
  );
}
