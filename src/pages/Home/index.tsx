import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

export function Home() {
  // Estado do Menu Mobile Hamburguer
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);

  // Estado do Carrossel da Seção Solução
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [animDirection, setAnimDirection] = useState<'next' | 'prev' | null>(null);

  // Fecha o menu hamburguer ao clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  function handlePrev() {
    setAnimDirection('prev');
    setCarouselIndex((prev) => (prev - 1 + 3) % 3);
  }

  function handleNext() {
    setAnimDirection('next');
    setCarouselIndex((prev) => (prev + 1) % 3);
  }

  function handleDotClick(index: number) {
    if (index === carouselIndex) return;
    setAnimDirection(index > carouselIndex ? 'next' : 'prev');
    setCarouselIndex(index);
  }

  function getCardClass(index: number): string {
    const isActive = index === carouselIndex;
    if (!isActive) return 'card-solucao';
    if (!animDirection) return 'card-solucao active';
    return animDirection === 'next'
      ? 'card-solucao active slide-in-right'
      : 'card-solucao active slide-in-left';
  }

  return (
    <div className="landing-page-container">
      {/* ==============================================================
          MENU SUPERIOR FLUTUANTE
          ============================================================== */}
      <section ref={menuRef} className={`menu ${menuOpen ? 'open' : ''}`}>
        <Link to="/" onClick={() => setMenuOpen(false)}>
          <img src="/assets/logo_efficientia.png" alt="Logo da Efficientia" id="logo" />
        </Link>

        <button
          className="btn-menu-hamburguer"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <img src="/assets/icone_menu.svg" alt="Ícone de menu" />
        </button>

        <nav className="menu-links">
          <a className="link-menu" href="#inicio" onClick={() => setMenuOpen(false)}>
            Inicio
          </a>
          <a className="link-menu" href="#problema" onClick={() => setMenuOpen(false)}>
            Problema
          </a>
          <a className="link-menu" href="#solucao" onClick={() => setMenuOpen(false)}>
            Solução
          </a>
          <a className="link-menu" href="#impacto" onClick={() => setMenuOpen(false)}>
            Impacto
          </a>
          <a className="link-menu" href="#funcionalidades" onClick={() => setMenuOpen(false)}>
            Funcionalidades
          </a>

          <div className="menu-actions">
            <Link
              className="link-menu menu-entrar"
              to="/login"
              onClick={() => setMenuOpen(false)}
            >
              Login
            </Link>
            <Link
              className="link-menu menu-cadastrar"
              to="/cadastro"
              onClick={() => setMenuOpen(false)}
            >
              Cadastro
            </Link>
          </div>
        </nav>
      </section>

      {/* ==============================================================
          SEÇÃO 1: HERO
          ============================================================== */}
      <section id="inicio" className="hero">
        <video autoPlay loop muted playsInline className="video-fundo">
          <source src="/assets/background-hero.webm" type="video/webm" />
        </video>

        <div className="conteudo-hero">
          <div className="hero-texto-botoes">
            <h1>
              Modernizando um <br />
              <span className="destaque">processo essencial</span>
            </h1>
            <p id="hero-texto">
              Digitalize relatórios de embarque e <br />
              desembarque com mais rapidez, <br />
              organização e segurança.
            </p>

            <div className="botoes-hero">
              <Link to="/cadastro" className="botao-ativo">
                Cadastro
              </Link>
              <Link to="/login" className="botao-desativado">
                Login
              </Link>
            </div>
          </div>

          <div className="hero-imagem">
            <img
              src="/assets/mockup-home-mobile-real-hero.png"
              alt="Mockup de iPhone com a tela Home do aplicativo Efficientia"
              id="mockup-celular-hero"
            />
          </div>

          <div className="hero-lista">
            <ul className="lista-funcionalidades-hero">
              <li>
                <img src="/assets/icone_offline.svg" alt="Ícone offline" />
                <span>Funcionamento offline</span>
              </li>
              <li>
                <img src="/assets/icone_escudo_check_verde.svg" alt="Ícone de segurança" />
                <span>Registros padronizados</span>
              </li>
              <li>
                <img src="/assets/icone_pasta.svg" alt="Ícone de pasta" />
                <span>Dados prontos para consulta</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Elemento gráfico decorativo */}
      <div className="linhas-organicas">
        <img src="/assets/linhas_organicas.svg" alt="" aria-hidden="true" />
      </div>

      {/* ==============================================================
          SEÇÃO 2: O PROBLEMA
          ============================================================== */}
      <section className="problema" id="problema">
        <div className="background-problema">
          <img src="/assets/padrao-fundo.png" alt="" id="background" aria-hidden="true" />
        </div>

        <div className="conteudo-problema">
          <div className="badge">
            <p>O problema</p>
          </div>

          <h2 className="problema-titulo">
            O problema não é apenas o <span className="destaque">papel</span>
          </h2>
          <p className="problema-texto">
            Relatórios manuais aumentam o retrabalho, geram falhas e <br />
            dificultam o controle diário da operação.
          </p>

          <img
            className="mockup-desktop"
            src="/assets/mockup-comparativo-dashboard-atual.png"
            alt="Comparação entre o relatório em papel e metade de um computador com o dashboard atual da Efficientia"
          />

          <div className="cards-problema">
            <div className="card-problema">
              <img src="/assets/icone_retrabalho.svg" alt="Ícone de retrabalho" />
              <div>
                <h3>Retrabalho</h3>
                <p>Processos manuais que tomam tempo e aumentam custos.</p>
              </div>
            </div>

            <div className="card-problema">
              <img src="/assets/icone_dados_incompletos.svg" alt="Ícone de dados incompletos" />
              <div>
                <h3>Dados Incompletos</h3>
                <p>Informações faltantes comprometem a confiabilidade dos registros.</p>
              </div>
            </div>

            <div className="card-problema">
              <img src="/assets/icone_risco_perda.svg" alt="Ícone de risco de perda" />
              <div>
                <h3>Risco de Perda</h3>
                <p>Documentos físicos podem se perder, danificar ou se tornar ilegíveis.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Elemento gráfico decorativo */}
      <div className="linhas-organicas">
        <img id="linha2" src="/assets/linhas_organicas2.svg" alt="" aria-hidden="true" />
      </div>

      {/* ==============================================================
          SEÇÃO 3: A SOLUÇÃO (CARROSSEL INTERATIVO)
          ============================================================== */}
      <section id="solucao" className="solucao">
        <div className="conteudo-solucao">
          <div className="badge" id="badge-solucao">
            <p>A solução</p>
          </div>

          <h2 className="solucao-titulo">
            O processo continua o mesmo <br />
            <span className="destaque">A burocracia, não</span>
          </h2>
          <p className="solucao-texto">
            Um fluxo digital simples, com preenchimento guiado, dados padronizados e registros
            prontos para consulta.
          </p>

          <div className="carousel-solucao-wrapper">
            <button
              className="btn-carousel-solucao btn-prev"
              aria-label="Etapa anterior"
              type="button"
              onClick={handlePrev}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 19l-7-7 7-7" stroke="#FFF8E1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="cards-solucao">
              {/* Card 0: Preenchimento guiado */}
              <div className={getCardClass(0)} data-index="0">
                <div className="imagem-card-solucao">
                  <img
                    src="/assets/mockup_celular_etapa1.png"
                    alt="Mockup de celular mostrando a primeira etapa do processo digital"
                  />
                </div>
                <div className="conteudo-card-solucao">
                  <img src="/assets/icone_arquivotxt.svg" alt="Ícone de arquivo de texto" />
                  <div className="conteudo-texto-card-solucao">
                    <h3 className="titulo-card-solucao">Preenchimento guiado</h3>
                    <p>Campos claros reduzem falhas no registro.</p>
                  </div>
                </div>
              </div>

              <img
                src="/assets/icone_seta_branca.svg"
                className="seta-separadora"
                alt=""
                aria-hidden="true"
              />

              {/* Card 1: Dados padronizados */}
              <div className={getCardClass(1)} data-index="1">
                <div className="imagem-card-solucao">
                  <img
                    src="/assets/mockup_celular_etapa2.png"
                    alt="Mockup de celular mostrando a segunda etapa do processo digital"
                  />
                </div>
                <div className="conteudo-card-solucao">
                  <img src="/assets/icone_checklist.svg" alt="Ícone de checklist" />
                  <div className="conteudo-texto-card-solucao">
                    <h3 className="titulo-card-solucao">Dados padronizados</h3>
                    <p>Informações sempre no mesmo formato.</p>
                  </div>
                </div>
              </div>

              <img
                src="/assets/icone_seta_branca.svg"
                className="seta-separadora"
                alt=""
                aria-hidden="true"
              />

              {/* Card 2: Gestão conectada */}
              <div className={getCardClass(2)} data-index="2">
                <div className="imagem-card-solucao">
                  <img
                    src="/assets/mockup_celular_etapa3.png"
                    alt="Mockup de celular mostrando a terceira etapa do processo digital"
                  />
                </div>
                <div className="conteudo-card-solucao">
                  <img src="/assets/icon_marcador.svg" alt="Ícone de marcador" />
                  <div className="conteudo-texto-card-solucao">
                    <h3 className="titulo-card-solucao">Gestão conectada</h3>
                    <p>Registros prontos para consulta da operação.</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              className="btn-carousel-solucao btn-next"
              aria-label="Próxima etapa"
              type="button"
              onClick={handleNext}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5l7 7-7 7" stroke="#FFF8E1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="carousel-solucao-dots">
            <button
              className={`dot-solucao ${carouselIndex === 0 ? 'active' : ''}`}
              data-index="0"
              aria-label="Ir para etapa 1"
              type="button"
              onClick={() => handleDotClick(0)}
            />
            <button
              className={`dot-solucao ${carouselIndex === 1 ? 'active' : ''}`}
              data-index="1"
              aria-label="Ir para etapa 2"
              type="button"
              onClick={() => handleDotClick(1)}
            />
            <button
              className={`dot-solucao ${carouselIndex === 2 ? 'active' : ''}`}
              data-index="2"
              aria-label="Ir para etapa 3"
              type="button"
              onClick={() => handleDotClick(2)}
            />
          </div>
        </div>
      </section>

      {/* Elemento gráfico decorativo */}
      <div className="linhas-organicas">
        <img src="/assets/linhas_organicas.svg" alt="" id="linha3" aria-hidden="true" />
      </div>

      {/* ==============================================================
          SEÇÃO 4: O IMPACTO
          ============================================================== */}
      <section className="impacto" id="impacto">
        <div className="conteudo-impacto">
          <div className="badge">
            <p>O impacto</p>
          </div>

          <h2>
            Da prancheta de papel <br />
            ao <span className="destaque">controle</span> em um toque
          </h2>
          <p className="impacto-texto">
            O Efficientia digitaliza os registros de embarque e desembarque, reduzindo falhas, <br />
            organizando os dados da viagem e apoiando o controle operacional.
          </p>
          <img
            className="img-impacto"
            src="/assets/mockup_pc_impacto.svg"
            alt="Mockup de computador mostrando o impacto do Efficientia"
          />
        </div>
      </section>

      {/* ==============================================================
          SEÇÃO 5: FUNCIONALIDADES
          ============================================================== */}
      <section className="funcionalidades" id="funcionalidades" aria-labelledby="titulo-funcionalidades">
        <div className="conteudo-funcionalidades">
          <div className="funcionalidades-texto">
            <p className="funcionalidades-badge">Funcionalidades</p>
            <h2 id="titulo-funcionalidades">
              <span className="funcionalidades-linha">Funcionalidades</span>
              <span className="funcionalidades-linha">
                que <span className="funcionalidades-destaque">simplificam</span>
              </span>
              <span className="funcionalidades-linha funcionalidades-destaque">a operação</span>
            </h2>
            <p className="funcionalidades-introducao">
              O Efficientia reúne recursos para registrar, organizar e consultar os dados do
              transporte bovino com mais segurança.
            </p>

            <ul className="funcionalidades-lista">
              <li>
                <img src="/assets/funcionalidades-offline.svg" alt="" width="64" height="64" loading="lazy" />
                <div>
                  <h3>Funcionamento offline</h3>
                  <p>Preencha os dados mesmo sem conexão.</p>
                </div>
              </li>
              <li>
                <img src="/assets/funcionalidades-boletim.svg" alt="" width="64" height="64" loading="lazy" />
                <div>
                  <h3>Boletim digital</h3>
                  <p>Fluxo guiado para embarque e desembarque.</p>
                </div>
              </li>
              <li>
                <img src="/assets/funcionalidades-assinatura.svg" alt="" width="64" height="64" loading="lazy" />
                <div>
                  <h3>Assinatura digital</h3>
                  <p>Finalize registros com mais agilidade.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="funcionalidades-mockups">
            <img className="funcionalidades-fundo" src="/assets/funcionalidades-fundo.svg" alt="" width="916" height="790" loading="lazy" />
            <img className="funcionalidades-guia funcionalidades-guia-dashboard" src="/assets/funcionalidades-guia-dashboard.svg" alt="" width="1" height="80" loading="lazy" />
            <img className="funcionalidades-guia funcionalidades-guia-chat" src="/assets/funcionalidades-guia-chat.svg" alt="" width="57" height="73" loading="lazy" />
            <img className="funcionalidades-ponto funcionalidades-ponto-dashboard-inicio" src="/assets/funcionalidades-ponto.svg" alt="" width="6" height="6" loading="lazy" />
            <img className="funcionalidades-ponto funcionalidades-ponto-dashboard-fim" src="/assets/funcionalidades-ponto.svg" alt="" width="6" height="6" loading="lazy" />
            <img className="funcionalidades-ponto funcionalidades-ponto-chat-inicio" src="/assets/funcionalidades-ponto.svg" alt="" width="6" height="6" loading="lazy" />
            <img className="funcionalidades-ponto funcionalidades-ponto-chat-fim" src="/assets/funcionalidades-ponto.svg" alt="" width="6" height="6" loading="lazy" />

            <figure className="funcionalidades-dashboard">
              <img
                className="funcionalidades-produto"
                src="/assets/funcionalidades-dashboard.png"
                alt="Dashboard atual do Efficientia com indicadores, gráficos, fila de análise, alertas e rotas em andamento."
                width="854"
                height="586"
                loading="lazy"
                decoding="async"
              />
              <figcaption>
                <img src="/assets/funcionalidades-grafico.svg" alt="" width="64" height="64" loading="lazy" />
                <div>
                  <h3>Dashboards operacionais</h3>
                  <p>Visão completa da operação em tempo real.</p>
                </div>
              </figcaption>
            </figure>

            <figure className="funcionalidades-app">
              <img
                className="funcionalidades-produto"
                src="/assets/funcionalidades-iphone-real.png"
                alt="Assistente Virtual na versão atual do app, com orientações sobre a rota, GTA e uso do aplicativo."
                width="907"
                height="1735"
                loading="lazy"
                decoding="async"
              />
              <figcaption>
                <img src="/assets/funcionalidades-chat.svg" alt="" width="80" height="80" loading="lazy" />
                <div>
                  <h3>Chatbot de apoio</h3>
                  <p>Tire dúvidas e receba orientações na hora.</p>
                </div>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ==============================================================
          SEÇÃO 6: PRÓXIMO PASSO
          ============================================================== */}
      <section className="proximo-passo">
        <div className="conteudo-proximo-passo">
          <div className="esquerda-proximo-passo">
            <div className="badge" id="badge-proximo-passo">
              <p>próximo passo</p>
            </div>

            <div className="texto-proximo-passo">
              <h2>
                Menos papel <br />
                <span className="destaque">Mais controle</span> <br />
                sobre cada viagem
              </h2>
              <p>
                Do preenchimento em campo à consulta pela <br />
                operação, o Efficientia organiza os registros de <br />
                embarque e desembarque em um fluxo digital, <br />
                guiado e padronizado.
              </p>
            </div>

            <div className="botoes-proximo-passo">
              <Link to="/cadastro" className="botao-ativo">
                Cadastro
              </Link>
              <Link to="/login" className="botao-desativado">
                Login
              </Link>
            </div>
          </div>

          <div className="imagens-proximo-passo">
            <img
              id="mockup-celular-proximo-passo"
              src="/assets/mockup-home-motorista-realista-v3.png"
              alt="Tela atual do app Motorista V2 do Efficientia, com rotas e relatórios recentes."
              width="906"
              height="1736"
              loading="lazy"
              decoding="async"
            />
            <img
              id="dashboard-proximo-passo"
              src="/assets/funcionalidades-dashboard.png"
              alt="Dashboard atual do Efficientia, com diários, bovinos, mortalidade e anomalias."
              width="854"
              height="586"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>

      {/* ==============================================================
          SEÇÃO 7: RODAPÉ
          ============================================================== */}
      <section className="rodape">
        <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src="/assets/logo_com_slogan.png" alt="Logo da Efficientia com slogan" id="logo-rodape" />
        </Link>

        <div className="links-rodape">
          <a href="#inicio">Inicio</a>
          <a href="#problema">Problema</a>
          <a href="#solucao">Solução</a>
          <a href="#impacto">Impacto</a>
          <a href="#funcionalidades">Funcionalidades</a>
          <Link to="/login">Login</Link>
          <Link to="/cadastro">Cadastro</Link>
        </div>

        <p>
          Projeto Interdisciplinar <br />
          Germinare TECH, 2026
        </p>
      </section>
    </div>
  );
}

export default Home;
