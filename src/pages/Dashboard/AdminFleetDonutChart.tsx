import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export interface FleetSlice {
  id: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
  darkColor: string;
  description: string;
}

interface AdminFleetDonutChartProps {
  totalVehicles?: number;
  inTransitCount?: number;
  isDarkMode?: boolean;
}

export const AdminFleetDonutChart: React.FC<AdminFleetDonutChartProps> = ({
  totalVehicles = 28,
  inTransitCount = 18,
  isDarkMode = false,
}) => {
  const navigate = useNavigate();
  const [activeSliceId, setActiveSliceId] = useState<string | null>(null);

  // Derive fleet distribution
  const slices: readonly FleetSlice[] = useMemo(() => {
    const total = totalVehicles > 0 ? totalVehicles : 28;
    const inTransit = inTransitCount > 0 ? inTransitCount : 18;
    const inMaintenance = 2;
    const inLoading = 2;
    const available = Math.max(0, total - inTransit - inMaintenance - inLoading);

    return [
      {
        id: 'transito',
        label: 'Em Trânsito',
        count: inTransit,
        percentage: Math.round((inTransit / total) * 1000) / 10,
        color: '#0F51AE',
        darkColor: '#3B82F6',
        description: 'Caminhões em rota ativa com carga viva',
      },
      {
        id: 'disponivel',
        label: 'Disponível no Pátio',
        count: available,
        percentage: Math.round((available / total) * 1000) / 10,
        color: '#10B981',
        darkColor: '#34D399',
        description: 'Prontos para nova escala de viagem',
      },
      {
        id: 'carregando',
        label: 'Embarque/Descarga',
        count: inLoading,
        percentage: Math.round((inLoading / total) * 1000) / 10,
        color: '#6366F1',
        darkColor: '#818CF8',
        description: 'Aguardando liberação de curral',
      },
      {
        id: 'manutencao',
        label: 'Revisão / Manutenção',
        count: inMaintenance,
        percentage: Math.round((inMaintenance / total) * 1000) / 10,
        color: '#F59E0B',
        darkColor: '#FBBF24',
        description: 'Manutenção preventiva programada',
      },
    ];
  }, [totalVehicles, inTransitCount]);

  const total = useMemo(() => slices.reduce((acc, s) => acc + s.count, 0), [slices]);

  // Donut geometry calculations
  const radius = 68;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  // Compute stroke offsets for each slice
  const renderedSlices = useMemo(() => {
    let currentOffset = 0;
    return slices.map((slice) => {
      const sliceLength = (slice.count / total) * circumference;
      const strokeDasharray = `${Math.max(1, sliceLength - 2)} ${circumference - sliceLength + 2}`;
      const strokeDashoffset = -currentOffset;
      currentOffset += sliceLength;
      return {
        ...slice,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [slices, total, circumference]);

  const activeSlice = activeSliceId ? slices.find((s) => s.id === activeSliceId) : null;

  return (
    <article className="vg-card vg-admin-donut-card" aria-label="Alocação e Prontidão da Frota">
      {/* HEADER DO CARD */}
      <div className="vg-admin-card-header">
        <div className="vg-admin-header-titles">
          <div className="vg-admin-tag-pill green">Status da Frota</div>
          <h3 className="vg-admin-card-title">Alocação e Prontidão</h3>
          <p className="vg-admin-card-subtitle">
            Disponibilidade imediata e ocupação operacional dos cavalos e carretas
          </p>
        </div>
        <button
          type="button"
          className="vg-analyze-link"
          onClick={() => navigate('/frota')}
          title="Abrir gestão completa da frota"
        >
          <span>Frota →</span>
        </button>
      </div>

      {/* ÁREA CENTRAL: DONUT SVG + LEGENDA */}
      <div className="vg-donut-content-row">
        {/* GRÁFICO DE ROSCA SVG */}
        <div className="vg-donut-chart-wrapper">
          <svg
            viewBox="0 0 200 200"
            className="vg-donut-svg"
            role="img"
            aria-label="Gráfico de distribuição da frota"
          >
            {/* Círculo de fundo do trilho */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={isDarkMode ? 'rgba(255,255,255,0.06)' : '#E2E8F0'}
              strokeWidth={strokeWidth}
            />

            {/* Segmentos de arco da rosca */}
            <g transform="rotate(-90 100 100)">
              {renderedSlices.map((slice) => {
                const isHovered = activeSliceId === slice.id;
                return (
                  <circle
                    key={slice.id}
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke={isDarkMode ? slice.darkColor : slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    strokeLinecap="round"
                    className={`vg-donut-slice ${isHovered ? 'active' : ''}`}
                    onMouseEnter={() => setActiveSliceId(slice.id)}
                    onMouseLeave={() => setActiveSliceId(null)}
                    style={{
                      cursor: 'pointer',
                      transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                      opacity: activeSliceId && !isHovered ? 0.45 : 1,
                    }}
                  />
                );
              })}
            </g>
          </svg>

          {/* TEXTO INFORMATIVO NO CENTRO DA ROSCA */}
          <div className="vg-donut-center-info" aria-hidden="true">
            {activeSlice ? (
              <>
                <strong className="vg-donut-center-number" style={{ color: isDarkMode ? activeSlice.darkColor : activeSlice.color }}>
                  {activeSlice.count}
                </strong>
                <span className="vg-donut-center-label">{activeSlice.label}</span>
                <span className="vg-donut-center-pct">{activeSlice.percentage}%</span>
              </>
            ) : (
              <>
                <strong className="vg-donut-center-number">{total}</strong>
                <span className="vg-donut-center-label">Caminhões</span>
                <span className="vg-donut-center-sub">85,7% Ativa</span>
              </>
            )}
          </div>
        </div>

        {/* LEGENDA INTERATIVA LATERAL */}
        <div className="vg-donut-legend">
          {slices.map((slice) => {
            const isHovered = activeSliceId === slice.id;
            return (
              <div
                key={slice.id}
                className={`vg-donut-legend-item ${isHovered ? 'active' : ''}`}
                onMouseEnter={() => setActiveSliceId(slice.id)}
                onMouseLeave={() => setActiveSliceId(null)}
                onClick={() => setActiveSliceId(slice.id === activeSliceId ? null : slice.id)}
                role="button"
                tabIndex={0}
                aria-label={`${slice.label}: ${slice.count} veículos (${slice.percentage}%)`}
              >
                <div className="vg-donut-legend-left">
                  <span
                    className="vg-donut-legend-color-dot"
                    style={{ backgroundColor: isDarkMode ? slice.darkColor : slice.color }}
                  />
                  <div className="vg-donut-legend-texts">
                    <strong className="vg-donut-legend-title">{slice.label}</strong>
                    <span className="vg-donut-legend-desc">{slice.description}</span>
                  </div>
                </div>
                <div className="vg-donut-legend-right">
                  <strong className="vg-donut-legend-count">{slice.count}</strong>
                  <span className="vg-donut-legend-pct">{slice.percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RODAPÉ: BARRA DE CAPACIDADE DE CARGA VIVA */}
      <div className="vg-donut-capacity-footer">
        <div className="vg-capacity-header-row">
          <span className="vg-capacity-label">Capacidade Instantânea da Frota</span>
          <strong className="vg-capacity-val">1.840 / 2.200 cabeças (83,6%)</strong>
        </div>
        <div className="vg-capacity-track" aria-hidden="true">
          <div className="vg-capacity-fill" style={{ width: '83.6%' }} />
        </div>
      </div>
    </article>
  );
};
