import { useState, type CSSProperties, type ReactNode } from 'react';

interface InputProps {
  label?:       string;
  value:        string;
  onChange:     (val: string) => void;
  type?:        string;
  placeholder?: string;
  error?:       string;
  icon?:        ReactNode;
  suffix?:      ReactNode;
  disabled?:    boolean;
  style?:       CSSProperties;
  rows?:        number;     // si > 0 → textarea
}

export function Input({
  label, value, onChange, type = 'text',
  placeholder, error, icon, suffix, disabled = false, style, rows,
}: InputProps) {
  const [focused, setFocused] = useState(false);

  const inputStyle: CSSProperties = {
    width:        '100%',
    background:   'var(--bg-elevated)',
    border:       `1px solid ${error ? 'var(--danger)' : focused ? 'var(--border-focus)' : 'var(--border)'}`,
    borderRadius: '6px',
    color:        'var(--text-primary)',
    fontSize:     '13px',
    fontFamily:   'inherit',
    outline:      'none',
    boxShadow:    focused ? `0 0 0 3px ${error ? 'rgba(239,68,68,0.1)' : 'var(--accent-glow)'}` : 'none',
    transition:   'all 0.18s ease',
    padding:      icon ? '10px 36px 10px 36px' : suffix ? '10px 36px 10px 12px' : '10px 12px',
    resize:       rows ? 'vertical' : undefined,
    ...style,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{
          fontSize: '10px', fontWeight: 600,
          color: 'var(--text-muted)',
          letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>
          {label}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute', left: '11px', top: '50%',
            transform: 'translateY(-50%)',
            color: focused ? 'var(--accent)' : 'var(--text-subtle)',
            pointerEvents: 'none', transition: 'color 0.18s',
            display: 'flex', alignItems: 'center',
          }}>
            {icon}
          </span>
        )}

        {rows ? (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            style={inputStyle}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            style={inputStyle}
          />
        )}

        {suffix && (
          <span style={{
            position: 'absolute', right: '10px', top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center',
          }}>
            {suffix}
          </span>
        )}
      </div>

      {error && (
        <span style={{ fontSize: '11px', color: 'var(--danger)', animation: 'shake 0.3s ease' }}>
          {error}
        </span>
      )}
    </div>
  );
}