/**
 * T-20.3 — Página de ajustes del negocio (solo ADMIN)
 * Secciones: Datos Fiscales, Datos Bancarios, Zonas de Envío, Correo
 */
import { useState, useEffect, useCallback } from 'react';
import { api }    from '../../services/api.client';
import { Button } from '../../components/ui/Button';
import { Input }  from '../../components/ui/Input';
import { Modal }  from '../../components/ui/Modal';
import { Toast, ConfirmDelete, HelpTip } from '../../components/ui';
import type { ToastData } from '../../components/ui';

// ── Tipos ─────────────────────────────────────────────────────
interface AjustesData {
  NIT:              string;
  NRC:              string;
  banco:            string;
  cuenta_bancaria:  string;
  titular_cuenta:   string;
  correo_remitente: string;
  zonasEnvio:       ZonaEnvio[];
}

interface ZonaEnvio {
  id:                 number;
  nombre:             string;
  descripcion:        string | null;
  costoEnvio:         number;
  activo:             boolean;
  sucursalPreferente: number | null;
}

type SectionKey = 'fiscal' | 'bancaria' | 'zonas' | 'correo';

const SECTION_LABELS: Record<SectionKey, string> = {
  fiscal:  'Datos Fiscales',
  bancaria: 'Datos Bancarios',
  zonas:   'Zonas de Envío',
  correo:  'Correo',
};

// ── Estilos compartidos ───────────────────────────────────────
const card: React.CSSProperties = {
  background:   'var(--bg-surface)',
  border:       '1px solid var(--border)',
  borderRadius: '12px',
  padding:      '24px',
  marginBottom: '20px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)',
  marginBottom: '16px', letterSpacing: '0.02em',
};

const fieldRow: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px',
};

const warningBox: React.CSSProperties = {
  background:   'rgba(245,158,11,0.1)',
  border:       '1px solid rgba(245,158,11,0.3)',
  borderRadius: '8px',
  padding:      '10px 14px',
  fontSize:     '12px',
  color:        'var(--warning, #F59E0B)',
  marginBottom: '16px',
  display:      'flex',
  alignItems:   'flex-start',
  gap:          '8px',
};

const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left', fontSize: '11px', fontWeight: 600,
  color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase',
  padding: '6px 10px', borderBottom: '1px solid var(--border)',
};

const tdStyle: React.CSSProperties = {
  padding: '10px', fontSize: '13px', color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border)',
};

const ZONA_EMPTY = { nombre: '', descripcion: '', costoEnvio: 0, activo: true, sucursalPreferente: '' };

export default function AjustesPage() {
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState<SectionKey | null>(null);
  const [toast,       setToast]       = useState<ToastData | null>(null);
  const [confirmSec,  setConfirmSec]  = useState<SectionKey | null>(null);

  // Formularios por sección
  const [fiscal,   setFiscal]   = useState({ NIT: '', NRC: '' });
  const [bancaria, setBancaria] = useState({ banco: '', cuenta_bancaria: '', titular_cuenta: '' });
  const [correo,   setCorreo]   = useState({ correo_remitente: '' });

  // Estado original para detectar cambios fiscales
  const [originalFiscal, setOriginalFiscal] = useState({ NIT: '', NRC: '' });
  const fiscalCambiado = fiscal.NIT !== originalFiscal.NIT || fiscal.NRC !== originalFiscal.NRC;

  // Zonas de envío
  const [zonas,       setZonas]       = useState<ZonaEnvio[]>([]);
  const [modalZona,   setModalZona]   = useState<'new' | 'edit' | null>(null);
  const [zonaForm,    setZonaForm]    = useState({ ...ZONA_EMPTY });
  const [zonaEditId,  setZonaEditId]  = useState<number | null>(null);
  const [deleteZona,  setDeleteZona]  = useState<ZonaEnvio | null>(null);
  const [savingZona,  setSavingZona]  = useState(false);

  const showToast = (msg: string, type: ToastData['type']) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<AjustesData>('/ajustes');
      setFiscal({ NIT: data.NIT, NRC: data.NRC });
      setOriginalFiscal({ NIT: data.NIT, NRC: data.NRC });
      setBancaria({ banco: data.banco, cuenta_bancaria: data.cuenta_bancaria, titular_cuenta: data.titular_cuenta });
      setCorreo({ correo_remitente: data.correo_remitente });
      setZonas(data.zonasEnvio);
    } catch {
      showToast('Error al cargar ajustes', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Guardar sección ───────────────────────────────────────
  async function guardarSeccion(seccion: SectionKey) {
    setSaving(seccion);
    setConfirmSec(null);
    try {
      let payload: Record<string, string> = {};
      if (seccion === 'fiscal')   payload = { NIT: fiscal.NIT.trim(), NRC: fiscal.NRC.trim() };
      if (seccion === 'bancaria') payload = { banco: bancaria.banco.trim(), cuenta_bancaria: bancaria.cuenta_bancaria.trim(), titular_cuenta: bancaria.titular_cuenta.trim() };
      if (seccion === 'correo')   payload = { correo_remitente: correo.correo_remitente.trim() };

      await api.patch('/ajustes', payload);

      if (seccion === 'fiscal') setOriginalFiscal({ NIT: fiscal.NIT.trim(), NRC: fiscal.NRC.trim() });
      showToast(`${SECTION_LABELS[seccion]} guardado`, 'success');
    } catch {
      showToast('Error al guardar', 'error');
    } finally {
      setSaving(null);
    }
  }

  // ── CRUD zonas ────────────────────────────────────────────
  function openNewZona() { setZonaForm({ ...ZONA_EMPTY }); setZonaEditId(null); setModalZona('new'); }
  function openEditZona(z: ZonaEnvio) {
    setZonaForm({ nombre: z.nombre, descripcion: z.descripcion ?? '', costoEnvio: z.costoEnvio, activo: z.activo, sucursalPreferente: String(z.sucursalPreferente ?? '') });
    setZonaEditId(z.id);
    setModalZona('edit');
  }

  async function handleSaveZona() {
    if (!zonaForm.nombre.trim()) return;
    setSavingZona(true);
    try {
      const payload = {
        nombre:             zonaForm.nombre.trim(),
        descripcion:        zonaForm.descripcion.trim() || null,
        costoEnvio:         Number(zonaForm.costoEnvio),
        activo:             zonaForm.activo,
        sucursalPreferente: zonaForm.sucursalPreferente ? Number(zonaForm.sucursalPreferente) : null,
      };
      if (modalZona === 'new') {
        const { data } = await api.post('/ajustes/zonas', payload);
        setZonas(prev => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      } else {
        const { data } = await api.put(`/ajustes/zonas/${zonaEditId}`, payload);
        setZonas(prev => prev.map(z => z.id === zonaEditId ? data : z));
      }
      setModalZona(null);
      showToast(modalZona === 'new' ? 'Zona creada' : 'Zona actualizada', 'success');
    } catch {
      showToast('Error al guardar zona', 'error');
    } finally {
      setSavingZona(false);
    }
  }

  async function handleDeleteZona() {
    if (!deleteZona) return;
    try {
      await api.delete(`/ajustes/zonas/${deleteZona.id}`);
      setZonas(prev => prev.filter(z => z.id !== deleteZona.id));
      showToast('Zona eliminada', 'success');
    } catch {
      showToast('Error al eliminar zona', 'error');
    } finally {
      setDeleteZona(null);
    }
  }

  // ── Botón de sección ──────────────────────────────────────
  function SaveBtn({ sec }: { sec: SectionKey }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
        <Button
          variant="primary"
          size="sm"
          loading={saving === sec}
          onClick={() => setConfirmSec(sec)}
        >
          Guardar {SECTION_LABELS[sec]}
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Cargando ajustes…</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '820px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Ajustes del negocio
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Configuración general visible solo para administradores.
        </p>
      </div>

      {/* ── Datos Fiscales ─────────────────────────────────── */}
      <div style={card}>
        <p style={sectionTitle}>Datos Fiscales</p>

        {fiscalCambiado && (
          <div style={warningBox}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠</span>
            <span>
              Estás modificando datos fiscales (NIT / NRC). El sistema guardará un registro
              del valor anterior antes de aplicar el cambio.
            </span>
          </div>
        )}

        <div style={fieldRow}>
          <Input
            label="NIT"
            value={fiscal.NIT}
            onChange={v => setFiscal(f => ({ ...f, NIT: v }))}
            placeholder="00000000000000"
            help={<HelpTip text="NIT del negocio registrado en Hacienda. Va en cada DTE que se emite; si está mal, Hacienda rechaza los documentos. Verificalo contra tu tarjeta de IVA." />}
          />
          <Input
            label="NRC"
            value={fiscal.NRC}
            onChange={v => setFiscal(f => ({ ...f, NRC: v }))}
            placeholder="0000000"
            help={<HelpTip text="Número de Registro de Contribuyente. También se incluye en los DTE. Debe coincidir exactamente con tu registro en Hacienda." />}
          />
        </div>

        <SaveBtn sec="fiscal" />
      </div>

      {/* ── Datos Bancarios ────────────────────────────────── */}
      <div style={card}>
        <p style={sectionTitle}>Datos Bancarios</p>
        <div style={fieldRow}>
          <Input
            label="Banco"
            value={bancaria.banco}
            onChange={v => setBancaria(b => ({ ...b, banco: v }))}
            placeholder="Nombre del banco"
          />
          <Input
            label="Número de cuenta"
            value={bancaria.cuenta_bancaria}
            onChange={v => setBancaria(b => ({ ...b, cuenta_bancaria: v }))}
            placeholder="0000-0000-0000"
            help={<HelpTip text="Esta cuenta se le muestra al cliente en la tienda online para pagos por transferencia. Si está mal, los clientes pagarán a una cuenta equivocada. Revisá el número con cuidado." />}
          />
        </div>
        <Input
          label="Titular de la cuenta"
          value={bancaria.titular_cuenta}
          onChange={v => setBancaria(b => ({ ...b, titular_cuenta: v }))}
          placeholder="Nombre del titular"
        />
        <div style={{ marginTop: '16px' }}>
          <SaveBtn sec="bancaria" />
        </div>
      </div>

      {/* ── Zonas de Envío ─────────────────────────────────── */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <p style={{ ...sectionTitle, marginBottom: 0 }}>Zonas de Envío</p>
          <Button variant="primary" size="sm" onClick={openNewZona}>+ Nueva zona</Button>
        </div>

        {zonas.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
            No hay zonas configuradas.
          </p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Nombre</th>
                <th style={thStyle}>Descripción</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Costo envío</th>
                <th style={thStyle}>Estado</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {zonas.map(z => (
                <tr key={z.id}>
                  <td style={tdStyle}>{z.nombre}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{z.descripcion || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>${z.costoEnvio.toFixed(2)}</td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                      background: z.activo ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.12)',
                      color:      z.activo ? '#10B981' : '#94A3B8',
                    }}>
                      {z.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => openEditZona(z)}
                        style={{
                          padding: '4px 10px', fontSize: '11px', fontWeight: 600,
                          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                          borderRadius: '5px', color: 'var(--text-primary)', cursor: 'pointer',
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setDeleteZona(z)}
                        style={{
                          padding: '4px 10px', fontSize: '11px', fontWeight: 600,
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: '5px', color: '#EF4444', cursor: 'pointer',
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Correo ─────────────────────────────────────────── */}
      <div style={card}>
        <p style={sectionTitle}>Correo de notificaciones</p>
        <Input
          label="Correo remitente (SMTP)"
          value={correo.correo_remitente}
          onChange={v => setCorreo({ correo_remitente: v })}
          placeholder="notificaciones@ejemplo.com"
          type="email"
          help={<HelpTip text="Dirección que aparece como remitente ('De:') en los correos del sistema: comprobantes de venta, confirmaciones de pago y alertas de stock. No son las credenciales SMTP (esas van en el .env del servidor)." />}
        />
        <div style={{ marginTop: '16px' }}>
          <SaveBtn sec="correo" />
        </div>
      </div>

      {/* ── Modal confirmación guardar sección ─────────────── */}
      <Modal
        open={confirmSec !== null}
        onClose={() => setConfirmSec(null)}
        title={`Guardar ${confirmSec ? SECTION_LABELS[confirmSec] : ''}`}
        maxWidth={400}
      >
        {confirmSec === 'fiscal' && fiscalCambiado && (
          <div style={{ ...warningBox, marginBottom: '16px' }}>
            <span style={{ fontSize: '15px', flexShrink: 0 }}>⚠</span>
            <span>Se registrará el valor anterior de NIT/NRC en la bitácora antes de guardar.</span>
          </div>
        )}
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          ¿Confirmar los cambios en <strong style={{ color: 'var(--text-primary)' }}>{confirmSec ? SECTION_LABELS[confirmSec] : ''}</strong>?
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="ghost" size="sm" onClick={() => setConfirmSec(null)} style={{ flex: 1 }}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={saving === confirmSec}
            onClick={() => confirmSec && guardarSeccion(confirmSec)}
            style={{ flex: 1 }}
          >
            Confirmar
          </Button>
        </div>
      </Modal>

      {/* ── Modal Nueva / Editar zona ──────────────────────── */}
      <Modal
        open={modalZona !== null}
        onClose={() => setModalZona(null)}
        title={modalZona === 'new' ? 'Nueva zona de envío' : 'Editar zona'}
        maxWidth={440}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Nombre *"
            value={zonaForm.nombre}
            onChange={v => setZonaForm(f => ({ ...f, nombre: v }))}
            placeholder="Ej. Zona Centro"
          />
          <Input
            label="Descripción"
            value={zonaForm.descripcion}
            onChange={v => setZonaForm(f => ({ ...f, descripcion: v }))}
            placeholder="Opcional"
          />
          <Input
            label="Costo de envío ($)"
            value={String(zonaForm.costoEnvio)}
            onChange={v => setZonaForm(f => ({ ...f, costoEnvio: Number(v) || 0 }))}
            type="number"
            placeholder="0.00"
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              id="activo-zona"
              type="checkbox"
              checked={zonaForm.activo}
              onChange={e => setZonaForm(f => ({ ...f, activo: e.target.checked }))}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="activo-zona" style={{ fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
              Zona activa
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <Button variant="ghost" size="sm" onClick={() => setModalZona(null)} style={{ flex: 1 }}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={savingZona}
              onClick={handleSaveZona}
              style={{ flex: 1 }}
            >
              {modalZona === 'new' ? 'Crear zona' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Confirmar eliminación de zona ─────────────────── */}
      <ConfirmDelete
        open={deleteZona !== null}
        onClose={() => setDeleteZona(null)}
        onConfirm={handleDeleteZona}
        name={deleteZona?.nombre ?? ''}
        warning="Los pedidos online vinculados a esta zona perderán la referencia."
      />

      <Toast data={toast} />
    </div>
  );
}
