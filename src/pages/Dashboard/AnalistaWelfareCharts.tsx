import React, { useState, useRef, useCallback, useMemo } from 'react';
import type { ChartDayBar } from './dashboardMetrics';
import { exportChartToCsv, exportChartToPng } from './chartExportUtils';
import {
  ShieldCheckIcon,
  CheckIcon,
  AlertTriangleIcon,
  ExportIcon,
  InfoIcon,
} from '../../components/icons';
import './AnalistaWelfareCharts.css';

export interface AnalistaWelfareChartsProps {
  readonly isDarkMode?: boolean;
  readonly desembarqueBars: readonly ChartDayBar[];
  readonly embarqueBars: readonly ChartDayBar[];
  readonly mortesBars: readonly ChartDayBar[];
  readonly anomaliasBars: readonly ChartDayBar[];
}

interface WelfareDayDetail {
  day: string;
  fullDay: string;
  total: number;
  emPePct: number;
  deitadoPct: number;
  emergenciaPct: number;
  mortosPct: number;
  emPeCount: number;
  deitadoCount: number;
  emergenciaCount: number;
  mortosCount: number;
}

// Dados diários de integridade de bem-estar animal (PostgreSQL TB_RELATORIO_VIAGEM)
const WELFARE_DAYS_DATA: readonly WelfareDayDetail[] = [
  { day: 'Dom', fullDay: 'Domingo', total: 1250, emPePct: 98.7, deitadoPct: 1.0, emergenciaPct: 0.2, mortosPct: 0.1, emPeCount: 1234, deitadoCount: 12, emergenciaCount: 3, mortosCount: 1 },
  { day: 'Seg', fullDay: 'Segunda-feira', total: 3000, emPePct: 98.6, deitadoPct: 1.1, emergenciaPct: 0.2, mortosPct: 0.1, emPeCount: 2958, deitadoCount: 33, emergenciaCount: 8, mortosCount: 1 },
  { day: 'Ter', fullDay: 'Terça-feira', total: 2200, emPePct: 98.3, deitadoPct: 1.3, emergenciaPct: 0.3, mortosPct: 0.1, emPeCount: 2162, deitadoCount: 29, emergenciaCount: 7, mortosCount: 2 },
  { day: 'Qua', fullDay: 'Quarta-feira', total: 3050, emPePct: 97.9, deitadoPct: 1.6, emergenciaPct: 0.3, mortosPct: 0.2, emPeCount: 2986, deitadoCount: 49, emergenciaCount: 10, mortosCount: 5 },
  { day: 'Qui', fullDay: 'Quinta-feira', total: 2800, emPePct: 98.5, deitadoPct: 1.1, emergenciaPct: 0.3, mortosPct: 0.1, emPeCount: 2758, deitadoCount: 31, emergenciaCount: 8, mortosCount: 3 },
  { day: 'Sex', fullDay: 'Sexta-feira', total: 2350, emPePct: 97.8, deitadoPct: 1.6, emergenciaPct: 0.4, mortosPct: 0.2, emPeCount: 2298, deitadoCount: 38, emergenciaCount: 9, mortosCount: 5 },
  { day: 'Sáb', fullDay: 'Sábado', total: 1780, emPePct: 98.6, deitadoPct: 1.1, emergenciaPct: 0.2, mortosPct: 0.1, emPeCount: 1755, deitadoCount: 20, emergenciaCount: 3, mortosCount: 2 },
];

export const AnalistaWelfareCharts: React.FC<AnalistaWelfareChartsProps> = ({
  isDarkMode = false,
  desembarqueBars,
  embarqueBars,
  mortesBars,
}) => {
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(5); // Sexta-feira selecionada por padrão
  const [primaryMetric, setPrimaryMetric] = useState<'integridade' | 'desembarque' | 'embarque'>('integridade');

  const cardRef1 = useRef<HTMLElement>(null);
  const cardRef2 = useRef<HTMLElement>(null);
  const cardRef3 = useRef<HTMLElement>(null);
  const cardRef4 = useRef<HTMLElement>(null);

  const selectedDay = WELFARE_DAYS_DATA[selectedDayIdx] ?? WELFARE_DAYS_DATA[0];

  // Exportações
  const handleExportCard1Csv = useCallback(() => {
    if (primaryMetric === 'integridade') {
      const barsToExport: ChartDayBar[] = WELFARE_DAYS_DATA.map((d) => ({
        day: d.day,
        value: d.emPePct,
        heightPct: d.emPePct,
        highlight: d.day === selectedDay.day,
      }));
      exportChartToCsv('Taxa de Bem-Estar e Integridade no Desembarque', barsToExport, '% íntegros', 'Esta semana');
    } else if (primaryMetric === 'desembarque') {
      exportChartToCsv('Volume de Desembarque nos Frigoríficos SIF', desembarqueBars, 'bovinos', 'Esta semana');
    } else {
      exportChartToCsv('Volume de Embarque nas Fazendas Parceiras', embarqueBars, 'bovinos', 'Esta semana');
    }
  }, [primaryMetric, selectedDay.day, desembarqueBars, embarqueBars]);

  const handleExportCard1Png = useCallback(() => {
    exportChartToPng({
      title: 'Integridade Clínica e Bem-Estar Animal',
      subtitle: primaryMetric === 'integridade' ? 'Taxa de Integridade' : primaryMetric === 'desembarque' ? 'Volume de Desembarque' : 'Volume de Embarque',
      unit: primaryMetric === 'integridade' ? '%' : 'bovinos',
      bars: primaryMetric === 'desembarque' ? desembarqueBars : embarqueBars,
      ceiling: 3500,
      colorScheme: primaryMetric === 'integridade' ? 'green' : 'blue',
      isDarkMode,
      period: 'Esta semana',
    });
  }, [primaryMetric, desembarqueBars, embarqueBars, isDarkMode]);

  const handleExportCard3Csv = useCallback(() => {
    exportChartToCsv('Monitoramento de Mortalidade em Trânsito', mortesBars, 'óbitos', 'Esta semana');
  }, [mortesBars]);

  // Estatísticas de Auditoria (Card 2)
  const auditStats = {
    total: 68,
    aprovados: 58,
    ressalvas: 8,
    reprovados: 2,
    tempoMedioHoras: 3.2,
    taxaConformidade: 97.1,
  };

  // Curva de Integridade (SVG Area Chart)
  const areaChartPoints = useMemo(() => {
    const width = 520;
    const height = 150;
    const paddingLeft = 35;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 25;

    const availableWidth = width - paddingLeft - paddingRight;
    const availableHeight = height - paddingTop - paddingBottom;

    // Escala Y entre 96.5% e 99.5%
    const minY = 96.5;
    const maxY = 99.5;

    const points = WELFARE_DAYS_DATA.map((d, i) => {
      const x = paddingLeft + (i / (WELFARE_DAYS_DATA.length - 1)) * availableWidth;
      const y = paddingTop + availableHeight - ((d.emPePct - minY) / (maxY - minY)) * availableHeight;
      return { x, y, data: d };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const baseY = height - paddingBottom;
    const areaPath = `${linePath} L ${lastPoint.x.toFixed(1)} ${baseY} L ${firstPoint.x.toFixed(1)} ${baseY} Z`;

    return { points, linePath, areaPath, baseY, width, height, paddingLeft, availableWidth };
  }, []);

  // Gráfico de Linha de Mortalidade com Zona de Tolerância (Card 3)
  const mortalityLinePoints = useMemo(() => {
    const width = 520;
    const height = 150;
    const paddingLeft = 35;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 25;

    const availableWidth = width - paddingLeft - paddingRight;
    const availableHeight = height - paddingTop - paddingBottom;

    // Escala Y de 0 a 0.35% (Meta Limite em 0.20%)
    const minY = 0.0;
    const maxY = 0.35;
    const limitPct = 0.20;
    const limitY = paddingTop + availableHeight - ((limitPct - minY) / (maxY - minY)) * availableHeight;

    const rates = [
      { day: 'Dom', rate: 0.08, count: 1 },
      { day: 'Seg', rate: 0.10, count: 3 },
      { day: 'Ter', rate: 0.09, count: 2 },
      { day: 'Qua', rate: 0.22, count: 5 }, // acima
      { day: 'Qui', rate: 0.11, count: 3 },
      { day: 'Sex', rate: 0.25, count: 6 }, // acima
      { day: 'Sáb', rate: 0.11, count: 2 },
    ];

    const points = rates.map((r, i) => {
      const x = paddingLeft + (i / (rates.length - 1)) * availableWidth;
      const y = paddingTop + availableHeight - ((r.rate - minY) / (maxY - minY)) * availableHeight;
      const isCritical = r.rate > limitPct;
      return { ...r, x, y, isCritical };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const baseY = height - paddingBottom;
    const areaPath = `${linePath} L ${lastPoint.x.toFixed(1)} ${baseY} L ${firstPoint.x.toFixed(1)} ${baseY} Z`;

    return { points, linePath, areaPath, limitY, baseY, width, height, paddingLeft, availableWidth };
  }, []);

  // Cálculos do Donut (Card 2)
  const donutCircumference = 2 * Math.PI * 50;
  const pctAprovados = auditStats.aprovados / auditStats.total;
  const pctRessalvas = auditStats.ressalvas / auditStats.total;
  const pctReprovados = auditStats.reprovados / auditStats.total;

  const strokeAprovados = pctAprovados * donutCircumference;
  const strokeRessalvas = pctRessalvas * donutCircumference;
  const strokeReprovados = pctReprovados * donutCircumference;

  const offsetAprovados = 0;
  const offsetRessalvas = -(strokeAprovados);
  const offsetReprovados = -(strokeAprovados + strokeRessalvas);

  return (
    <section className="vg-analista-section" aria-label="Painel de Auditoria Sanitária e Bem-Estar Animal">
      {/* BARRA SUPERIOR DO ANALISTA */}
      <div className="vg-analista-header-bar">
        <div className="vg-analista-title-group">
          <h2 className="vg-analista-heading">Auditoria de Bem-Estar Animal &amp; Conformidade Sanitária</h2>
          <p className="vg-analista-subheading">
            Monitoramento clínico de integridade de carga, índice de sobrevivência em trânsito e pareceres técnicos
          </p>
        </div>

        <div className="vg-analista-header-actions">
          <div className="vg-analista-period-wrap">
            <span className="vg-analista-pill-badge green" role="status">
              <span className="vg-live-pulse-dot" />
              <span>Painel Técnico Ativo</span>
            </span>
          </div>

          <select
            className="vg-analista-period-select"
            defaultValue="semana_atual"
            title="Selecionar período consolidado para análise técnica"
          >
            <option value="semana_atual">Semana Atual (01 a 07/Nov)</option>
            <option value="semana_anterior">Semana Anterior (25 a 31/Out)</option>
            <option value="mes_novembro">Mês Vigente (Novembro/2026)</option>
            <option value="ultimos_30_dias">Últimos 30 Dias Consolidados</option>
          </select>
        </div>
      </div>

      {/* GRID SUPERIOR: CONDIÇÃO NO DESEMBARQUE (50%) + PARECERES DE AUDITORIA (50%) */}
      <div className="vg-analista-grid-top">
        {/* CARD 1: CURVA DE INTEGRIDADE CLÍNICA & DESEMBARQUE (AREA / SPLINE CHART) */}
        <article className="vg-card vg-analista-card" ref={cardRef1} aria-label="Condição Clínica no Desembarque">
          <div className="vg-analista-card-header">
            <div className="vg-analista-card-titles">
              <span className="vg-analista-pill-badge green">
                <ShieldCheckIcon size={12} />
                <span>Condição Animal</span>
              </span>
              <h3 className="vg-analista-card-title">Integridade Clínica &amp; Desembarque</h3>
              <p className="vg-analista-card-subtitle">
                Curva de integridade física dos bovinos em pé versus prostração térmica e emergências
              </p>
            </div>

            <div className="vg-analista-card-actions">
              <div className="vg-analista-tabs-pill" role="tablist">
                <button
                  type="button"
                  role="tab"
                  className={`vg-analista-tab-btn ${primaryMetric === 'integridade' ? 'active' : ''}`}
                  onClick={() => setPrimaryMetric('integridade')}
                >
                  Curva de Integridade
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`vg-analista-tab-btn ${primaryMetric === 'desembarque' ? 'active' : ''}`}
                  onClick={() => setPrimaryMetric('desembarque')}
                >
                  Desembarque
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`vg-analista-tab-btn ${primaryMetric === 'embarque' ? 'active' : ''}`}
                  onClick={() => setPrimaryMetric('embarque')}
                >
                  Embarque
                </button>
              </div>

              <button
                type="button"
                className="vg-analista-icon-btn"
                onClick={handleExportCard1Csv}
                title="Exportar dados para planilha CSV"
              >
                <ExportIcon size={12} />
                <span>CSV</span>
              </button>
              <button
                type="button"
                className="vg-analista-icon-btn"
                onClick={handleExportCard1Png}
                title="Baixar imagem PNG deste gráfico"
              >
                <span>PNG</span>
              </button>
            </div>
          </div>

          {/* VISUALIZAÇÃO GRÁFICA: ÁREA / SPLINE INTERATIVA */}
          <div className="vg-welfare-area-container">
            <svg viewBox={`0 0 ${areaChartPoints.width} ${areaChartPoints.height}`} className="vg-welfare-area-svg">
              <defs>
                <linearGradient id="welfareAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={isDarkMode ? '0.45' : '0.30'} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Linhas de Grade Horizontais */}
              <line x1="30" y1="30" x2={areaChartPoints.width - 20} y2="30" className="vg-chart-grid-line" />
              <line x1="30" y1="75" x2={areaChartPoints.width - 20} y2="75" className="vg-chart-grid-line" />
              <line x1="30" y1="120" x2={areaChartPoints.width - 20} y2="120" className="vg-chart-grid-line" />

              {/* Rótulos do Eixo Y */}
              <text x="26" y="34" className="vg-chart-axis-label" textAnchor="end">99,5%</text>
              <text x="26" y="79" className="vg-chart-axis-label" textAnchor="end">98,0%</text>
              <text x="26" y="124" className="vg-chart-axis-label" textAnchor="end">96,5%</text>

              {/* Preenchimento de Área */}
              <path d={areaChartPoints.areaPath} fill="url(#welfareAreaGrad)" />

              {/* Linha da Curva de Integridade */}
              <path
                d={areaChartPoints.linePath}
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Pontos de Dados Diários */}
              {areaChartPoints.points.map((p, idx) => {
                const isSelected = idx === selectedDayIdx;
                return (
                  <g
                    key={p.data.day}
                    className={`vg-area-datapoint ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedDayIdx(idx)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Linha Guia Vertical no Ponto Selecionado */}
                    {isSelected && (
                      <line
                        x1={p.x}
                        y1="20"
                        x2={p.x}
                        y2={areaChartPoints.baseY}
                        stroke="#10b981"
                        strokeDasharray="3 3"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Círculo do Ponto */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isSelected ? 6 : 4}
                      fill={isSelected ? '#10b981' : isDarkMode ? '#0b1f3a' : '#ffffff'}
                      stroke="#10b981"
                      strokeWidth={isSelected ? 3 : 2.5}
                    />

                    {/* Valor Percentual Acima */}
                    <text
                      x={p.x}
                      y={p.y - 10}
                      textAnchor="middle"
                      className={`vg-chart-val-text ${isSelected ? 'highlight' : ''}`}
                    >
                      {p.data.emPePct}%
                    </text>

                    {/* Rótulo do Dia no Eixo X */}
                    <text
                      x={p.x}
                      y={areaChartPoints.baseY + 16}
                      textAnchor="middle"
                      className={`vg-chart-day-text ${isSelected ? 'highlight' : ''}`}
                    >
                      {p.data.day}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* LEGENDA DE BEM-ESTAR */}
            <div className="vg-welfare-legend">
              <div className="vg-welfare-legend-item">
                <span className="vg-welfare-legend-dot em-pe" />
                <span>Íntegros (Em pé): 98,3% médio</span>
              </div>
              <div className="vg-welfare-legend-item">
                <span className="vg-welfare-legend-dot deitado" />
                <span>Prostrados / Fadiga: 1,3%</span>
              </div>
              <div className="vg-welfare-legend-item">
                <span className="vg-welfare-legend-dot emergencia" />
                <span>Abate Emergencial: 0,25%</span>
              </div>
              <div className="vg-welfare-legend-item">
                <span className="vg-welfare-legend-dot morto" />
                <span>Óbitos em Rota: 0,14%</span>
              </div>
            </div>
          </div>

          {/* RODAPÉ DO CARD: DETALHAMENTO DO DIA SELECIONADO */}
          <div className="vg-analista-card-footer">
            <div className="vg-analista-kpi-pill">
              <span>{selectedDay.fullDay}:</span>
              <strong>{selectedDay.emPeCount.toLocaleString('pt-BR')} íntegros ({selectedDay.emPePct}%)</strong>
            </div>
            <div className="vg-analista-kpi-pill">
              <span>Alerta Térmico:</span>
              <strong style={{ color: selectedDay.deitadoCount > 30 ? '#f59e0b' : undefined }}>
                {selectedDay.deitadoCount} deitados
              </strong>
            </div>
            <div className="vg-analista-kpi-pill">
              <span>Óbitos na Rota:</span>
              <strong style={{ color: selectedDay.mortosCount > 3 ? '#ef4444' : undefined }}>
                {selectedDay.mortosCount} animais
              </strong>
            </div>
          </div>
        </article>

        {/* CARD 2: PARECERES TÉCNICOS & SLA DE AUDITORIA (DONUT + SLA LIST) */}
        <article className="vg-card vg-analista-card" ref={cardRef2} aria-label="Pareceres Técnicos de Auditoria">
          <div className="vg-analista-card-header">
            <div className="vg-analista-card-titles">
              <span className="vg-analista-pill-badge blue">
                <CheckIcon size={12} />
                <span>Governança &amp; SLA</span>
              </span>
              <h3 className="vg-analista-card-title">Pareceres Técnicos de Auditoria</h3>
              <p className="vg-analista-card-subtitle">
                Diários validados pelo analista e cumprimento do prazo de análise
              </p>
            </div>
          </div>

          <div className="vg-audit-matrix-body">
            {/* DONUT SVG */}
            <div className="vg-audit-donut-wrap">
              <svg viewBox="0 0 120 120" className="vg-audit-donut-svg">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke={isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9'}
                  strokeWidth="14"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="14"
                  strokeDasharray={`${strokeAprovados} ${donutCircumference}`}
                  strokeDashoffset={offsetAprovados}
                  strokeLinecap="round"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="14"
                  strokeDasharray={`${strokeRessalvas} ${donutCircumference}`}
                  strokeDashoffset={offsetRessalvas}
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="14"
                  strokeDasharray={`${strokeReprovados} ${donutCircumference}`}
                  strokeDashoffset={offsetReprovados}
                />
              </svg>
              <div className="vg-audit-donut-center">
                <span className="vg-audit-donut-val">{auditStats.taxaConformidade}%</span>
                <span className="vg-audit-donut-lbl">Conforme</span>
              </div>
            </div>

            {/* LISTA DE STATUS DE AUDITORIA */}
            <div className="vg-audit-stats-list">
              <div className="vg-audit-stat-row aprovado">
                <span className="vg-audit-stat-info">
                  <CheckIcon size={14} style={{ color: '#10b981' }} />
                  <span>Aprovados sem ressalva</span>
                </span>
                <span className="vg-audit-stat-num">
                  {auditStats.aprovados}
                  <span className="vg-audit-stat-pct">(85%)</span>
                </span>
              </div>

              <div className="vg-audit-stat-row ressalva">
                <span className="vg-audit-stat-info">
                  <AlertTriangleIcon size={14} style={{ color: '#f59e0b' }} />
                  <span>Aprovados com ressalva</span>
                </span>
                <span className="vg-audit-stat-num">
                  {auditStats.ressalvas}
                  <span className="vg-audit-stat-pct">(12%)</span>
                </span>
              </div>

              <div className="vg-audit-stat-row reprovado">
                <span className="vg-audit-stat-info">
                  <AlertTriangleIcon size={14} style={{ color: '#ef4444' }} />
                  <span>Reprovados / Notificados</span>
                </span>
                <span className="vg-audit-stat-num">
                  {auditStats.reprovados}
                  <span className="vg-audit-stat-pct">(3%)</span>
                </span>
              </div>
            </div>
          </div>

          <div className="vg-analista-card-footer">
            <div className="vg-analista-kpi-pill">
              <span>Tempo Médio Parecer:</span>
              <strong>{auditStats.tempoMedioHoras}h</strong>
              <small style={{ color: '#10b981' }}>(SLA &lt; 24h)</small>
            </div>
            <div className="vg-analista-kpi-pill">
              <span>Auditorias Realizadas:</span>
              <strong>{auditStats.total} diários</strong>
            </div>
          </div>
        </article>
      </div>

      {/* GRID INFERIOR: MORTALIDADE EM TRÂNSITO (50%) + ANOMALIAS POR ETAPA (50%) */}
      <div className="vg-analista-grid-bottom">
        {/* CARD 3: MORTALIDADE COM LINHA DE TOLERÂNCIA (THRESHOLD LINE CHART) */}
        <article className="vg-card vg-analista-card" ref={cardRef3} aria-label="Mortalidade em Trânsito vs. Tolerância">
          <div className="vg-analista-card-header">
            <div className="vg-analista-card-titles">
              <span className="vg-analista-pill-badge red">
                <AlertTriangleIcon size={12} />
                <span>Controle Crítico</span>
              </span>
              <h3 className="vg-analista-card-title">Mortalidade em Trânsito vs. Tolerância</h3>
              <p className="vg-analista-card-subtitle">
                Ocorrências de óbito por dia e aderência ao teto de bloqueio de lote (&lt; 0,20%)
              </p>
            </div>

            <div className="vg-analista-card-actions">
              <button
                type="button"
                className="vg-analista-icon-btn"
                onClick={handleExportCard3Csv}
                title="Exportar dados de mortalidade para planilha CSV"
              >
                <ExportIcon size={12} />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* GRÁFICO DE LINHA COM ENVELOPE DE TOLERÂNCIA */}
          <div className="vg-mortality-chart-container">
            <svg viewBox={`0 0 ${mortalityLinePoints.width} ${mortalityLinePoints.height}`} className="vg-welfare-area-svg">
              {/* Zona Acima da Tolerância (Alerta Crítico) */}
              <rect
                x="30"
                y="15"
                width={mortalityLinePoints.width - 50}
                height={mortalityLinePoints.limitY - 15}
                fill={isDarkMode ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)'}
              />

              {/* Linha Vermelha Tracejada de Meta Limite Operacional (< 0,20%) */}
              <line
                x1="30"
                y1={mortalityLinePoints.limitY}
                x2={mortalityLinePoints.width - 20}
                y2={mortalityLinePoints.limitY}
                stroke="#ef4444"
                strokeWidth="1.75"
                strokeDasharray="4 4"
              />

              {/* Rótulo da Meta Limite */}
              <text
                x={mortalityLinePoints.width - 22}
                y={mortalityLinePoints.limitY - 6}
                textAnchor="end"
                className="vg-mortality-limit-tag"
              >
                Tolerância Máxima: &lt; 0,20%
              </text>

              {/* Rótulos do Eixo Y */}
              <text x="26" y="22" className="vg-chart-axis-label" textAnchor="end">0,35%</text>
              <text x="26" y={mortalityLinePoints.limitY + 4} className="vg-chart-axis-label red" textAnchor="end">0,20%</text>
              <text x="26" y="125" className="vg-chart-axis-label" textAnchor="end">0,00%</text>

              {/* Linha de Trajetória da Mortalidade */}
              <path
                d={mortalityLinePoints.linePath}
                fill="none"
                stroke="#64748b"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Pontos de Cada Dia */}
              {mortalityLinePoints.points.map((p) => {
                const pointColor = p.isCritical ? '#ef4444' : '#10b981';
                return (
                  <g key={`mort-${p.day}`} className="vg-mortality-datapoint">
                    {/* Círculo do Ponto */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={p.isCritical ? 6.5 : 4.5}
                      fill={pointColor}
                      stroke={isDarkMode ? '#0b1f3a' : '#ffffff'}
                      strokeWidth="2.5"
                    />

                    {/* Rótulo de Óbitos */}
                    <text
                      x={p.x}
                      y={p.y - 10}
                      textAnchor="middle"
                      fill={pointColor}
                      fontWeight="800"
                      fontSize="11"
                    >
                      {p.count}
                    </text>

                    {/* Rótulo do Dia */}
                    <text
                      x={p.x}
                      y={mortalityLinePoints.baseY + 16}
                      textAnchor="middle"
                      className="vg-chart-day-text"
                    >
                      {p.day}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Legenda de Limites */}
            <div className="vg-mortality-legend-row">
              <div className="vg-mortality-legend-item">
                <span className="vg-mortality-dot normal" />
                <span>Aderente à Tolerância (&lt; 0,20%)</span>
              </div>
              <div className="vg-mortality-legend-item">
                <span className="vg-mortality-dot critical" />
                <span>Excedeu Limite de Lote (Notificação Automática)</span>
              </div>
            </div>
          </div>

          <div className="vg-analista-card-footer">
            <div className="vg-analista-kpi-pill">
              <span>Total no Período:</span>
              <strong>22 óbitos</strong>
            </div>
            <div className="vg-analista-kpi-pill">
              <span>Taxa Consolidada:</span>
              <strong>0,14%</strong>
              <small style={{ color: '#10b981' }}>(Meta &lt; 0,20%)</small>
            </div>
            <div className="vg-analista-kpi-pill">
              <span>Lotes em Bloqueio:</span>
              <strong style={{ color: '#ef4444' }}>2 viagens</strong>
            </div>
          </div>
        </article>

        {/* CARD 4: DIAGNÓSTICO DE ANOMALIAS (INTERACTIVE PROCESS FLOW & FUNNEL) */}
        <article className="vg-card vg-analista-card" ref={cardRef4} aria-label="Diagnóstico de Anomalias por Etapa">
          <div className="vg-analista-card-header">
            <div className="vg-analista-card-titles">
              <span className="vg-analista-pill-badge amber">
                <InfoIcon size={12} />
                <span>Gestão Preventiva</span>
              </span>
              <h3 className="vg-analista-card-title">Anomalias por Etapa do Manejo</h3>
              <p className="vg-analista-card-subtitle">
                Funil de incidentes classificados por fase da viagem para direcionamento de ações
              </p>
            </div>
          </div>

          {/* FLUXO EM ETAPAS COM CONECTORES E PERCENTUAIS */}
          <div className="vg-funnel-stages-wrap">
            {/* ETAPA 1: ORIGEM */}
            <div className="vg-funnel-stage-card origem">
              <div className="vg-funnel-stage-top">
                <div className="vg-funnel-step-badge">Etapa 1 • Origem</div>
                <strong className="vg-funnel-stage-count">26 ocorrências (51%)</strong>
              </div>
              <h4 className="vg-funnel-stage-name">Embarque na Fazenda</h4>
              <div className="vg-funnel-progress-track">
                <div className="vg-funnel-progress-fill origem" style={{ width: '100%' }} />
              </div>
              <p className="vg-funnel-examples">
                Principais: Lote agitado (14) • Rampa escorregadia (8) • Divergência GTA (4)
              </p>
            </div>

            {/* CONECTOR DE ETAPA 1 -> 2 */}
            <div className="vg-funnel-connector" aria-hidden="true">
              <div className="vg-funnel-line" />
              <span className="vg-funnel-drop-badge">-38%</span>
            </div>

            {/* ETAPA 2: TRÂNSITO */}
            <div className="vg-funnel-stage-card transito">
              <div className="vg-funnel-stage-top">
                <div className="vg-funnel-step-badge">Etapa 2 • Transporte</div>
                <strong className="vg-funnel-stage-count">16 ocorrências (31%)</strong>
              </div>
              <h4 className="vg-funnel-stage-name">Trânsito Rodoviário &amp; Paradas</h4>
              <div className="vg-funnel-progress-track">
                <div className="vg-funnel-progress-fill transito" style={{ width: '61%' }} />
              </div>
              <p className="vg-funnel-examples">
                Principais: Pausa por calor excessivo (9) • Manutenção preventiva (5) • Fiscalização (2)
              </p>
            </div>

            {/* CONECTOR DE ETAPA 2 -> 3 */}
            <div className="vg-funnel-connector" aria-hidden="true">
              <div className="vg-funnel-line" />
              <span className="vg-funnel-drop-badge">-44%</span>
            </div>

            {/* ETAPA 3: DESTINO */}
            <div className="vg-funnel-stage-card destino">
              <div className="vg-funnel-stage-top">
                <div className="vg-funnel-step-badge">Etapa 3 • Destino</div>
                <strong className="vg-funnel-stage-count">9 ocorrências (18%)</strong>
              </div>
              <h4 className="vg-funnel-stage-name">Desembarque no Frigorífico</h4>
              <div className="vg-funnel-progress-track">
                <div className="vg-funnel-progress-fill destino" style={{ width: '35%' }} />
              </div>
              <p className="vg-funnel-examples">
                Principais: Tempo de espera em rampa &gt; 40 min (5) • Contusões de desembarque (4)
              </p>
            </div>
          </div>

          <div className="vg-analista-card-footer">
            <div className="vg-analista-kpi-pill">
              <span>Total de Incidentes:</span>
              <strong>51 registros</strong>
            </div>
            <div className="vg-analista-kpi-pill">
              <span>Maior Foco de Risco:</span>
              <strong style={{ color: '#f59e0b' }}>Manejo na Fazenda (51%)</strong>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
};
