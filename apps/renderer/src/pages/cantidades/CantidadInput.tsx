// Módulo de Ventas / POS
// Componente: CantidadInput
// Adapta el campo de cantidad según el tipo de unidad del producto:
//   - 'unidad' | 'lote'  → enteros, sin decimales
//   - 'peso'   | 'medida' → decimales (2 lugares), muestra la unidad (kg, m, etc.)

import { useRef } from 'react';

// ── Tipos ────────────────────────────────────────────────────────────────────

export type TipoUnidad = 'unidad' | 'lote' | 'peso' | 'medida';

export interface CantidadInputProps {
  /** Tipo de unidad del producto */
  tipoUnidad: TipoUnidad;
  /** Símbolo de la unidad para peso/medida (ej: 'kg', 'm', 'lb', 'ml') */
  unidadSimbolo?: string;
  /** Valor actual de la cantidad */
  valor: number;
  /** Callback cuando cambia el valor */
  onChange: (nuevoValor: number) => void;
  /** Cantidad mínima permitida (default: 0) */
  min?: number;
  /** Cantidad máxima permitida (stock disponible) */
  max?: number;
  /** Deshabilitar el input */
  disabled?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function esDecimal(tipo: TipoUnidad): boolean {
  return tipo === 'peso' || tipo === 'medida';
}

function stepDe(tipo: TipoUnidad): number {
  return esDecimal(tipo) ? 0.01 : 1;
}

function formatearValor(valor: number, tipo: TipoUnidad): string {
  if (esDecimal(tipo)) return valor.toFixed(2);
  return String(Math.round(valor));
}

function etiquetaTipo(tipo: TipoUnidad, simbolo?: string): string {
  switch (tipo) {
    case 'unidad':  return 'und.';
    case 'lote':    return 'lote(s)';
    case 'peso':    return simbolo ?? 'kg';
    case 'medida':  return simbolo ?? 'm';
  }
}

// ── Componente ───────────────────────────────────────────────────────────────

export function CantidadInput({
  tipoUnidad,
  unidadSimbolo,
  valor,
  onChange,
  min = 0,
  max,
  disabled = false,
}: CantidadInputProps) {
  const decimal = esDecimal(tipoUnidad);
  const step    = stepDe(tipoUnidad);
  const etiqueta = etiquetaTipo(tipoUnidad, unidadSimbolo);
  const inputRef = useRef<HTMLInputElement>(null);

  function ajustar(delta: number) {
    const siguiente = parseFloat((valor + delta).toFixed(decimal ? 2 : 0));
    const acotado   = Math.min(
      max !== undefined ? max : Infinity,
      Math.max(min, siguiente),
    );
    onChange(acotado);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === '' || raw === '-') return;

    const parsed = decimal ? parseFloat(raw) : parseInt(raw, 10);
    if (isNaN(parsed)) return;

    const acotado = Math.min(
      max !== undefined ? max : Infinity,
      Math.max(min, parsed),
    );
    onChange(decimal ? parseFloat(acotado.toFixed(2)) : acotado);
  }

  // ── Estilos inline que usan las variables CSS del tema ──────────────────

  const containerStyle: React.CSSProperties = {
    display:        'inline-flex',
    alignItems:     'center',
    gap:            '0',
    border:         '1px solid var(--border-color, #d1d5db)',
    borderRadius:   'var(--radius-md, 8px)',
    overflow:       'hidden',
    background:     disabled ? 'var(--bg-disabled, #f3f4f6)' : 'var(--bg-input, #fff)',
    opacity:        disabled ? 0.55 : 1,
    height:         '38px',
    width:          '100%',
    maxWidth:       '180px',
  };

  const btnStyle: React.CSSProperties = {
    width:           '34px',
    height:          '100%',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    background:      'transparent',
    border:          'none',
    cursor:          disabled ? 'not-allowed' : 'pointer',
    color:           'var(--text-secondary, #6b7280)',
    fontSize:        '16px',
    fontWeight:      600,
    flexShrink:      0,
    transition:      'background 0.15s',
    userSelect:      'none',
  };

  const inputStyle: React.CSSProperties = {
    flex:            1,
    border:          'none',
    outline:         'none',
    textAlign:       'center',
    fontSize:        '14px',
    fontWeight:      600,
    color:           'var(--text-primary, #111827)',
    background:      'transparent',
    width:           0,      // flex controla el ancho
    minWidth:        0,
    padding:         '0 2px',
  };

  const badgeStyle: React.CSSProperties = {
    fontSize:        '11px',
    fontWeight:      500,
    color:           'var(--accent, #2563eb)',
    background:      'var(--accent-muted, #eff6ff)',
    padding:         '2px 6px',
    borderLeft:      '1px solid var(--border-color, #d1d5db)',
    height:          '100%',
    display:         'flex',
    alignItems:      'center',
    whiteSpace:      'nowrap',
    flexShrink:      0,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={containerStyle}>
        {/* Botón decrementar */}
        <button
          type="button"
          aria-label="Disminuir cantidad"
          disabled={disabled || valor <= min}
          onClick={() => ajustar(-step)}
          style={{
            ...btnStyle,
            borderRight: '1px solid var(--border-color, #d1d5db)',
          }}
          onMouseEnter={e => {
            if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover, #f9fafb)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          −
        </button>

        {/* Input numérico */}
        <input
          ref={inputRef}
          type="number"
          inputMode={decimal ? 'decimal' : 'numeric'}
          step={step}
          min={min}
          max={max}
          value={formatearValor(valor, tipoUnidad)}
          onChange={handleChange}
          disabled={disabled}
          aria-label="Cantidad"
          style={inputStyle}
        />

        {/* Badge de unidad */}
        <span style={badgeStyle} title={`Tipo: ${tipoUnidad}`}>
          {etiqueta}
        </span>

        {/* Botón incrementar */}
        <button
          type="button"
          aria-label="Aumentar cantidad"
          disabled={disabled || (max !== undefined && valor >= max)}
          onClick={() => ajustar(step)}
          style={{
            ...btnStyle,
            borderLeft: '1px solid var(--border-color, #d1d5db)',
          }}
          onMouseEnter={e => {
            if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover, #f9fafb)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          +
        </button>
      </div>

      {/* Hint de validación: stock restante */}
      {max !== undefined && (
        <span
          style={{
            fontSize:  '11px',
            color:
              valor >= max
                ? 'var(--danger, #dc2626)'
                : valor >= max * 0.8
                ? 'var(--warning, #d97706)'
                : 'var(--text-secondary, #6b7280)',
          }}
        >
          {valor >= max
            ? 'Límite de stock alcanzado'
            : `Disponible: ${formatearValor(max - valor, tipoUnidad)} ${etiqueta}`}
        </span>
      )}
    </div>
  );
}