import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

interface Categoria {
  id: number;
  nombre: string;
  descripcion: string;
  estado: 'Activo' | 'Inactivo';
  nProductos: number;
}

interface FormState {
  nombre: string;
  descripcion: string;
  estado: 'Activo' | 'Inactivo';
}

interface FormErrors {
  nombre?: string;
  descripcion?: string;
}

type ModalMode = 'nueva' | 'modificar' | 'eliminar' | null;

const SEED: Categoria[] = [
  { id: 1, nombre: 'Herramientas Manuales', descripcion: 'Martillos, llaves, destornilladores', estado: 'Activo', nProductos: 142 },
  { id: 2, nombre: 'Electricidad', descripcion: 'Cables, interruptores, tomacorrientes', estado: 'Activo', nProductos: 89 },
  { id: 3, nombre: 'Fontaneria', descripcion: 'Tuberias, llaves de agua, accesorios PVC', estado: 'Activo', nProductos: 76 },
  { id: 4, nombre: 'Materiales de Construccion', descripcion: 'Cemento, arena, varillas, bloques', estado: 'Activo', nProductos: 213 },
  { id: 5, nombre: 'Pintura', descripcion: 'Pinturas, brochas, rodillos, diluyentes', estado: 'Inactivo', nProductos: 55 },
];

const NAV = [
  { label: 'Dashboard', icon: '⊞' },
  { label: 'Inventario', icon: '▤' },
  { label: 'Categorias', icon: '⊟', active: true },
  { label: 'Ventas', icon: '◈' },
  { label: 'Usuarios', icon: '◉' },
  { label: 'Configuracion', icon: '⚙' },
];

const EMPTY_FORM: FormState = { nombre: '', descripcion: '', estado: 'Activo' };

function validate(form: FormState, all: Categoria[], editId?: number): FormErrors {
  const e: FormErrors = {};
  if (!form.nombre.trim()) {
    e.nombre = 'El nombre es requerido.';
  } else if (form.nombre.trim().length < 3) {
    e.nombre = 'Minimo 3 caracteres.';
  } else {
    const dup = all.find(
      (c) => c.nombre.toLowerCase() === form.nombre.trim().toLowerCase() && c.id !== editId
    );
    if (dup) e.nombre = 'Ya existe una categoria con ese nombre.';
  }
  if (!form.descripcion.trim()) e.descripcion = 'La descripcion es requerida.';
  return e;
}

function StatusBadge({ estado }: { estado: 'Activo' | 'Inactivo' }) {
  const active = estado === 'Activo';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        background: active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
        color: active ? '#4ade80' : '#f87171',
        border: `1px solid ${active ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
        letterSpacing: 0.5,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: active ? '#4ade80' : '#f87171',
          flexShrink: 0,
        }}
      />
      {estado}
    </span>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

function Modal({ open, onClose, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(5,8,15,0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#0f1621',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          width: '100%',
          maxWidth: 460,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          animation: 'modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface ToastData {
  msg: string;
  type: 'success' | 'error';
}

function Toast({ data }: { data: ToastData | null }) {
  if (!data) return null;
  const ok = data.type === 'success';
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 200,
        padding: '12px 18px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        background: ok ? '#0f2d1a' : '#2d0f0f',
        color: ok ? '#4ade80' : '#f87171',
        border: `1px solid ${ok ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        animation: 'slideUp 0.25s ease',
      }}
    >
      <span style={{ fontSize: 15 }}>{ok ? '✓' : '✕'}</span>
      {data.msg}
    </div>
  );
}

interface ActionBtnProps {
  icon: string;
  label: string;
  variant: 'primary' | 'secondary' | 'danger';
  onClick: () => void;
  disabled?: boolean;
}

function ActionBtn({ icon, label, variant, onClick, disabled = false }: ActionBtnProps) {
  const styles: Record<ActionBtnProps['variant'], CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg,#3b82f6,#2563eb)',
      color: '#fff',
      border: 'none',
      boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
    },
    secondary: {
      background: 'rgba(255,255,255,0.04)',
      color: disabled ? '#334155' : '#94a3b8',
      border: '1px solid rgba(255,255,255,0.08)',
    },
    danger: {
      background: disabled ? 'rgba(220,38,38,0.04)' : 'rgba(220,38,38,0.1)',
      color: disabled ? '#334155' : '#f87171',
      border: `1px solid ${disabled ? 'rgba(255,255,255,0.04)' : 'rgba(248,113,113,0.25)'}`,
    },
  };

  return (
    <button
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 16px',
        borderRadius: 7,
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.15s',
        ...styles[variant],
      }}
      onMouseOver={(e) => {
        if (!disabled) e.currentTarget.style.opacity = '0.85';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.opacity = disabled ? '0.5' : '1';
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      {label}
    </button>
  );
}

export default function CategoriasCRUDPage() {
  const [rows, setRows] = useState<Categoria[]>(SEED);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Categoria | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [toast, setToast] = useState<ToastData | null>(null);
  const [nextId, setNextId] = useState(SEED.length + 1);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = (msg: string, type: ToastData['type'] = 'success') => setToast({ msg, type });

  const openNueva = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setSelected(null);
    setMode('nueva');
  };

  const openModificar = () => {
    if (!selected) return;
    setForm({ nombre: selected.nombre, descripcion: selected.descripcion, estado: selected.estado });
    setErrors({});
    setMode('modificar');
  };

  const openEliminar = () => {
    if (!selected) return;
    setMode('eliminar');
  };

  const closeModal = () => setMode(null);

  const handleSave = () => {
    const errs = validate(form, rows, mode === 'modificar' ? selected?.id : undefined);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    if (mode === 'nueva') {
      const nuevo: Categoria = {
        id: nextId,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        estado: form.estado,
        nProductos: 0,
      };
      setRows((prev) => [...prev, nuevo]);
      setNextId((n) => n + 1);
      setSelected(nuevo);
      notify('Categoria creada correctamente.');
    } else if (mode === 'modificar' && selected) {
      const updated: Categoria = {
        ...selected,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        estado: form.estado,
      };
      setRows((prev) => prev.map((r) => (r.id === selected.id ? updated : r)));
      setSelected(updated);
      notify('Categoria actualizada correctamente.');
    }
    closeModal();
  };

  const handleDelete = () => {
    if (!selected) return;
    setRows((prev) => prev.filter((r) => r.id !== selected.id));
    notify(`"${selected.nombre}" eliminada.`, 'error');
    setSelected(null);
    closeModal();
  };

  const filtered = rows.filter(
    (r) =>
      r.nombre.toLowerCase().includes(search.toLowerCase()) ||
      r.descripcion.toLowerCase().includes(search.toLowerCase())
  );

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const inputStyle = (hasError?: string): CSSProperties => ({
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${hasError ? '#f87171' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 6,
    padding: '10px 13px',
    color: '#e2e8f0',
    fontFamily: 'inherit',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  });

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#080d15',
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        color: '#cbd5e1',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes modalIn {
          from { opacity:0; transform:scale(0.94) translateY(12px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes slideUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        input::placeholder, textarea::placeholder { color: rgba(148,163,184,0.45); }
        select option { background:#0f1621; color:#e2e8f0; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#1e293b; border-radius:3px; }
      `}</style>

      <aside
        style={{
          width: 220,
          flexShrink: 0,
          background: '#0b1120',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          padding: '0 0 24px',
        }}
      >
        <div
          style={{
            padding: '20px 20px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                color: '#fff',
                fontWeight: 800,
              }}
            >
              K
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', letterSpacing: 0.3 }}>FERREPRO</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>Administrador</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '0 10px' }}>
          {NAV.map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 7,
                marginBottom: 2,
                cursor: 'pointer',
                background: item.active ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: item.active ? '#60a5fa' : '#64748b',
                fontWeight: item.active ? 600 : 400,
                fontSize: 13,
                transition: 'all 0.15s',
                borderLeft: item.active ? '2px solid #3b82f6' : '2px solid transparent',
              }}
            >
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            padding: '14px 28px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            background: '#0b1120',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Panel de Categorias</div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#475569',
                fontSize: 13,
                pointerEvents: 'none',
              }}
            >
              ⌕
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar categoria..."
              style={{
                ...inputStyle(),
                paddingLeft: 30,
                width: 220,
                height: 34,
                fontSize: 12,
              }}
              onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>
        </header>

        <main style={{ flex: 1, padding: '28px 28px', overflowY: 'auto' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Gestion de Categorias</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
              Organiza y clasifica los productos de la ferreteria por grandes grupos.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
            <ActionBtn icon="+" label="Nueva" variant="primary" onClick={openNueva} />
            <ActionBtn icon="✎" label="Modificar" variant="secondary" onClick={openModificar} disabled={!selected} />
            <ActionBtn icon="⊗" label="Eliminar" variant="danger" onClick={openEliminar} disabled={!selected} />
          </div>

          <div
            style={{
              background: '#0b1120',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {['#', 'NOMBRE DE CATEGORIA', 'DESCRIPCION', 'N DE PRODUCTOS', 'ESTADO'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '11px 16px',
                        textAlign: 'left',
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#475569',
                        letterSpacing: 0.8,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: '#475569', fontSize: 13 }}>
                      No se encontraron categorias.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => {
                    const isSelected = selected?.id === row.id;
                    const isHovered = hoveredRow === row.id;
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelected(isSelected ? null : row)}
                        onMouseEnter={() => setHoveredRow(row.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          cursor: 'pointer',
                          background: isSelected
                            ? 'rgba(59,130,246,0.1)'
                            : isHovered
                              ? 'rgba(255,255,255,0.025)'
                              : 'transparent',
                          transition: 'background 0.12s',
                          borderLeft: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                        }}
                      >
                        <td style={{ padding: '13px 16px', fontSize: 12, color: '#475569' }}>
                          {String(row.id).padStart(3, '0')}
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: '#e2e8f0' }}>{row.nombre}</span>
                        </td>
                        <td style={{ padding: '13px 16px', fontSize: 12, color: '#94a3b8', maxWidth: 260 }}>
                          {row.descripcion}
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <span
                            style={{
                              background: 'rgba(99,102,241,0.12)',
                              color: '#a5b4fc',
                              padding: '3px 10px',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              border: '1px solid rgba(165,180,252,0.2)',
                            }}
                          >
                            {row.nProductos}
                          </span>
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <StatusBadge estado={row.estado} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <div
              style={{
                padding: '10px 16px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                fontSize: 11,
                color: '#475569',
              }}
            >
              <span>
                Mostrando {filtered.length} de {rows.length} categorias
              </span>
              {selected && (
                <span style={{ marginLeft: 'auto', color: '#60a5fa', fontWeight: 500 }}>
                  ✓ Seleccionada: {selected.nombre}
                </span>
              )}
            </div>
          </div>
        </main>
      </div>

      <Modal open={mode === 'nueva' || mode === 'modificar'} onClose={closeModal}>
        <div
          style={{
            padding: '18px 20px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
            }}
          >
            {mode === 'nueva' ? '🏷️' : '✏️'}
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>
            {mode === 'nueva' ? 'Nueva Categoria' : 'Modificar Categoria'}
          </span>
          <button
            onClick={closeModal}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: 18,
              cursor: 'pointer',
              lineHeight: 1,
              padding: '2px 4px',
              borderRadius: 4,
              transition: 'color 0.15s',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: '#94a3b8',
                letterSpacing: 0.6,
                marginBottom: 6,
                textTransform: 'uppercase',
              }}
            >
              Nombre de la Categoria
            </label>
            <input
              value={form.nombre}
              onChange={(e) => setField('nombre', e.target.value)}
              placeholder="Ej. Herramientas Manuales"
              style={inputStyle(errors.nombre)}
              onFocus={(e) => {
                if (!errors.nombre) e.target.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                if (!errors.nombre) e.target.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            />
            {errors.nombre && <p style={{ margin: '5px 0 0', fontSize: 11, color: '#f87171' }}>{errors.nombre}</p>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: '#94a3b8',
                letterSpacing: 0.6,
                marginBottom: 6,
                textTransform: 'uppercase',
              }}
            >
              Descripcion
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setField('descripcion', e.target.value)}
              placeholder="Breve descripcion de la categoria..."
              rows={3}
              style={{ ...inputStyle(errors.descripcion), resize: 'vertical' }}
              onFocus={(e) => {
                if (!errors.descripcion) e.target.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                if (!errors.descripcion) e.target.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            />
            {errors.descripcion && (
              <p style={{ margin: '5px 0 0', fontSize: 11, color: '#f87171' }}>{errors.descripcion}</p>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: '#94a3b8',
                letterSpacing: 0.6,
                marginBottom: 6,
                textTransform: 'uppercase',
              }}
            >
              Estado
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={form.estado}
                onChange={(e) => setField('estado', e.target.value as FormState['estado'])}
                style={{
                  ...inputStyle(),
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  paddingRight: 34,
                  cursor: 'pointer',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
              <span
                style={{
                  position: 'absolute',
                  right: 11,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  pointerEvents: 'none',
                  fontSize: 11,
                }}
              >
                ▼
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={closeModal}
              style={{
                flex: 1,
                padding: '10px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 7,
                color: '#94a3b8',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              style={{
                flex: 2,
                padding: '10px',
                background: 'linear-gradient(135deg,#3b82f6,#2563eb)',
                border: 'none',
                borderRadius: 7,
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.15s',
                boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.opacity = '0.88';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {mode === 'nueva' ? 'Guardar Categoria' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={mode === 'eliminar'} onClose={closeModal}>
        <div style={{ padding: '28px 24px', textAlign: 'center' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              margin: '0 auto 16px',
            }}
          >
            ⚠
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>Eliminar Categoria</h3>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 6px' }}>
            Esta seguro de eliminar la siguiente categoria?
          </p>
          <div
            style={{
              display: 'inline-block',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 7,
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 600,
              color: '#e2e8f0',
              margin: '8px 0 16px',
            }}
          >
            {selected?.nombre}
          </div>
          {selected && selected.nProductos > 0 && (
            <div
              style={{
                fontSize: 12,
                color: '#fbbf24',
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.2)',
                borderRadius: 6,
                padding: '8px 12px',
                marginBottom: 16,
              }}
            >
              Esta categoria tiene {selected.nProductos} productos asociados.
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              onClick={closeModal}
              style={{
                flex: 1,
                padding: '10px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 7,
                color: '#94a3b8',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              style={{
                flex: 1,
                padding: '10px',
                background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
                border: 'none',
                borderRadius: 7,
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(220,38,38,0.3)',
                transition: 'opacity 0.15s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.opacity = '0.85';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Si, eliminar
            </button>
          </div>
        </div>
      </Modal>

      <Toast data={toast} />
    </div>
  );
}
