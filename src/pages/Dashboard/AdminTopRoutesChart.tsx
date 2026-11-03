import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from '../../components/icons';

export interface RouteCorridor {
  id: string;
  originName: string;
  originCity: string;
  destinationName: string;
  destinationCity: string;
  bovinos: number;
  trips: number;
  distanceKm: number;
  onTimePct: number;
}

const TOP_ROUTES: readonly RouteCorridor[] = [
  {
    id: 'cor-1',
    originName: 'Fazenda Boi Gordo',
    originCity: 'Barra do Garças (MT)',
    destinationName: 'JBS SIF 450',
    destinationCity: 'Campo Grande (MS)',
    bovinos: 1420,
    trips: 14,
    distanceKm: 380,
    onTimePct: 98.4,
  },
  {
    id: 'cor-2',
    originName: 'Fazenda Santa Maria',
    originCity: 'Rondonópolis (MT)',
    destinationName: 'Marfrig SIF 112',
    destinationCity: 'Várzea Grande (MT)',
    bovinos: 1180,
    trips: 11,
    distanceKm: 215,
    onTimePct: 96.8,
  },
  {
    id: 'cor-3',
    originName: 'Agropecuária Alvorada',
    originCity: 'Rio Verde (GO)',
    destinationName: 'Minerva Foods SIF 82',
    destinationCity: 'Palmeiras de Goiás (GO)',
    bovinos: 890,
    trips: 9,
    distanceKm: 190,
    onTimePct: 100.0,
  },
  {
    id: 'cor-4',
    originName: 'Fazenda Três Barras',
    originCity: 'Dourados (MS)',
    destinationName: 'Friboi SIF 230',
    destinationCity: 'Naviraí (MS)',
    bovinos: 640,
    trips: 6,
    distanceKm: 145,
    onTimePct: 97.2,
  },
  {
    id: 'cor-5',
    originName: 'Estância São Jorge',
    originCity: 'Paranavaí (PR)',
    destinationName: 'Frigorífico Silva SIF 58',
    destinationCity: 'Maringá (PR)',
    bovinos: 460,
    trips: 4,
    distanceKm: 110,
    onTimePct: 99.0,
  },
];

interface AdminTopRoutesChartProps {
  isDarkMode?: boolean;
}

export const AdminTopRoutesChart: React.FC<AdminTopRoutesChartProps> = ({ isDarkMode = false }) => {
  const navigate = useNavigate();
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);

  const maxBovinos = TOP_ROUTES[0].bovinos;

  return (
    <article className="vg-card vg-admin-routes-card" aria-label="Principais Corredores Logísticos">
      {/* HEADER DO CARD */}
      <div className="vg-admin-card-header">
        <div className="vg-admin-header-titles">
          <div className="vg-admin-tag-pill purple">Fluxo Logístico</div>
          <h3 className="vg-admin-card-title">Principais Corredores de Transporte</h3>
          <p className="vg-admin-card-subtitle">
            Rotas com maior volume de animais entre fazendas parceiras e frigoríficos SIF
          </p>
        </div>
        <button
          type="button"
          className="vg-analyze-link"
          onClick={() => navigate('/fazenda-unidades')}
          title="Ver cadastro de fazendas e unidades frigoríficas"
        >
          <span>Polos →</span>
        </button>
      </div>

      {/* LISTA DE ROTAS COM BARRAS HORIZONTAIS */}
      <div className="vg-routes-list-body">
        {TOP_ROUTES.map((route, index) => {
          const isHovered = activeRouteId === route.id;
          const barWidthPct = Math.round((route.bovinos / maxBovinos) * 100);

          return (
            <div
              key={route.id}
              className={`vg-route-row-item ${isHovered ? 'active' : ''}`}
              onMouseEnter={() => setActiveRouteId(route.id)}
              onMouseLeave={() => setActiveRouteId(null)}
              role="button"
              tabIndex={0}
              aria-label={`Rota ${index + 1}: ${route.originName} para ${route.destinationName}, ${route.bovinos} bovinos transportados`}
            >
              {/* POSIÇÃO DO RANKING */}
              <span className={`vg-route-rank-badge ${index === 0 ? 'first' : ''}`}>
                0{index + 1}
              </span>

              {/* DETALHES DA ROTA */}
              <div className="vg-route-details-col">
                <div className="vg-route-names-row">
                  <div className="vg-route-origin-block">
                    <strong className="vg-route-point-name">{route.originName}</strong>
                    <span className="vg-route-point-city">{route.originCity}</span>
                  </div>

                  <span className="vg-route-arrow-sep" aria-hidden="true">
                    <ArrowRightIcon size={12} />
                  </span>

                  <div className="vg-route-dest-block">
                    <strong className="vg-route-point-name">{route.destinationName}</strong>
                    <span className="vg-route-point-city">{route.destinationCity}</span>
                  </div>
                </div>

                {/* BARRA HORIZONTAL DE PROGRESSO COM GRADIENTE */}
                <div className="vg-route-bar-track">
                  <div
                    className="vg-route-bar-fill"
                    style={{
                      width: `${barWidthPct}%`,
                      background: isDarkMode
                        ? 'linear-gradient(90deg, #2563EB 0%, #38BDF8 100%)'
                        : 'linear-gradient(90deg, #0F51AE 0%, #3B82F6 100%)',
                    }}
                  />
                </div>
              </div>

              {/* MÉTRICAS DA ROTA À DIREITA */}
              <div className="vg-route-metrics-col">
                <strong className="vg-route-metric-bovinos">
                  {route.bovinos.toLocaleString('pt-BR')} <span className="vg-unit">cab</span>
                </strong>
                <div className="vg-route-submetrics">
                  <span>{route.trips} viagens</span>
                  <span>•</span>
                  <span>{route.distanceKm} km</span>
                  <span>•</span>
                  <span className="vg-route-sla-pill">{route.onTimePct}% SLA</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
};
