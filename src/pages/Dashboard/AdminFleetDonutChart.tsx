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
  totalVehicles = 0,
  inTransitCount = 0,
  isDarkMode = false,
}) => {
  const navigate = useNavigate();
  const [activeSliceId, setActiveSliceId] = useState<string | null>(null);

  const slices: readonly FleetSlice[] = useMemo(() => {
    const total = Math.max(0, totalVehicles);
    const inTransit = Math.min(total, Math.max(0, inTransitCount));
    const remaining = Math.max(0, total - inTransit);
    const inMaintenance = total >= 4 ? Math.min(remaining, Math.max(1, Math.floor(total * 0.07))) : 0;
    const inLoading = total >= 4 ? Math.min(remaining - inMaintenance, Math.max(1, Math.floor(total * 0.07))) : 0;
    const available = Math.max(0, total - inTransit - inMaintenance - inLoading);

    const pct = (val: number) => (total > 0 ? Math.round((val / total) * 1000) / 10 : 0);

    return [
      {
        id: 'transito',
        label: 'Em Trânsito',
        count: inTransit,
        percentage: pct(inTransit),
        color: '#0F51AE',
        darkColor: '#3B82F6',
        description: 'Caminhões em rota ativa com carga viva',
      },
      {
        id: 'disponivel',
        label: 'Disponível no Pátio',
        count: available,
        percentage: pct(available),
        color: '#10B981',
        darkColor: '#34D399',
        description: 'Prontos para nova escala de viagem',
      },
      {
        id: 'carregando',
        label: 'Embarque/Descarga',
        count: inLoading,
        percentage: pct(inLoading),
        color: '#6366F1',
        darkColor: '#818CF8',
        description: 'Aguardando liberação de curral',
      },
      {
        id: 'manutencao',
        label: 'Revisão / Manutenção',
        count: inMaintenance,
        percentage: pct(inMaintenance),
        color: '#F59E0B',
        darkColor: '#FBBF24',
        description: 'Manutenção preventiva programada',
      },
    ];
  }, [totalVehicles, inTransitCount]);

  const total = useMemo(() => slices.reduce((acc, s) => acc + s.count, 0), [slices]);
  const activeFleetPct = useMemo(() => {
    if (total <= 0) return '0,0%';
    const maint = slices.find((s) => s.id === 'manutencao')?.count ?? 0;
    return `${(((total - maint) / total) * 100).toFixed(1).replace('.', ',')}%`;
  }, [slices, total]);

  const radius = 68;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  const renderedSlices = useMemo(() => {
    if (total <= 0) return [];
    let currentOffset = 0;
    return slices
      .filter((s) => s.count > 0)
      .map((slice) => {
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
  const maxCapacityCabecas = total * 80;
  const usedCapacityCabecas = Math.min(maxCapacityCabecas, inTransitCount * 80);
  const capacityPct = maxCapacityCabecas > 0 ? Math.round((usedCapacityCabecas / maxCapacityCabecas) * 1000) / 10 : 0;

  return (
    <article className="vg-card vg-admin-donut-card" aria-label="Alocação e Prontidão da Frota">
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

      <div className="vg-donut-content-row">
        <div className="vg-donut-chart-wrapper">
          <svg
            viewBox="0 0 200 200"
            className="vg-donut-svg"
            role="img"
            aria-label="Gráfico de distribuição da frota"
          >
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={isDarkMode ? 'rgba(255,255,255,0.06)' : '#E2E8F0'}
              strokeWidth={strokeWidth}
            />

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
                <span className="vg-donut-center-sub">{activeFleetPct} Ativa</span>
              </>
            )}
          </div>
        </div>

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

      <div className="vg-donut-capacity-footer">
        <div className="vg-capacity-header-row">
          <span className="vg-capacity-label">Capacidade Instantânea da Frota</span>
          <strong className="vg-capacity-val">
            {usedCapacityCabecas.toLocaleString('pt-BR')} / {maxCapacityCabecas.toLocaleString('pt-BR')} cabeças ({capacityPct.toFixed(1).replace('.', ',')}%)
          </strong>
        </div>
        <div className="vg-capacity-track" aria-hidden="true">
          <div className="vg-capacity-fill" style={{ width: `${capacityPct}%` }} />
        </div>
      </div>
    </article>
  );
};
