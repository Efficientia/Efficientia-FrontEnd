import React from 'react';

interface AdminWelfareGaugeProps {
  score?: number;
  isDarkMode?: boolean;
}

export const AdminWelfareGauge: React.FC<AdminWelfareGaugeProps> = ({
  score = 98.6,
  isDarkMode = false,
}) => {
  // Semi-circle gauge geometry
  const radius = 80;
  const strokeWidth = 16;
  const arcLength = Math.PI * radius; // ~251.32

  const clampedScore = Math.max(0, Math.min(100, score));
  const fillOffset = arcLength - (clampedScore / 100) * arcLength;

  // Needle angle: 0% is -180deg (pointing left), 100% is 0deg (pointing right)
  const angleDeg = -180 + (clampedScore / 100) * 180;

  const indicators = [
    {
      title: 'Taxa de Sobrevivência',
      val: '99,84%',
      target: 'Meta MAPA: > 99,5%',
      status: 'excelente',
      iconDot: '#10B981',
    },
    {
      title: 'Tempo de Espera no Frigorífico',
      val: '28 min',
      target: 'Meta MAPA: < 60 min',
      status: 'otimizado',
      iconDot: '#3B82F6',
    },
    {
      title: 'Densidade Média da Carga',
      val: '412 kg/m²',
      target: 'Faixa segura: 390 - 430 kg/m²',
      status: 'conforme',
      iconDot: '#10B981',
    },
    {
      title: 'Paradas de Descanso & Água',
      val: '100%',
      target: 'Conformidade Lei 13.103',
      status: 'regular',
      iconDot: '#6366F1',
    },
  ];

  return (
    <article className="vg-card vg-admin-gauge-card" aria-label="Score de Bem-Estar Animal e Conformidade Sanitária">
      {/* HEADER DO CARD */}
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
          <span>Excelente</span>
        </div>
      </div>

      {/* ÁREA CENTRAL: GAUGE SEMI-CIRCULAR + INDICADORES */}
      <div className="vg-gauge-body-layout">
        {/* SEMI-CÍRCULO SVG */}
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

            {/* Arco de trilho traseiro */}
            <path
              d="M 20,105 A 80,80 0 0,1 180,105"
              fill="none"
              stroke={isDarkMode ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Arco preenchido com gradiente */}
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

            {/* Agulha / Marcador de Ponto */}
            <g transform={`translate(100, 105) rotate(${angleDeg})`}>
              <line x1="0" y1="0" x2="72" y2="0" stroke={isDarkMode ? '#F8FAFC' : '#1E293B'} strokeWidth="3" strokeLinecap="round" />
              <circle cx="0" cy="0" r="5" fill={isDarkMode ? '#F8FAFC' : '#1E293B'} />
            </g>
          </svg>

          {/* DADOS NUMÉRICOS NO CENTRO DO GAUGE */}
          <div className="vg-gauge-center-data" aria-hidden="true">
            <strong className="vg-gauge-score-number">{clampedScore.toFixed(1)}%</strong>
            <span className="vg-gauge-score-sub">Padrão SIF Atendido</span>
          </div>
        </div>

        {/* LISTA DE INDICADORES DE CONFORMIDADE */}
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
