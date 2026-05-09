/**
 * CajaPage.tsx (v2)
 * T-10.3: Página /caja — usa los tres modales individuales X, Y, Z
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.client';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { Toast } from '../../components/ui';
import type { ToastData } from '../../components/ui';
import type { UserRole } from '../../types';
import { CorteCard } from './components/CorteCard';
import { CorteXModal } from './components/CorteXModal';
import { CorteYModal } from './components/CorteYModal';
import { CorteZModal } from './components/CorteZModal';
import { HistorialCortes } from './components/HistorialCortes';
import type { CorteCaja, TipoCorte, CortePreview } from './caja.types';

export default function CajaPage() {
  const { usuario } = useAuthStore();
  const { isDark } = useThemeStore();
  const rol = (usuario?.rol ?? 'CAJERO') as UserRole;
  const sucursalId = usuario?.sucursalId ?? null;
  const esAdmin = rol === 'ADMIN';

  const [historial, setHistorial]         = useState<CorteCaja[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generando, setGenerando]         = useState(false);
  const [toast, setToast]                 = useState<ToastData | null>(null);

  const [modalAbierto, setModalAbierto]   = useState<TipoCorte | null>(null);
  const [preview, setPreview]             = useState<CortePreview | null>(null);

  const [filtroTipo, setFiltroTipo]       = useState<string>('Todos');
  const [filtroFecha, setFiltroFecha]     = useState<string>('');

  const showToast = useCallback((msg: string, type: ToastData['type']) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadHistorial = useCallback(async () => {
    setLoadingHistorial(true);
    try {
      const params: Record<string, string> = {};
      if (filtroTipo !== 'Todos') params.tipo = filtroTipo;
      if (filtroFecha) params.fecha = filtroFecha;
      const { data } = await api.get('/caja/cortes', { params });
      setHistorial(data);
    } catch {
      showToast('Error al cargar el historial de cortes', 'error');
    } finally {
      setLoadingHistorial(false);
    }
  }, [filtroTipo, filtroFecha, showToast]);

  useEffect(() => { loadHistorial(); }, [loadHistorial]);

  async function abrirModal(tipo: TipoCorte) {
    if (!sucursalId) { showToast('Sin sucursal asignada', 'error'); return; }
    setPreview(null);
    setModalAbierto(tipo);
    setLoadingPreview(true);
    try {
      const { data } = await api.get(`/caja/preview/${tipo}`, { params: { sucursalId } });
      setPreview(data);
    } catch {
      showToast('No se pudo cargar el preview del corte', 'error');
      setModalAbierto(null);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function confirmarCorte(tipo: TipoCorte, extra?: { efectivoFisico?: number; password?: string }) {
    if (!sucursalId) return;
    setGenerando(true);
    try {
      await api.post('/caja/corte', {
        tipo, sucursalId,
        efectivoFisico: extra?.efectivoFisico,
        password: extra?.password,
      });
      const msgs: Record<TipoCorte, string> = {
        X: 'Corte X generado correctamente',
        Y: 'Cierre de turno registrado',
        Z: 'Cierre total del día completado',
      };
      showToast(msgs[tipo], 'success');
      setModalAbierto(null);
      loadHistorial();
    } catch (err: any) {
      showToast(err.response?.data?.error ?? 'Error al generar el corte', 'error');
    } finally {
      setGenerando(false);
    }
  }

  const cerrar = () => { if (!generando) setModalAbierto(null); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', animation: 'fadeUp 0.4s ease' }}>
      {/* Encabezado */}
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
          Corte de Caja
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Gestiona los cortes de turno y cierre del día
        </p>
      </div>

      {/* Tarjetas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
        <CorteCard
          tipo="X"
          titulo="Corte X — Lectura"
          subtitulo="LECTURA PARCIAL"
          descripcion="Consulta totales sin cerrar el turno. Ideal para monitoreo de flujo intermedio."
          nota="No marca ventas como cerradas"
          notaIcono="info"
          isDark={isDark}
          onGenerar={() => abrirModal('X')}
        />
        <CorteCard
          tipo="Y"
          titulo="Corte Y — Cierre de Cajero"
          subtitulo="CIERRE TURNO"
          descripcion="Finaliza oficialmente tu jornada de ventas y registra el efectivo físico en caja."
          nota="Marca tus ventas como cerradas"
          notaIcono="check"
          isDark={isDark}
          onGenerar={() => abrirModal('Y')}
        />
        <CorteCard
          tipo="Z"
          titulo="Corte Z — Cierre Total"
          subtitulo="SOLO ADMIN"
          descripcion="Cierre definitivo del día contable. Consolida todos los turnos del establecimiento."
          nota="Requiere todos los cortes Y del día"
          notaIcono="warning"
          isDark={isDark}
          soloAdmin
          esAdmin={esAdmin}
          deshabilitado={!esAdmin}
          onGenerar={() => abrirModal('Z')}
        />
      </div>

      {/* Historial */}
      <HistorialCortes
        historial={historial}
        loading={loadingHistorial}
        filtroTipo={filtroTipo}
        filtroFecha={filtroFecha}
        onFiltroTipo={setFiltroTipo}
        onFiltroFecha={setFiltroFecha}
        onBuscar={loadHistorial}
        isDark={isDark}
      />

      {/* Modales */}
      <CorteXModal
        open={modalAbierto === 'X'}
        preview={preview}
        loading={loadingPreview}
        generando={generando}
        isDark={isDark}
        onClose={cerrar}
        onConfirmar={() => confirmarCorte('X')}
      />
      <CorteYModal
        open={modalAbierto === 'Y'}
        preview={preview}
        loading={loadingPreview}
        generando={generando}
        isDark={isDark}
        onClose={cerrar}
        onConfirmar={(ef) => confirmarCorte('Y', { efectivoFisico: ef })}
      />
      <CorteZModal
        open={modalAbierto === 'Z'}
        preview={preview}
        loading={loadingPreview}
        generando={generando}
        isDark={isDark}
        onClose={cerrar}
        onConfirmar={(pw) => confirmarCorte('Z', { password: pw })}
      />

      <Toast data={toast} />
    </div>
  );
}