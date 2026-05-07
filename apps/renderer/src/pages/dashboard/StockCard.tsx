import './StockCard.css';

export interface StockCardProps {
  sucursalNombre: string;
  criticos:       number;
  onClick:        () => void;
  loading?:       boolean;
}

export function StockCard({ sucursalNombre, criticos, onClick, loading = false }: StockCardProps) {
  const tieneCriticos = criticos > 0;
  const estadoLabel   = tieneCriticos ? 'Crítico' : 'OK';

  return (
    <div
      onClick={onClick}
      title="Ver página de Stock"
      className={`stock-card ${tieneCriticos ? 'stock-card--danger' : ''} ${loading ? 'stock-card--loading' : ''}`}
    >
      <div className="stock-card__header">
        <div className="stock-card__icon-row">
          <div className={`stock-card__icon ${tieneCriticos ? 'stock-card__icon--danger' : 'stock-card__icon--ok'}`}>
            {tieneCriticos ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                />
                <line x1="12" y1="9" x2="12" y2="13" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="17" x2="12.01" y2="17" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <span className="stock-card__branch">{sucursalNombre}</span>
        </div>

        <span className={`stock-card__badge ${tieneCriticos ? 'stock-card__badge--danger' : 'stock-card__badge--ok'}`}>
          {estadoLabel}
        </span>
      </div>

      <div className="stock-card__subtitle">Stock bajo</div>

      <div className="stock-card__count">
        {loading ? '—' : `${criticos} items`}
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="stock-card stock-card--skeleton">
      <div className="stock-card__header">
        <div className="stock-card__icon-row">
          <div className="skeleton-block skeleton-icon" />
          <div className="skeleton-block skeleton-text" />
        </div>
        <div className="skeleton-block skeleton-badge" />
      </div>
      <div className="skeleton-block skeleton-subtitle" />
      <div className="skeleton-block skeleton-count" />
    </div>
  );
}
