/**
 * CorteCard.tsx
 * T-10.3: Tarjeta visual para cada tipo de corte (X, Y, Z)
 */

import type { TipoCorte } from '../caja.types';

interface CorteCardProps {
  tipo: TipoCorte;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  nota: string;
  notaIcono: 'info' | 'check' | 'warning';
  isDark: boolean;
  onGenerar: () => void;
  soloAdmin?: boolean;
  esAdmin?: boolean;
  deshabilitado?: boolean;
}

const TIPO_COLORES: Record<TipoCorte, { primary: string; light: string; dark: string }> = {
  X: {
    primary: 'var(--accent)',
    light: 'rgba(59,130,246,0.08)',
    dark: 'rgba(59,130,246,0.12)',
  },
  Y: {
    primary: 'var(--success)',
    light: 'rgba(16,185,129,0.08)',
    dark: 'rgba(16,185,129,0.12)',
  },
  Z: {
    primary: 'var(--warning)',
    light: 'rgba(245,158,11,0.08)',
    dark: 'rgba(245,158,11,0.12)',
  },
};

const NOTA_ICONOS: Record<string, string> = {
  info: 'ℹ',
  check: '✓',
  warning: '⚠',
};

export function CorteCard({
  tipo,
  titulo,
  subtitulo,
  descripcion,
  nota,
  notaIcono,
  isDark,
  onGenerar,
  soloAdmin = false,
  esAdmin = false,
  deshabilitado = false,
}: CorteCardProps) {
  const colores = TIPO_COLORES[tipo];
  const bgColor = isDark ? colores.dark : colores.light;

  const handleClick = () => {
    if (!deshabilitado) {
      onGenerar();
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid var(--border)`,
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        cursor: deshabilitado ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        opacity: deshabilitado ? 0.5 : 1,
        transform: deshabilitado ? 'none' : 'translateY(0)',
        pointerEvents: deshabilitado ? 'none' : 'auto',
      }}
      onMouseEnter={e => {
        if (!deshabilitado) {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = colores.primary;
          el.style.boxShadow = `0 0 0 2px ${bgColor}, 0 4px 12px rgba(0,0,0,0.1)`;
          el.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = 'var(--border)';
        el.style.boxShadow = 'none';
        el.style.transform = 'translateY(0)';
      }}
    >
      {/* Encabezado de tarjeta */}
      <div style={{ marginBottom: '16px' }}>
        {/* Badge del tipo */}
        <div
          style={{
            display: 'inline-block',
            background: bgColor,
            color: colores.primary,
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            marginBottom: '12px',
          }}
        >
          {subtitulo}
        </div>

        {/* Título */}
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
            marginBottom: '6px',
          }}
        >
          {titulo}
        </h3>

        {/* Indicador solo admin */}
        {soloAdmin && !esAdmin && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--warning)',
              fontWeight: 500,
            }}
          >
            🔒 Solo administrador
          </div>
        )}
      </div>

      {/* Descripción */}
      <p
        style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          margin: 0,
          marginBottom: '16px',
        }}
      >
        {descripcion}
      </p>

      {/* Nota con icono */}
      <div
        style={{
          background: bgColor,
          border: `1px solid ${colores.primary}20`,
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '16px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            fontSize: '16px',
            flexShrink: 0,
            color: colores.primary,
            marginTop: '2px',
          }}
        >
          {NOTA_ICONOS[notaIcono]}
        </div>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {nota}
        </p>
      </div>

      {/* Botón de generar */}
      <button
        onClick={handleClick}
        disabled={deshabilitado}
        style={{
          width: '100%',
          padding: '10px 16px',
          background: deshabilitado ? 'var(--bg-input)' : colores.primary,
          color: deshabilitado ? 'var(--text-muted)' : 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: deshabilitado ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          opacity: deshabilitado ? 0.5 : 1,
        }}
        onMouseEnter={e => {
          if (!deshabilitado) {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.filter = 'brightness(1.1)';
            btn.style.transform = 'scale(1.02)';
          }
        }}
        onMouseLeave={e => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.filter = 'brightness(1)';
          btn.style.transform = 'scale(1)';
        }}
      >
        {deshabilitado ? 'No disponible' : `Generar Corte ${tipo}`}
      </button>
    </div>
  );
}
