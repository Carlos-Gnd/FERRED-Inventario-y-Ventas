import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api.client';
import { Button } from '../../components/ui/Button';
import { Input }  from '../../components/ui/Input';
import { Modal }  from '../../components/ui/Modal';
import { Badge, Select, Toast, ConfirmDelete } from '../../components/ui';
import type { ToastData } from '../../components/ui';
import type { Usuario, UserRole } from '../../types';
import { ROLE_LABELS } from '../../types';

// ─── helpers ─────────────────────────────────────
function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}
function roleBadge(rol: UserRole): 'info' | 'success' | 'warning' {
  return rol === 'ADMIN' ? 'info' : rol === 'CAJERO' ? 'success' : 'warning';
}
const AVATAR_COLORS = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4'];
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

const ROLE_OPTIONS = [
  { value: '',       label: 'Todos los roles' },
  { value: 'ADMIN',  label: 'Admin' },
  { value: 'CAJERO', label: 'Cajero' },
  { value: 'BODEGA', label: 'Bodeguero' },
];
const ROL_FORM_OPTIONS = [
  { value: 'ADMIN',  label: 'Administrador' },
  { value: 'CAJERO', label: 'Cajero' },
  { value: 'BODEGA', label: 'Bodeguero' },
];

// ─── Sucursales del sistema ───────────────────────
const SUCURSAL_OPTIONS = [
  { value: '1', label: 'Sucursal Central' },
  { value: '2', label: 'Sucursal Norte' },
];

const EMPTY_FORM = { nombre: '', email: '', contrasena: '', rol: 'CAJERO' as UserRole, sucursalId: 1, activo: true };

export default function UsersPage() {
  const [usuarios,    setUsuarios]    = useState<Usuario[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [buscar,      setBuscar]      = useState('');
  const [rolFilter,   setRolFilter]   = useState('');
  const [selected,    setSelected]    = useState<number | null>(null);
  const [toast,       setToast]       = useState<ToastData | null>(null);
  const [modalNew,    setModalNew]    = useState(false);
  const [modalEdit,   setModalEdit]   = useState(false);
  const [modalDelete, setModalDelete] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [formErr,     setFormErr]     = useState<Record<string,string>>({});
  const [form,        setForm]        = useState({ ...EMPTY_FORM });

  const showToast = (msg: string, type: ToastData['type']) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (buscar)    params.buscar = buscar;
      if (rolFilter) params.rol    = rolFilter;
      const { data } = await api.get('/usuarios', { params });
      setUsuarios(data);
    } catch { showToast('Error al cargar usuarios', 'error'); }
    finally { setLoading(false); }
  }, [buscar, rolFilter]);

  useEffect(() => { loadUsuarios(); }, [loadUsuarios]);

  const selectedUser = usuarios.find(u => u.id === selected);

  function openNew() { setForm({ ...EMPTY_FORM }); setFormErr({}); setModalNew(true); }
  function openEdit() {
    if (!selectedUser) return;
    setForm({ nombre: selectedUser.nombre, email: selectedUser.email, contrasena: '', rol: selectedUser.rol, sucursalId: selectedUser.sucursalId ?? 1, activo: selectedUser.activo });
    setFormErr({});
    setModalEdit(true);
  }

  function validate() {
    const e: Record<string,string> = {};
    if (!form.nombre.trim())              e.nombre     = 'Nombre requerido';
    if (!form.email.trim())               e.email      = 'Email requerido';
    if (modalNew && !form.contrasena)     e.contrasena = 'Contraseña requerida';
    setFormErr(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      if (modalNew) {
        await api.post('/usuarios', form);
        showToast('Usuario creado correctamente', 'success');
        setModalNew(false);
      } else {
        await api.put(`/usuarios/${selected}`, form);
        showToast('Usuario actualizado', 'success');
        setModalEdit(false);
      }
      setSelected(null);
      loadUsuarios();
    } catch (err: any) {
      showToast(err.response?.data?.error ?? 'Error al guardar', 'error');
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!selected) return;
    setSaving(true);
    try {
      await api.delete(`/usuarios/${selected}`);
      showToast('Usuario desactivado', 'success');
      setModalDelete(false);
      setSelected(null);
      loadUsuarios();
    } catch { showToast('Error al eliminar', 'error'); }
    finally { setSaving(false); }
  }

  const field = (key: keyof typeof form) => ({
    value: String(form[key]),
    onChange: (v: string) => { setForm(f => ({ ...f, [key]: v })); setFormErr(e => ({ ...e, [key]: '' })); },
    error: formErr[key],
  });

  // ─── Obtener nombre de sucursal para mostrar en tabla ───
  function sucursalNombre(id: number | null) {
    const found = SUCURSAL_OPTIONS.find(s => s.value === String(id));
    return found ? found.label : '—';
  }

  // ─── Icono de sucursal ───────────────────────────────────
  const IcoBuilding = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeUp 0.4s ease' }}>

      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>Directorio de Usuarios</h2>
        <p style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Control de acceso y estados de cuenta para el personal de la ferretería.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <Button onClick={openNew} icon={<span style={{ fontSize: '14px' }}>+</span>}>Nuevo</Button>
        <Button variant="secondary" onClick={openEdit} disabled={!selected}
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>}>
          Modificar
        </Button>
        <Button variant="danger" onClick={() => setModalDelete(true)} disabled={!selected}
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>}>
          Eliminar
        </Button>
        <div style={{ flex: 1 }} />
        <div style={{ width: '220px' }}>
          <Input value={buscar} onChange={setBuscar} placeholder="Buscar nombre, correo o rol..."
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>} />
        </div>
        <div style={{ width: '160px' }}>
          <Select value={rolFilter} options={ROLE_OPTIONS} onChange={setRolFilter} />
        </div>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ width: '40px', padding: '12px 16px' }}>
                <input type="checkbox" style={{ accentColor: 'var(--accent)' }} />
              </th>
              {['NOMBRE', 'EMAIL', 'ROL', 'SUCURSAL', 'ESTADO'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 600, color: 'var(--text-subtle)', letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Cargando...</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No se encontraron usuarios</td></tr>
            ) : usuarios.map(u => (
              <tr key={u.id}
                onClick={() => setSelected(s => s === u.id ? null : u.id)}
                style={{ borderTop: '1px solid var(--border)', background: selected === u.id ? 'var(--accent-glow)' : 'transparent', cursor: 'pointer', transition: 'background 0.12s ease' }}
                onMouseEnter={e => { if (selected !== u.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = selected === u.id ? 'var(--accent-glow)' : 'transparent'; }}
              >
                <td style={{ padding: '12px 16px' }}>
                  <input type="checkbox" checked={selected === u.id} onChange={() => {}} style={{ accentColor: 'var(--accent)' }} />
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: avatarColor(u.nombre), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {initials(u.nombre)}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{u.nombre}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <Badge variant={roleBadge(u.rol)}>{ROLE_LABELS[u.rol]}</Badge>
                </td>
                {/* ─── Columna Sucursal ─── */}
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--text-subtle)', display: 'flex', alignItems: 'center' }}>
                      <IcoBuilding />
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {sucursalNombre(u.sucursalId)}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Badge variant={u.activo ? 'success' : 'neutral'}>{u.activo ? 'ACTIVO' : 'INACTIVO'}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Mostrando {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ─── Modal: Nuevo Usuario ─── */}
      <Modal open={modalNew} onClose={() => setModalNew(false)} title="Agregar Usuario" subtitle="Registro de nuevo usuario FERRED" maxWidth={460}
        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Nombre completo — fila completa */}
          <Input label="Nombre Completo" placeholder="e.g. Robert Smith" {...field('nombre')} />

          {/* Correo electrónico — fila completa */}
          <Input label="Correo Electrónico" type="email" placeholder="r.smith@hardwarepro.com" {...field('email')} />

          {/* Usuario + Contraseña — en la misma fila */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="Usuario" placeholder="rsmith_stock" value={form.email.split('@')[0] || ''} onChange={() => {}} disabled />
            <Input label="Contraseña" type="password" placeholder="••••••••" {...field('contrasena')} />
          </div>

          {/* Rol + Sucursal + Estado — en la misma fila */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <Select
              label="Rol"
              options={[
                { value: 'ADMIN',  label: 'Administrador' },
                { value: 'CAJERO', label: 'Cajero' },
                { value: 'BODEGA', label: 'Bodeguero' },
              ]}
              value={form.rol}
              onChange={v => setForm(f => ({ ...f, rol: v as UserRole }))}
            />
            <Select
              label="Sucursal"
              options={SUCURSAL_OPTIONS}
              value={String(form.sucursalId)}
              onChange={v => setForm(f => ({ ...f, sucursalId: Number(v) }))}
            />
            {/* Estado — solo al editar; en creación siempre activo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Estado
              </label>
              <div style={{
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '13px',
                color: 'var(--success)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block', flexShrink: 0 }} />
                Active
              </div>
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <Button variant="ghost" onClick={() => setModalNew(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button loading={saving} onClick={handleSave} style={{ flex: 1 }}>Create User</Button>
          </div>
        </div>
      </Modal>

      {/* ─── Modal: Modificar Usuario ─── */}
      <Modal open={modalEdit} onClose={() => setModalEdit(false)} title="Modificar Usuario" subtitle="Edición de datos de cuenta" maxWidth={460}
        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input label="Nombre Completo" {...field('nombre')} />
          <Input label="Correo Electrónico" type="email" {...field('email')} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="Nueva Contraseña" type="password" placeholder="Dejar vacío para no cambiar" {...field('contrasena')} />
            <Select
              label="Rol"
              options={[
                { value: 'ADMIN',  label: 'Administrador' },
                { value: 'CAJERO', label: 'Cajero' },
                { value: 'BODEGA', label: 'Bodeguero' },
              ]}
              value={form.rol}
              onChange={v => setForm(f => ({ ...f, rol: v as UserRole }))}
            />
          </div>

          {/* Sucursal + Estado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Sucursal"
              options={SUCURSAL_OPTIONS}
              value={String(form.sucursalId)}
              onChange={v => setForm(f => ({ ...f, sucursalId: Number(v) }))}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Estado
              </label>
              <div style={{
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
                onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
              >
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: form.activo ? 'var(--success)' : 'var(--text-subtle)',
                  display: 'inline-block', flexShrink: 0,
                }} />
                <span style={{ fontSize: '13px', color: form.activo ? 'var(--success)' : 'var(--text-subtle)', fontWeight: 600 }}>
                  {form.activo ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <Button variant="ghost" onClick={() => setModalEdit(false)} style={{ flex: 1 }}>Cancelar</Button>
            <Button loading={saving} onClick={handleSave} style={{ flex: 1 }}>Guardar cambios</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDelete
        open={modalDelete} onClose={() => setModalDelete(false)}
        onConfirm={handleDelete} name={selectedUser?.nombre ?? ''}
        warning="El usuario será desactivado. Sus datos se conservan para auditoría."
      />
      <Toast data={toast} />
    </div>
  );
}