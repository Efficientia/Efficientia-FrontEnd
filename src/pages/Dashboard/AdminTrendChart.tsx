import React, { useState, useMemo, useRef, useCallback } from 'react';
import { exportChartToCsv, exportChartToPng } from './chartExportUtils';
import type { ChartDayBar } from './dashboardMetrics';

export type TrendMetricType = 'bovinos' | 'km' | 'pontualidade';

interface DataPoint {
  day: string;
  fullDay: string;
  bovinos: number;
  km: number;
  pontualidade: number;
  viagens: number;
}

const WEEK_DATA: readonly DataPoint[] = [
  { day: 'Dom', fullDay: 'Domingo', bovinos: 420, km: 1450, pontualidade: 98.5, viagens: 4 },
  { day: 'Seg', fullDay: 'Segunda-feira', bovinos: 980, km: 3420, pontualidade: 96.8, viagens: 9 },
  { day: 'Ter', fullDay: 'Terça-feira', bovinos: 760, km: 2890, pontualidade: 97.4, viagens: 7 },
  { day: 'Qua', fullDay: 'Quarta-feira', bovinos: 1140, km: 4120, pontualidade: 95.9, viagens: 11 },
  { day: 'Qui', fullDay: 'Quinta-feira', bovinos: 920, km: 3650, pontualidade: 98.2, viagens: 8 },
  { day: 'Sex', fullDay: 'Sexta-feira', bovinos: 1280, km: 4580, pontualidade: 99.1, viagens: 12 },
  { day: 'Sáb', fullDay: 'Sábado', bovinos: 640, km: 2340, pontualidade: 98.0, viagens: 6 },
];

interface AdminTrendChartProps {
  isDarkMode?: boolean;
}

export const AdminTrendChart: React.FC<AdminTrendChartProps> = ({ isDarkMode = false }) => {
  const [metric, setMetric] = useState<TrendMetricType>('bovinos');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(5); // Default highlight Friday
  const [period, setPeriod] = useState<'esta_semana' | 'semana_anterior' | 'mes_atual'>('esta_semana');
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  const showFeedback = useCallback((msg: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback(msg);
    feedbackTimerRef.current = window.setTimeout(() => setFeedback(null), 2500);
  }, []);

  const metricConfig = useMemo(() => {
    switch (metric) {
      case 'bovinos':
        return {
          title: 'Volume de Bovinos Transportados',
          unit: 'bovinos',
          format: (v: number) => v.toLocaleString('pt-BR'),
          color: '#0F51AE',
          gradientColor: isDarkMode ? '#3B82F6' : '#0F51AE',
          accent: '#10B981',
        };
      case 'km':
        return {
          title: 'Quilômetros Rodados pela Frota',
          unit: 'km',
          format: (v: number) => `${v.toLocaleString('pt-BR')} km`,
          color: '#2563EB',
          gradientColor: isDarkMode ? '#60A5FA' : '#2563EB',
          accent: '#38BDF8',
        };
      case 'pontualidade':
        return {
          title: 'Índice de Pontualidade das Entregas',
          unit: '% no prazo',
          format: (v: number) => `${v.toFixed(1)}%`,
          color: '#10B981',
          gradientColor: isDarkMode ? '#34D399' : '#10B981',
          accent: '#059669',
        };
    }
  }, [metric, isDarkMode]);

  // Totals & Averages
  const values = useMemo(() => WEEK_DATA.map((d) => d[metric]), [metric]);
  const total = useMemo(() => values.reduce((a, b) => a + b, 0), [values]);
  const avg = useMemo(() => (values.length > 0 ? total / values.length : 0), [total, values.length]);

  // SVG Coordinates calculation
  const width = 640;
  const height = 210;
  const paddingX = 42;
  const paddingTop = 25;
  const paddingBottom = 32;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingTop - paddingBottom;

  const minVal = useMemo(() => {
    if (metric === 'pontualidade') return 90;
    return 0;
  }, [metric]);

  const maxVal = useMemo(() => {
    if (metric === 'pontualidade') return 100;
    const peak = Math.max(...values, 100);
    return Math.ceil(peak * 1.15);
  }, [metric, values]);

  const points = useMemo(() => {
    const range = maxVal - minVal || 1;
    return WEEK_DATA.map((d, i) => {
      const x = paddingX + (i / (WEEK_DATA.length - 1)) * chartW;
      const normalizedY = (d[metric] - minVal) / range;
      const y = paddingTop + chartH - normalizedY * chartH;
      return { x, y, data: d, val: d[metric] };
    });
  }, [metric, minVal, maxVal, paddingX, chartW, paddingTop, chartH]);

  // Smooth Bézier Spline generator
  const { pathD, areaD } = useMemo(() => {
    if (points.length < 2) return { pathD: '', areaD: '' };

    let pD = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) / 2;
      const cp2y = p1.y;
      pD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
    }

    const baselineY = paddingTop + chartH;
    const aD = `${pD} L ${points[points.length - 1].x},${baselineY} L ${points[0].x},${baselineY} Z`;

    return { pathD: pD, areaD: aD };
  }, [points, paddingTop, chartH]);

  // Y Axis ticks
  const yTicks = useMemo(() => {
    const steps = 4;
    const ticks: { val: number; y: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const val = minVal + (maxVal - minVal) * ratio;
      const y = paddingTop + chartH - ratio * chartH;
      ticks.push({ val, y });
    }
    return ticks;
  }, [minVal, maxVal, paddingTop, chartH]);

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  const handleExportCsv = useCallback(() => {
    try {
      const barsForExport: ChartDayBar[] = WEEK_DATA.map((d) => ({
        day: d.day,
        value: d[metric],
        heightPct: maxVal > 0 ? (d[metric] / maxVal) * 100 : 0,
        highlight: d.day === 'Sex',
      }));
      exportChartToCsv(metricConfig.title, barsForExport, metricConfig.unit, 'Esta semana');
      showFeedback('Planilha CSV gerada com sucesso!');
    } catch {
      showFeedback('Erro ao exportar CSV.');
    }
  }, [metric, maxVal, metricConfig, showFeedback]);

  const handleExportPng = useCallback(() => {
    try {
      const barsForExport: ChartDayBar[] = WEEK_DATA.map((d) => ({
        day: d.day,
        value: d[metric],
        heightPct: maxVal > 0 ? (d[metric] / maxVal) * 100 : 0,
        highlight: d.day === 'Sex',
      }));
      exportChartToPng({
        title: metricConfig.title,
        subtitle: 'Evolução diária da operação logística',
        unit: metricConfig.unit,
        bars: barsForExport,
        ceiling: maxVal,
        colorScheme: metric === 'pontualidade' ? 'green' : 'blue',
        isDarkMode,
      });
      showFeedback('Recorte salvo em PNG!');
    } catch {
      showFeedback('Erro ao gerar imagem.');
    }
  }, [metric, maxVal, metricConfig, isDarkMode, showFeedback]);

  return (
    <article className="vg-card vg-admin-trend-card" aria-label="Evolução e Desempenho Operacional">
      {/* HEADER DO CARD */}
      <div className="vg-admin-card-header">
        <div className="vg-admin-header-titles">
          <div className="vg-admin-tag-pill">Inteligência Operacional</div>
          <h3 className="vg-admin-card-title">Evolução do Volume e Desempenho da Frota</h3>
          <p className="vg-admin-card-subtitle">
            Tendência diária de transporte, quilometragem percorrida e cumprimento de horários
          </p>
        </div>

        {/* CONTROLES DO TOPO: MÉTRICA, PERÍODO E EXPORTAÇÕES */}
        <div className="vg-admin-header-actions">
          {/* SELETOR DE PERÍODO */}
          <select
            className="vg-period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'esta_semana' | 'semana_anterior' | 'mes_atual')}
            title="Selecionar período"
          >
            <option value="esta_semana">Esta Semana</option>
            <option value="semana_anterior">Semana Anterior</option>
            <option value="mes_atual">Mês Atual</option>
          </select>

          {/* BOTÕES DE EXPORTAÇÃO */}
          <button
            type="button"
            className="vg-trend-tool-btn"
            onClick={handleExportCsv}
            title="Exportar dados em CSV"
            aria-label="Exportar CSV"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <polyline points="9 15 12 18 15 15" />
            </svg>
            <span>CSV</span>
          </button>

          <button
            type="button"
            className="vg-trend-tool-btn"
            onClick={handleExportPng}
            title="Exportar imagem em PNG"
            aria-label="Exportar PNG"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>PNG</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK TOAST */}
      {feedback && (
        <div className="eff-chart-toast" role="status" aria-live="polite">
          <span>{feedback}</span>
        </div>
      )}

      {/* BARRA DE COMUTAÇÃO DE MÉTRICA (TABS) & RESUMO EXECUTIVO */}
      <div className="vg-trend-meta-row">
        <div className="vg-trend-metric-tabs" role="tablist" aria-label="Métricas de tendência">
          <button
            type="button"
            role="tab"
            aria-selected={metric === 'bovinos'}
            className={`vg-trend-tab ${metric === 'bovinos' ? 'active' : ''}`}
            onClick={() => setMetric('bovinos')}
          >
            <span className="vg-trend-tab-dot dot-blue" />
            <span>Volume de Bovinos</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={metric === 'km'}
            className={`vg-trend-tab ${metric === 'km' ? 'active' : ''}`}
            onClick={() => setMetric('km')}
          >
            <span className="vg-trend-tab-dot dot-azure" />
            <span>Quilometragem (Km)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={metric === 'pontualidade'}
            className={`vg-trend-tab ${metric === 'pontualidade' ? 'active' : ''}`}
            onClick={() => setMetric('pontualidade')}
          >
            <span className="vg-trend-tab-dot dot-green" />
            <span>Pontualidade (SLA)</span>
          </button>
        </div>

        <div className="vg-trend-summary-pills">
          <div className="vg-trend-stat-badge">
            <span className="vg-trend-stat-lbl">
              {metric === 'pontualidade' ? 'Média Semanal:' : 'Total Acumulado:'}
            </span>
            <strong className="vg-trend-stat-val">
              {metric === 'pontualidade' ? `${avg.toFixed(1)}%` : metricConfig.format(total)}
            </strong>
          </div>
          <div className="vg-trend-stat-badge">
            <span className="vg-trend-stat-lbl">Média Diária:</span>
            <strong className="vg-trend-stat-val">
              {metric === 'pontualidade' ? `${avg.toFixed(1)}%` : metricConfig.format(Math.round(avg))}
            </strong>
          </div>
          <div className="vg-trend-stat-badge accent">
            <span className="vg-trend-stat-lbl">Pico:</span>
            <strong className="vg-trend-stat-val">Sexta ({metricConfig.format(WEEK_DATA[5][metric])})</strong>
          </div>
        </div>
      </div>

      {/* ÁREA GRÁFICA SVG */}
      <div className="vg-trend-chart-container">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="vg-trend-svg"
          preserveAspectRatio="none"
          role="img"
          aria-label={metricConfig.title}
        >
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={metricConfig.gradientColor} stopOpacity={isDarkMode ? '0.45' : '0.28'} />
              <stop offset="75%" stopColor={metricConfig.gradientColor} stopOpacity={isDarkMode ? '0.12' : '0.04'} />
              <stop offset="100%" stopColor={metricConfig.gradientColor} stopOpacity="0" />
            </linearGradient>
            <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor={metricConfig.color} floodOpacity={isDarkMode ? '0.5' : '0.25'} />
            </filter>
          </defs>

          {/* LINHAS DE GRADE HORIZONTAIS */}
          {yTicks.map((tick, i) => (
            <g key={i} className="vg-trend-grid-line">
              <line x1={paddingX} y1={tick.y} x2={width - paddingX} y2={tick.y} strokeDasharray="3 4" />
              <text x={paddingX - 10} y={tick.y + 4} textAnchor="end" className="vg-trend-axis-text">
                {metric === 'pontualidade' ? `${Math.round(tick.val)}%` : tick.val.toLocaleString('pt-BR')}
              </text>
            </g>
          ))}

          {/* ÁREA GRADIENTE */}
          <path d={areaD} fill="url(#trendGradient)" />

          {/* LINHA PRINCIPAL DA TENDÊNCIA */}
          <path
            d={pathD}
            fill="none"
            stroke={metricConfig.gradientColor}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#lineGlow)"
          />

          {/* LINHA VERTICAL DE GUIA (HOVER) */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={paddingTop}
              x2={activePoint.x}
              y2={paddingTop + chartH}
              stroke={metricConfig.color}
              strokeWidth="1.5"
              strokeDasharray="4 3"
              opacity="0.8"
            />
          )}

          {/* PONTOS DE DADOS INTERATIVOS */}
          {points.map((pt, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g
                key={pt.data.day}
                className={`vg-trend-point-group ${isHovered ? 'active' : ''}`}
                onMouseEnter={() => setHoveredIdx(i)}
                onClick={() => setHoveredIdx(i)}
                style={{ cursor: 'pointer' }}
                tabIndex={0}
                role="button"
                aria-label={`${pt.data.fullDay}: ${metricConfig.format(pt.val)} ${metricConfig.unit}`}
              >
                {/* Zona de clique invisível ampliada */}
                <circle cx={pt.x} cy={pt.y} r="18" fill="transparent" />

                {/* Halo pulsante no ponto selecionado */}
                {isHovered && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="11"
                    fill={metricConfig.gradientColor}
                    opacity="0.25"
                    className="vg-trend-pulse-halo"
                  />
                )}

                {/* Círculo externo */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? '6.5' : '4.5'}
                  fill={isDarkMode ? '#0F172A' : '#FFFFFF'}
                  stroke={metricConfig.gradientColor}
                  strokeWidth={isHovered ? '3.5' : '2.5'}
                  style={{ transition: 'all 0.15s ease' }}
                />

                {/* Rótulo do dia da semana abaixo do eixo */}
                <text
                  x={pt.x}
                  y={paddingTop + chartH + 20}
                  textAnchor="middle"
                  className={`vg-trend-day-label ${isHovered ? 'highlight' : ''}`}
                >
                  {pt.data.day}
                </text>
              </g>
            );
          })}
        </svg>

        {/* TOOLTIP FLUTUANTE INFORMATIVO */}
        {activePoint && (
          <div
            className="vg-trend-floating-tooltip"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              top: `${(activePoint.y / height) * 100}%`,
            }}
          >
            <div className="vg-trend-tooltip-header">
              <span className="vg-trend-tooltip-day">{activePoint.data.fullDay}</span>
              <span className="vg-trend-tooltip-trips">{activePoint.data.viagens} viagens</span>
            </div>
            <div className="vg-trend-tooltip-body">
              <strong className="vg-trend-tooltip-main-val">
                {metricConfig.format(activePoint.val)}
              </strong>
              <span className="vg-trend-tooltip-unit">{metricConfig.unit}</span>
            </div>
            <div className="vg-trend-tooltip-footer">
              <span>Eficiência: {activePoint.data.pontualidade.toFixed(1)}%</span>
              <span>•</span>
              <span>{activePoint.data.bovinos.toLocaleString('pt-BR')} bovinos</span>
            </div>
          </div>
        )}
      </div>
    </article>
  );
};
