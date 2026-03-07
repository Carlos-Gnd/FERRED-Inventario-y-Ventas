import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api.client';
import { Button } from '../../components/ui/Button';
import { Input }  from '../../components/ui/Input';
import { Modal }  from '../../components/ui/Modal';
import { Badge, Toast, ConfirmDelete } from '../../components/ui';
import type { Categoria } from '../../types';
import type { ToastData } from '../../components/ui';

const EMPTY = { nombre: '', descripcion: '' };

export default function CategoriesPage() {
  const [categorias,  setCategorias]  = useState<Categoria[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [buscar,      setBuscar]      = useState('');
  const [selected,    setSelected]    = useState<number | null>(null);
  const [toast,       setToast]       = useState<ToastData | null>(null);
  const [modalNew,    setModalNew]    = useState(false);
  const [modalEdit,   setModalEdit]   = useState(false);
  const [modalDelete, setModalDelete] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [formErr,     setFormErr]     = useState<Record<string, string>>({});
  const [form,        setForm]        = useState({ ...EMPTY });

  const showToast = (msg: string, type: ToastData['type']) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadCategorias = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/categorias');
      const filtered = buscar
        ? data.filter((c: Categoria) => c.nombre.toLowerCase().includes(buscar.toLowerCase()))
        : data;
      setCategorias(filtered);
    } catch { showToast('Error al cargar categorías', 'error'); }
    finally { setLoading(false); }
  }, [buscar]);

  useEffect(() => { loadCategorias(); }, [loadCategorias]);

  const selectedCat = categorias.find(c => c.id === selected);

  function openNew()  { setForm({ ...EMPTY }); setFormErr({}); setModalNew(true); }
  function openEdit() { if (!selectedCat) return; setForm({ nombre: selectedCat.nombre, descripcion: selectedCat.descripcion ?? '' }); setFormErr({}); setModalEdit(true); }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.nombre.trim()) e.nombre = 'Nombre requerido';
    setFormErr(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      if (modalNew) {
        await api.post('/categorias', form);
        showToast('Categoría creada', 'success');
        setModalNew(false);
      } else {
        await api.put(`/categorias/${selected}`, form);
        showToast('Categoría actualizada', 'success');
        setModalEdit(false);
      }
      setSelected(null);
      loadCategorias();
    } catch (err: any) {
      showToast(err.response?.data?.error ?? 'Error al guardar', 'error');
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!selected) return;
    setSaving(true);
    try {
      await api.delete(`/categorias/${selected}`);
      showToast('Categoría eliminada', 'success');
      setModalDelete(false);
      setSelected(null);
      loadCategorias();
    } catch (err: any) {
      showToast(err.response?.data?.error ?? 'Error al eliminar', 'error');
    } finally { setSaving(false); }
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (v: string) => { setForm(f => ({ ...f, [key]: v })); setFormErr(e => ({ ...e, [key]: '' })); },
    error: formErr[key],
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeUp 0.4s ease' }}>

      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>Gestión de Categorías</h2>
        <p style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Organiza y clasifica los productos de la ferretería por grupos lógicos.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <Button onClick={openNew} icon={<span>+</span>}>Nuevo</Button>
        <Button variant="secondary" onClick={openEdit} disabled={!selected}
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>}>
          Modificar
        </Button>
        <Button variant="danger" onClick={() => setModalDelete(true)} disabled={!selected}
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>}>
          Eliminar
        </Button>
        <div style={{ flex: 1 }} />
        <div style={{ width: '220px' }}>
          <Input value={buscar} onChange={setBuscar} placeholder="Buscar categorías..."
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>} />
        </div>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ width: '40px', padding: '12px 16px' }}>
                <input type="checkbox" style={{ accentColor: 'var(--accent)' }} />
              </th>
              {['NOMBRE DE CATEGORÍA', 'DESCRIPCIÓN', 'Nº DE PRODUCTOS', 'ESTADO'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 600, color: 'var(--text-subtle)', letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</td></tr>
            ) : categorias.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron categorías</td></tr>
            ) : categorias.map(c => (
              <tr
                key={c.id}
                onClick={() => setSelected(s => s === c.id ? null : c.id)}
                style={{
                  borderTop: '1px solid var(--border)',
                  background: selected === c.id ? 'var(--accent-glow)' : 'transparent',
                  cursor: 'pointer', transition: 'background 0.12s ease',
                }}
                onMouseEnter={e => { if (selected !== c.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = selected === c.id ? 'var(--accent-glow)' : 'transparent'; }}
              >
                <td style={{ padding: '12px 16px' }}>
                  <input type="checkbox" checked={selected === c.id} onChange={() => {}} style={{ accentColor: 'var(--accent)' }} />
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.nombre}</td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', maxWidth: '280px' }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.descripcion ?? '—'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {c.nProductos}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Badge variant={c.nProductos > 0 ? 'success' : 'neutral'}>{c.nProductos > 0 ? 'ACTIVO' : 'INACTIVO'}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-subtle)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Mostrando {categorias.length} de {categorias.length} categorías
          </span>
        </div>
      </div>

      {/* MODALS */}
      <Modal open={modalNew} onClose={() => setModalNew(false)} title="Nueva Categoría" subtitle="Registro de categoría FERRED"
        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14"/><path d="M5 12h14"/></svg>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input label="Nombre de categoría" placeholder="Ej: Herramientas Eléctricas" {...field('nombre')} />
          <Input label="Descripción (opcional)" placeholder="Breve descripción..." rows={3} {...field('descripcion')} />
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <Button variant="ghost" onClick={() => setModalNew(false)} style={{ flex: 1 }}>Cancelar</Button>
            <Button loading={saving} onClick={handleSave} style={{ flex: 1 }}>Guardar Categoría</Button>
          </div>
        </div>
      </Modal>

      <Modal open={modalEdit} onClose={() => setModalEdit(false)} title="Modificar Categoría" subtitle="Edición de datos"
        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input label="Nombre de categoría" {...field('nombre')} />
          <Input label="Descripción" rows={3} {...field('descripcion')} />
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <Button variant="ghost" onClick={() => setModalEdit(false)} style={{ flex: 1 }}>Cancelar</Button>
            <Button loading={saving} onClick={handleSave} style={{ flex: 1 }}>Guardar cambios</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDelete
        open={modalDelete} onClose={() => setModalDelete(false)}
        onConfirm={handleDelete} name={selectedCat?.nombre ?? ''}
        warning="Se eliminará permanentemente. Asegúrate de reasignar productos antes."
      />

      <Toast data={toast} />
    </div>
  );
}