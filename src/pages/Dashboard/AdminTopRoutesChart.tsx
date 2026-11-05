import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from '../../components/icons';
import type { RelatorioViagemResponse } from '../../types/relatorio';

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

interface AdminTopRoutesChartProps {
  isDarkMode?: boolean;
  reports?: readonly RelatorioViagemResponse[];
  fazendaResolver?: (id: number | null | undefined, fallbackName?: string | null) => string;
  frigorificoResolver?: (id: number | null | undefined, fallbackName?: string | null) => string;
}

export const AdminTopRoutesChart: React.FC<AdminTopRoutesChartProps> = ({
  isDarkMode = false,
  reports = [],
  fazendaResolver,
  frigorificoResolver,
}) => {
  const navigate = useNavigate();
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);

  const routesList: readonly RouteCorridor[] = useMemo(() => {
    const valid = (reports ?? []).filter(
      (r) => r && String(r.status ?? '').toLowerCase() !== 'excluido'
    );
    if (valid.length === 0) return [];

    const map = new Map<
      string,
      {
        originName: string;
        destinationName: string;
        bovinos: number;
        trips: number;
        totalKm: number;
        onTimeTrips: number;
      }
    >();

    valid.forEach((r) => {
      const originName = fazendaResolver
        ? fazendaResolver(r.fazendaId)
        : r.fazendaId
        ? `Fazenda #${r.fazendaId}`
        : 'Fazenda de Origem';
      const destinationName = frigorificoResolver
        ? frigorificoResolver(r.unidadeFrigorificaId)
        : r.unidadeFrigorificaId
        ? `Frigorífico #${r.unidadeFrigorificaId}`
        : 'Unidade Frigorífica';

      const key = `${originName}__${destinationName}`;
      const bov =
        r.totalAnimais ??
        (Number(r.quantidadeMachos ?? 0) +
          Number(r.quantidadeFemeas ?? 0) +
          Number(r.quantidadeMarrucos ?? 0));
      const kmVal =
        r.distanciaPercorridaKm != null
          ? Math.max(0, Number(r.distanciaPercorridaKm))
          : r.kmChegadaDesembarcadouro != null && r.kmSaidaEmbarcadouro != null
          ? Math.max(0, Number(r.kmChegadaDesembarcadouro) - Number(r.kmSaidaEmbarcadouro))
          : 0;
      const isOnTime = (r.paradasImprevistas?.length ?? 0) === 0;

      const current = map.get(key) ?? {
        originName,
        destinationName,
        bovinos: 0,
        trips: 0,
        totalKm: 0,
        onTimeTrips: 0,
      };
      current.bovinos += Math.max(0, bov);
      current.trips += 1;
      current.totalKm += kmVal;
      if (isOnTime) current.onTimeTrips += 1;
      map.set(key, current);
    });

    return Array.from(map.entries())
      .map(([key, item], idx) => ({
        id: `cor-${idx}-${key}`,
        originName: item.originName,
        originCity: 'Polo de Embarque',
        destinationName: item.destinationName,
        destinationCity: 'Unidade SIF',
        bovinos: item.bovinos,
        trips: item.trips,
        distanceKm: item.trips > 0 ? Math.round(item.totalKm / item.trips) : 0,
        onTimePct: item.trips > 0 ? Number(((item.onTimeTrips / item.trips) * 100).toFixed(1)) : 100,
      }))
      .sort((a, b) => b.bovinos - a.bovinos || b.trips - a.trips)
      .slice(0, 5);
  }, [reports, fazendaResolver, frigorificoResolver]);

  const maxBovinos = routesList.length > 0 ? Math.max(...routesList.map((r) => r.bovinos), 1) : 1;

  return (
    <article className="vg-card vg-admin-routes-card" aria-label="Principais Corredores Logísticos">
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

      <div className="vg-routes-list-body">
        {routesList.length === 0 ? (
          <p className="vg-queue-empty-text" style={{ padding: '24px 0', textAlign: 'center' }}>
            Nenhum corredor de transporte registrado nos diários de viagem desta empresa.
          </p>
        ) : (
          routesList.map((route, index) => {
            const isHovered = activeRouteId === route.id;
            const barWidthPct = Math.max(4, Math.round((route.bovinos / maxBovinos) * 100));

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
                <span className={`vg-route-rank-badge ${index === 0 ? 'first' : ''}`}>
                  0{index + 1}
                </span>

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

                <div className="vg-route-metrics-col">
                  <strong className="vg-route-metric-bovinos">
                    {route.bovinos.toLocaleString('pt-BR')} <span className="vg-unit">cab</span>
                  </strong>
                  <div className="vg-route-submetrics">
                    <span>{route.trips} {route.trips === 1 ? 'viagem' : 'viagens'}</span>
                    <span>•</span>
                    <span>{route.distanceKm} km</span>
                    <span>•</span>
                    <span className="vg-route-sla-pill">{route.onTimePct}% SLA</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
};
