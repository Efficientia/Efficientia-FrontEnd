import React, { useCallback, useId, useMemo, useRef, useState } from 'react';
import type { ChartDayBar } from './dashboardMetrics';
import { exportChartToCsv, exportChartToPng } from './chartExportUtils';
import './InteractiveBarChart.css';

export interface InteractiveBarChartProps {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly unit: string;
  readonly bars: readonly ChartDayBar[];
  readonly ceiling: number;
  readonly variant?: 'large' | 'small';
  readonly colorScheme?: 'blue' | 'green' | 'red' | 'orange';
  readonly isDarkMode?: boolean;
  readonly yAxisSteps?: readonly number[];
  readonly onBarSelect?: (bar: ChartDayBar, index: number) => void;
}

const FULL_DAY_NAMES: Record<string, string> = {
  Dom: 'Domingo',
  Seg: 'Segunda-feira',
  Ter: 'Terça-feira',
  Qua: 'Quarta-feira',
  Qui: 'Quinta-feira',
  Sex: 'Sexta-feira',
  Sáb: 'Sábado',
};

export const InteractiveBarChart: React.FC<InteractiveBarChartProps> = ({
  id,
  title,
  subtitle,
  unit,
  bars,
  ceiling,
  variant = 'small',
  colorScheme = 'blue',
  isDarkMode = false,
  yAxisSteps,
  onBarSelect,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Esta semana');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);
  const [pinnedBarIndex, setPinnedBarIndex] = useState<number | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const baseChartId = useId();

  // Total e média semanal
  const totalValue = useMemo(
    () => bars.reduce((acc, b) => acc + (Number(b.value) || 0), 0),
    [bars]
  );
  const averageValue = useMemo(
    () => (bars.length > 0 ? Math.round(totalValue / bars.length) : 0),
    [bars, totalValue]
  );
  const maxBar = useMemo(
    () => bars.reduce((max, b) => (b.value > max.value ? b : max), bars[0] ?? { day: '-', value: 0 }),
    [bars]
  );

  // Exibir feedback temporário ao usuário
  const showFeedback = useCallback((msg: string) => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    setExportFeedback(msg);
    feedbackTimerRef.current = window.setTimeout(() => {
      setExportFeedback(null);
      feedbackTimerRef.current = null;
    }, 2800);
  }, []);

  // Exportação CSV
  const handleExportCsv = useCallback(() => {
    try {
      exportChartToCsv(title, bars, unit, selectedPeriod);
      showFeedback('CSV exportado com sucesso!');
    } catch {
      showFeedback('Erro ao exportar CSV.');
    }
  }, [title, bars, unit, selectedPeriod, showFeedback]);

  // Exportação Imagem PNG (Recorte do momento atual)
  const handleExportPng = useCallback(() => {
    try {
      exportChartToPng({
        title,
        subtitle,
        unit,
        bars,
        ceiling,
        colorScheme,
        isDarkMode,
        period: selectedPeriod,
        yAxisSteps,
      });
      showFeedback('Recorte PNG salvo com sucesso!');
    } catch {
      showFeedback('Erro ao gerar imagem.');
    }
  }, [
    title,
    subtitle,
    unit,
    bars,
    ceiling,
    colorScheme,
    isDarkMode,
    selectedPeriod,
    yAxisSteps,
    showFeedback,
  ]);

  // Interação de clique na barra (fixar/desfixar)
  const handleBarClick = useCallback(
    (index: number) => {
      if (pinnedBarIndex === index) {
        setPinnedBarIndex(null);
        setActiveBarIndex(null);
      } else {
        setPinnedBarIndex(index);
        setActiveBarIndex(index);
        const bar = bars[index];
        if (bar && onBarSelect) {
          onBarSelect(bar, index);
        }
      }
    },
    [pinnedBarIndex, bars, onBarSelect]
  );

  const displayedIndex = pinnedBarIndex ?? activeBarIndex;
  const currentHoveredBar = displayedIndex !== null ? bars[displayedIndex] : null;

  // Cor das barras
  const getBarColorClass = (bar: ChartDayBar): string => {
    if (bar.highlight) return 'eff-bar-fill-highlight';
    switch (colorScheme) {
      case 'red':
        return 'eff-bar-fill-red';
      case 'orange':
        return 'eff-bar-fill-orange';
      case 'green':
        return 'eff-bar-fill-green';
      default:
        return 'eff-bar-fill-blue';
    }
  };

  // Eixo Y padrão
  const steps = useMemo(() => {
    if (yAxisSteps && yAxisSteps.length > 0) return yAxisSteps;
    return [ceiling, Math.round(ceiling * 0.66), Math.round(ceiling * 0.33), 0];
  }, [ceiling, yAxisSteps]);

  return (
    <article
      ref={containerRef}
      id={`eff-chart-${id}`}
      data-chart-id={id}
      className={`vg-card eff-chart-card ${variant === 'large' ? 'eff-chart-large' : 'eff-chart-small'} ${
        isDarkMode ? 'eff-chart-dark' : 'eff-chart-light'
      }`}
      aria-labelledby={`${baseChartId}-title`}
    >
      {/* CABEÇALHO INTERATIVO */}
      <header className="eff-chart-header">
        <div className="eff-chart-heading-group">
          <div className="eff-chart-title-wrap">
            <h2 id={`${baseChartId}-title`} className="eff-chart-title">
              {title}
            </h2>
            <span className="eff-chart-unit-badge">{unit}</span>
          </div>
          {subtitle && <p className="eff-chart-subtitle">{subtitle}</p>}
        </div>

        {/* FERRAMENTAS DE INTERAÇÃO & DOWNLOAD */}
        <div className="eff-chart-actions" role="toolbar" aria-label={`Ações do gráfico ${title}`}>
          {/* Seletor de Período */}
          <div className="eff-period-dropdown-wrap">
            <label htmlFor={`${baseChartId}-period`} className="visually-hidden">
              Selecionar período
            </label>
            <select
              id={`${baseChartId}-period`}
              className="eff-period-select"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              title="Filtrar período do recorte"
            >
              <option value="Esta semana">Esta semana</option>
              <option value="Semana anterior">Semana anterior</option>
              <option value="Média 7 dias">Média 7 dias</option>
            </select>
          </div>

          {/* Alternar Gráfico / Tabela */}
          <button
            type="button"
            className={`eff-tool-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
            title={viewMode === 'chart' ? 'Visualizar dados em tabela' : 'Visualizar gráfico de barras'}
            aria-label={viewMode === 'chart' ? 'Modo tabela' : 'Modo gráfico'}
          >
            {viewMode === 'chart' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            )}
            <span className="eff-tool-btn-text">{viewMode === 'chart' ? 'Tabela' : 'Gráfico'}</span>
          </button>

          {/* Botão Exportar CSV */}
          <button
            type="button"
            className="eff-tool-btn eff-btn-export-csv"
            onClick={handleExportCsv}
            title="Exportar dados consolidados em planilha CSV"
            aria-label={`Baixar CSV de ${title}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <polyline points="9 15 12 18 15 15" />
            </svg>
            <span className="eff-tool-btn-text">CSV</span>
          </button>

          {/* Botão Exportar Recorte PNG */}
          <button
            type="button"
            className="eff-tool-btn eff-btn-export-png"
            onClick={handleExportPng}
            title="Baixar recorte do gráfico deste momento em imagem PNG"
            aria-label={`Baixar imagem de ${title}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="eff-tool-btn-text">Imagem</span>
          </button>
        </div>
      </header>

      {/* FEEDBACK DE DOWNLOAD TOAST */}
      {exportFeedback && (
        <div className="eff-chart-toast" role="status" aria-live="polite">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#56D867" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{exportFeedback}</span>
        </div>
      )}

      {/* ÁREA DE VISUALIZAÇÃO: GRÁFICO OU TABELA */}
      {viewMode === 'table' ? (
        <div className="eff-table-view-wrap">
          <table className="eff-chart-data-table">
            <caption className="visually-hidden">Tabela de dados do gráfico {title}</caption>
            <thead>
              <tr>
                <th scope="col">Dia</th>
                <th scope="col" style={{ textAlign: 'right' }}>Valor ({unit})</th>
                <th scope="col" style={{ textAlign: 'right' }}>% da Semana</th>
                <th scope="col" style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {bars.map((bar, idx) => {
                const pct = totalValue > 0 ? ((bar.value / totalValue) * 100).toFixed(1) + '%' : '0%';
                const isSelected = displayedIndex === idx;
                return (
                  <tr
                    key={bar.day}
                    className={`${bar.highlight ? 'eff-tr-highlight' : ''} ${isSelected ? 'eff-tr-selected' : ''}`}
                    onClick={() => handleBarClick(idx)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <strong>{bar.day}</strong>
                      <span className="eff-td-full-day"> ({FULL_DAY_NAMES[bar.day] || bar.day})</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {bar.value.toLocaleString('pt-BR')}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--eff-text-secondary, #64748B)' }}>
                      {pct}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {bar.highlight ? (
                        <span className="eff-table-badge-pico">Destaque</span>
                      ) : (
                        <span className="eff-table-badge-regular">Regular</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total Semanal</th>
                <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--eff-blue-primary, #0F51AE)' }}>
                  {totalValue.toLocaleString('pt-BR')}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>100%</td>
                <td style={{ textAlign: 'center', fontSize: '0.72rem', color: '#64748B' }}>
                  Pico: {maxBar.day} ({maxBar.value.toLocaleString('pt-BR')})
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="eff-chart-body">
          {/* Rótulo de escala Y / Ceiling */}
          <div className="eff-chart-y-axis" aria-hidden="true">
            {steps.map((val) => (
              <span key={val} className="eff-y-step">
                {val.toLocaleString('pt-BR')}
              </span>
            ))}
          </div>

          {/* CONTAINER PRINCIPAL DAS BARRAS COM RÓTULOS */}
          <div
            className="eff-bars-grid"
            role="region"
            aria-label={`Gráfico de colunas de ${title}`}
            onMouseLeave={() => {
              if (pinnedBarIndex === null) setActiveBarIndex(null);
            }}
          >
            {bars.map((bar, index) => {
              const isHovered = activeBarIndex === index;
              const isPinned = pinnedBarIndex === index;
              const isDimmed = displayedIndex !== null && displayedIndex !== index;
              const calculatedHeight =
                ceiling > 0 ? Math.min(100, Math.max(4, Math.round((bar.value / ceiling) * 100))) : 4;
              const pctOfTotal =
                totalValue > 0 ? ((bar.value / totalValue) * 100).toFixed(1) : '0';

              return (
                <div
                  key={bar.day}
                  className={`eff-bar-column ${isHovered || isPinned ? 'active' : ''} ${
                    isDimmed ? 'dimmed' : ''
                  }`}
                  onMouseEnter={() => {
                    if (pinnedBarIndex === null) setActiveBarIndex(index);
                  }}
                  onClick={() => handleBarClick(index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleBarClick(index);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isPinned}
                  aria-label={`${FULL_DAY_NAMES[bar.day] || bar.day}: ${bar.value.toLocaleString(
                    'pt-BR'
                  )} ${unit} (${pctOfTotal}% do total semanal)`}
                >
                  {/* RÓTULO DE VALOR PERMANENTE ACIMA DA BARRA */}
                  <div
                    className={`eff-bar-value-label ${bar.highlight ? 'highlight' : ''}`}
                    title={`${bar.value.toLocaleString('pt-BR')} ${unit}`}
                  >
                    {bar.value.toLocaleString('pt-BR')}
                  </div>

                  {/* TRILHO E PREENCHIMENTO DA BARRA */}
                  <div className="eff-bar-track">
                    <div
                      className={`eff-bar-fill ${getBarColorClass(bar)} ${
                        isPinned ? 'eff-bar-pinned' : ''
                      }`}
                      style={{ height: `${calculatedHeight}%` }}
                    />
                  </div>

                  {/* RÓTULO DO DIA ABAIXO DA BARRA */}
                  <span className={`eff-bar-day-label ${bar.highlight ? 'highlight' : ''}`}>
                    {bar.day}
                  </span>
                </div>
              );
            })}
          </div>

          {/* BALÃO / TOOLTIP FLUTUANTE INTERATIVO */}
          {currentHoveredBar && (
            <div
              className={`eff-chart-tooltip ${
                pinnedBarIndex !== null ? 'pinned' : ''
              }`}
              role="tooltip"
            >
              <div className="eff-tooltip-header">
                <span className="eff-tooltip-day">
                  {FULL_DAY_NAMES[currentHoveredBar.day] || currentHoveredBar.day}
                </span>
                {currentHoveredBar.highlight && (
                  <span className="eff-tooltip-badge">Destaque</span>
                )}
                {pinnedBarIndex !== null && (
                  <span className="eff-tooltip-pinned-tag">Fixado</span>
                )}
              </div>
              <div className="eff-tooltip-value-row">
                <span className="eff-tooltip-number">
                  {currentHoveredBar.value.toLocaleString('pt-BR')}
                </span>
                <span className="eff-tooltip-unit">{unit}</span>
              </div>
              <div className="eff-tooltip-meta">
                <span>
                  {totalValue > 0
                    ? `${((currentHoveredBar.value / totalValue) * 100).toFixed(1)}% do total semanal`
                    : 'Sem volume'}
                </span>
                <span className="eff-tooltip-hint">
                  {pinnedBarIndex !== null ? 'Clique para desmarcar' : 'Clique para fixar'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RODAPÉ INFORMATIVO RESUMIDO */}
      <footer className="eff-chart-footer">
        <div className="eff-footer-stat">
          <span className="eff-stat-label">Total semanal:</span>
          <strong className="eff-stat-val">{totalValue.toLocaleString('pt-BR')} {unit}</strong>
        </div>
        <div className="eff-footer-stat">
          <span className="eff-stat-label">Média diária:</span>
          <strong className="eff-stat-val">{averageValue.toLocaleString('pt-BR')}</strong>
        </div>
        <div className="eff-footer-stat eff-stat-pico">
          <span className="eff-stat-label">Pico:</span>
          <strong className="eff-stat-val">
            {maxBar.day} ({maxBar.value.toLocaleString('pt-BR')})
          </strong>
        </div>
      </footer>
    </article>
  );
};

export default InteractiveBarChart;
