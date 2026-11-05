import React, { useMemo } from 'react';
import type { RelatorioViagemResponse } from '../../types/relatorio';

interface AdminWelfareGaugeProps {
  score?: number;
  isDarkMode?: boolean;
  reports?: readonly RelatorioViagemResponse[];
}

export const AdminWelfareGauge: React.FC<AdminWelfareGaugeProps> = ({
  score,
  isDarkMode = false,
  reports = [],
}) => {
  const computedMetrics = useMemo(() => {
    const valid = (reports ?? []).filter(
      (r) => r && String(r.status ?? '').toLowerCase() !== 'excluido'
    );
    if (valid.length === 0) {
      return {
        hasReports: false,
        score: score ?? 0,
        survivalStr: '0,00%',
        avgDurationStr: '0 min',
        emPeTotalStr: '0 cab',
        stopsComplianceStr: '0%',
      };
    }

    let totalBovinos = 0;
    let totalMortos = 0;
    let totalEmPe = 0;
    let totalDurationMin = 0;
    let tripsWithoutStops = 0;

    valid.forEach((r) => {
      const mortos = Math.max(0, Number(r.quantidadeMorto ?? 0));
      const deitados = Math.max(0, Number(r.quantidadeDeitado ?? 0));
      const emergencia = Math.max(0, Number(r.quantidadeEmergencia ?? 0));
      const rawTotal =
        r.totalAnimais ??
        (Number(r.quantidadeMachos ?? 0) +
          Number(r.quantidadeFemeas ?? 0) +
          Number(r.quantidadeMarrucos ?? 0));
      const emPe =
        r.quantidadeEmPe != null
          ? Math.max(0, Number(r.quantidadeEmPe))
          : Math.max(0, rawTotal - mortos - deitados - emergencia);
      const bov = Math.max(rawTotal, emPe + mortos + deitados + emergencia);

      totalBovinos += bov;
      totalMortos += mortos;
      totalEmPe += emPe;
      totalDurationMin += Math.max(0, Number(r.duracaoViagemMinutos ?? 0));
      if ((r.paradasImprevistas?.length ?? 0) === 0) {
        tripsWithoutStops += 1;
      }
    });

    const survivalPct =
      totalBovinos > 0 ? ((totalBovinos - totalMortos) / totalBovinos) * 100 : 100;
    const integrityPct =
      totalBovinos > 0 ? (totalEmPe / totalBovinos) * 100 : 100;
    const stopsPct = (tripsWithoutStops / valid.length) * 100;
    const avgDuration = Math.round(totalDurationMin / valid.length);

    return {
      hasReports: true,
      score: score ?? Number(integrityPct.toFixed(1)),
      survivalStr: `${survivalPct.toFixed(2).replace('.', ',')}%`,
      avgDurationStr: `${avgDuration} min`,
      emPeTotalStr: `${totalEmPe.toLocaleString('pt-BR')} cab`,
      stopsComplianceStr: `${Math.round(stopsPct)}%`,
    };
  }, [reports, score]);

  const radius = 80;
  const strokeWidth = 16;
  const arcLength = Math.PI * radius;

  const clampedScore = Math.max(0, Math.min(100, computedMetrics.score));
  const fillOffset = arcLength - (clampedScore / 100) * arcLength;
  const angleDeg = -180 + (clampedScore / 100) * 180;

  const indicators = [
    {
      title: 'Taxa de Sobrevivência',
      val: computedMetrics.survivalStr,
      target: 'Meta MAPA: > 99,5%',
      iconDot: '#10B981',
    },
    {
      title: 'Duração Média de Viagem',
      val: computedMetrics.avgDurationStr,
      target: 'Monitoramento de rota',
      iconDot: '#3B82F6',
    },
    {
      title: 'Bovinos Íntegros (Em Pé)',
      val: computedMetrics.emPeTotalStr,
      target: 'Conferência de desembarque',
      iconDot: '#10B981',
    },
    {
      title: 'Viagens Sem Paradas Críticas',
      val: computedMetrics.stopsComplianceStr,
      target: 'Conformidade Lei 13.103',
      iconDot: '#6366F1',
    },
  ];

  return (
    <article className="vg-card vg-admin-gauge-card" aria-label="Score de Bem-Estar Animal e Conformidade Sanitária">
      <div className="vg-admin-card-header">
        <div className="vg-admin-header-titles">
          <div className="vg-admin-tag-pill teal">Conformidade Sanitária</div>
          <h3 className="vg-admin-card-title">Score de Bem-Estar Animal</h3>
          <p className="vg-admin-card-subtitle">
            Índice de conformidade técnica segundo os padrões MAPA e auditoria SIF
          </p>
        </div>
        <div className="vg-gauge-status-badge">
          <span className="vg-gauge-status-dot" />
          <span>{computedMetrics.hasReports ? 'Monitorado' : 'Sem Viagens'}</span>
        </div>
      </div>

      <div className="vg-gauge-body-layout">
        <div className="vg-gauge-svg-wrapper">
          <svg
            viewBox="0 0 200 120"
            className="vg-gauge-svg"
            role="img"
            aria-label={`Índice de Bem-Estar Animal: ${clampedScore.toFixed(1)}%`}
          >
            <defs>
              <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="60%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>

            <path
              d="M 20,105 A 80,80 0 0,1 180,105"
              fill="none"
              stroke={isDarkMode ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            <path
              d="M 20,105 A 80,80 0 0,1 180,105"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={arcLength}
              strokeDashoffset={fillOffset}
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />

            <g transform={`translate(100, 105) rotate(${angleDeg})`}>
              <line x1="0" y1="0" x2="72" y2="0" stroke={isDarkMode ? '#F8FAFC' : '#1E293B'} strokeWidth="3" strokeLinecap="round" />
              <circle cx="0" cy="0" r="5" fill={isDarkMode ? '#F8FAFC' : '#1E293B'} />
            </g>
          </svg>

          <div className="vg-gauge-center-data" aria-hidden="true">
            <strong className="vg-gauge-score-number">{clampedScore.toFixed(1)}%</strong>
            <span className="vg-gauge-score-sub">
              {computedMetrics.hasReports ? 'Padrão SIF Atendido' : 'Sem diários registrados'}
            </span>
          </div>
        </div>

        <div className="vg-gauge-indicators-grid">
          {indicators.map((item, idx) => (
            <div key={idx} className="vg-gauge-metric-item">
              <div className="vg-gauge-metric-top">
                <span className="vg-gauge-dot" style={{ backgroundColor: item.iconDot }} />
                <span className="vg-gauge-metric-title">{item.title}</span>
              </div>
              <div className="vg-gauge-metric-bottom">
                <strong className="vg-gauge-metric-val">{item.val}</strong>
                <span className="vg-gauge-metric-target">{item.target}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
};
