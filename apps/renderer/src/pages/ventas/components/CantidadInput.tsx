// Módulo de Ventas / POS
// Componente: CantidadInput (T-09B.2)
// Adapta el campo de cantidad según el tipo de unidad del producto:
//   - UNIDAD | CAJA | LOTE → enteros, sin decimales
//   - PESO   | MEDIDA      → decimales (2 lugares), muestra la unidad (lb, m, etc.)

import { useRef, useState } from 'react';
import type { TipoUnidad } from '../../../types';

export interface CantidadInputProps {
  /** Tipo de unidad del producto */
  tipoUnidad: TipoUnidad;
  /** Símbolo de la unidad para peso/medida (ej: 'kg', 'm', 'lb', 'ml') */
  unidadSimbolo?: string;
  /** Valor actual de la cantidad */
  valor: number;
  /** Callback cuando cambia el valor */
  onChange: (nuevoValor: number) => void;
  /** Cantidad mínima permitida (default: 1) */
  min?: number;
  /** Cantidad máxima permitida (stock disponible) */
  max?: number;
  /** Deshabilitar el input */
  disabled?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function esDecimal(tipo: TipoUnidad): boolean {
  return tipo === 'PESO' || tipo === 'MEDIDA';
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
    case 'UNIDAD': return 'und.';
    case 'CAJA':   return 'caja(s)';
    case 'LOTE':   return 'lote(s)';
    case 'PESO':   return simbolo ?? 'lb';
    case 'MEDIDA': return simbolo ?? 'm';
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

  // Estado local para permitir edición libre con teclado
  const [editValue, setEditValue] = useState<string | null>(null);
  const isEditing = editValue !== null;

  function acotar(raw: number): number {
    return Math.min(
      max !== undefined ? max : Infinity,
      Math.max(min, raw),
    );
  }

  function ajustar(delta: number) {
    const siguiente = parseFloat((valor + delta).toFixed(decimal ? 2 : 0));
    onChange(acotar(siguiente));
  }

  function handleFocus() {
    setEditValue(formatearValor(valor, tipoUnidad));
  }

  function handleBlur() {
    if (editValue === null) return;
    const parsed = decimal ? parseFloat(editValue) : parseInt(editValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onChange(acotar(decimal ? parseFloat(parsed.toFixed(2)) : parsed));
    }
    setEditValue(null);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditValue(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  }

  // ── Estilos inline que usan las variables CSS del tema ──────────────────

  const containerStyle: React.CSSProperties = {
    display:        'inline-flex',
    alignItems:     'center',
    gap:            '0',
    border:         '1px solid var(--border)',
    borderRadius:   '8px',
    overflow:       'hidden',
    background:     disabled ? 'var(--bg-surface)' : 'var(--bg-elevated)',
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
    color:           'var(--text-muted)',
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
    color:           'var(--text-primary)',
    background:      'transparent',
    width:           0,
    minWidth:        0,
    padding:         '0 2px',
  };

  const badgeStyle: React.CSSProperties = {
    fontSize:        '11px',
    fontWeight:      500,
    color:           'var(--accent)',
    background:      'var(--accent-glow)',
    padding:         '2px 6px',
    borderLeft:      '1px solid var(--border)',
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
            borderRight: '1px solid var(--border)',
          }}
          onMouseEnter={e => {
            if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
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
          value={isEditing ? editValue : formatearValor(valor, tipoUnidad)}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
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
            borderLeft: '1px solid var(--border)',
          }}
          onMouseEnter={e => {
            if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
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
                ? 'var(--danger)'
                : valor >= max * 0.8
                ? 'var(--warning)'
                : 'var(--text-muted)',
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
