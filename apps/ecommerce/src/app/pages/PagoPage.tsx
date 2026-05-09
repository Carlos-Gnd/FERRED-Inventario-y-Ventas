/**
 * PagoPage.tsx
 * T-18.5: Página /pago/:pedidoId — ecommerce
 *
 * - Selector de método: EFECTIVO, TARJETA, TRANSFERENCIA
 * - Formulario por método
 * - Banner "pago de prueba" en tarjeta
 * - Dropzone para comprobante (transferencia)
 * - Validación regex tarjeta (16 dígitos)
 * - Preview del comprobante antes de subir
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { getAuthHeader } from '../services/ecommerceApi';
import type { PedidoOnline } from '../types';

// ── Constantes ────────────────────────────────────────────────────────────
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001/api';
const TARJETA_REGEX = /^\d{16}$/;
const MAX_FILE_SIZE_MB = 2;

type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
type EstadoPago = 'idle' | 'loading' | 'success' | 'error';

// ── Iconos SVG inline ─────────────────────────────────────────────────────
const IcoCash = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
);

const IcoCard = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const IcoTransfer = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M7 16V4m0 0L3 8m4-4l4 4" />
    <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
  </svg>
);

const IcoUpload = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IcoCheck = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IcoX = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const IcoInfo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n);

function formatCardNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

// ── Componente principal ──────────────────────────────────────────────────
export function PagoPage() {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [pedido, setPedido]             = useState<PedidoOnline | null>(null);
  const [loadingPedido, setLoadingPedido] = useState(true);
  const [metodo, setMetodo]             = useState<MetodoPago>('EFECTIVO');
  const [estado, setEstado]             = useState<EstadoPago>('idle');
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);

  // Tarjeta
  const [cardNumber, setCardNumber]     = useState('');
  const [cardExpiry, setCardExpiry]     = useState('');
  const [cardCvv, setCardCvv]           = useState('');
  const [cardError, setCardError]       = useState<string | null>(null);

  // Transferencia
  const [referencia, setReferencia]     = useState('');
  const [archivo, setArchivo]           = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]     = useState<string | null>(null);
  const [dragOver, setDragOver]         = useState(false);
  const [uploadError, setUploadError]   = useState<string | null>(null);
  const fileInputRef                    = useRef<HTMLInputElement>(null);

  // ── Cargar pedido ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!pedidoId || !token) return;
    setLoadingPedido(true);
    fetch(`${API_BASE}/pedidos-online/mis`, {
      headers: { ...getAuthHeader(token), 'Content-Type': 'application/json' },
    })
      .then((r) => r.json())
      .then((data: { pedidos: PedidoOnline[] }) => {
        const found = data.pedidos.find((p) => p.id === Number(pedidoId));
        if (!found) setErrorMsg('Pedido no encontrado');
        else setPedido(found);
      })
      .catch(() => setErrorMsg('No se pudo cargar el pedido'))
      .finally(() => setLoadingPedido(false));
  }, [pedidoId, token]);

  // ── Dropzone ──────────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    setUploadError(null);
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setUploadError('Solo se aceptan imágenes JPG o PNG');
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setUploadError(`El archivo no puede superar ${MAX_FILE_SIZE_MB}MB`);
      return;
    }
    setArchivo(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Subir comprobante ─────────────────────────────────────────────────
  async function subirComprobante(file: File): Promise<string> {
    const form = new FormData();
    form.append('comprobante', file);
    const res = await fetch(`${API_BASE}/pagos/comprobante`, {
      method: 'POST',
      headers: getAuthHeader(token),
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? 'Error al subir el comprobante');
    }
    const body = await res.json();
    const comprobanteUrl = body.comprobanteUrl ?? body.url;
    if (!comprobanteUrl || typeof comprobanteUrl !== 'string') {
      throw new Error('El servidor no devolvio la URL del comprobante');
    }
    return comprobanteUrl;
  }

  // ── Validar tarjeta ───────────────────────────────────────────────────
  function validarTarjeta(): boolean {
    const digits = cardNumber.replace(/\s/g, '');
    if (!TARJETA_REGEX.test(digits)) {
      setCardError('El número de tarjeta debe tener 16 dígitos');
      return false;
    }
    if (!cardExpiry.match(/^\d{2}\/\d{2}$/)) {
      setCardError('Formato de expiración inválido (MM/AA)');
      return false;
    }
    if (!cardCvv.match(/^\d{3,4}$/)) {
      setCardError('CVV inválido');
      return false;
    }
    setCardError(null);
    return true;
  }

  // ── Confirmar pago ────────────────────────────────────────────────────
  async function confirmarPago() {
    if (!pedido || !token) return;
    setErrorMsg(null);

    if (metodo === 'TARJETA' && !validarTarjeta()) return;
    if (metodo === 'TRANSFERENCIA' && !archivo) {
      setUploadError('Debes subir el comprobante de transferencia');
      return;
    }

    setEstado('loading');
    try {
      let body: Record<string, unknown> = { metodo, monto: pedido.total };

      if (metodo === 'TARJETA') {
        body.tarjeta = { numero: cardNumber.replace(/\s/g, '') };
      }

      if (metodo === 'TRANSFERENCIA' && archivo) {
        const comprobanteUrl = await subirComprobante(archivo);
        body.comprobanteUrl = comprobanteUrl;
        if (referencia) body.referencia = referencia;
      }

      const res = await fetch(`${API_BASE}/pedidos-online/${pedido.id}/pago`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(token),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || data.pago?.estado === 'RECHAZADO') {
        setEstado('error');
        setErrorMsg(
          data.pago?.estado === 'RECHAZADO'
            ? 'Tarjeta rechazada por el simulador. Intenta con otra tarjeta.'
            : data.error ?? 'No se pudo procesar el pago',
        );
        return;
      }

      setEstado('success');
    } catch (err) {
      setEstado('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado');
    }
  }

  // ── Estados de resultado ──────────────────────────────────────────────
  if (estado === 'success') {
    return (
      <ResultScreen
        tipo="success"
        titulo={metodo === 'TRANSFERENCIA' ? '¡Comprobante enviado!' : '¡Pago procesado!'}
        descripcion={
          metodo === 'TRANSFERENCIA'
            ? 'Tu comprobante está en revisión. Te notificaremos cuando sea aprobado.'
            : 'Tu pago fue procesado correctamente. Puedes ver el estado en tu panel.'
        }
        onAction={() => navigate('/cliente')}
        actionLabel="Ver mis pedidos"
      />
    );
  }

  if (estado === 'error' && metodo === 'TARJETA') {
    return (
      <ResultScreen
        tipo="error"
        titulo="Pago rechazado"
        descripcion={errorMsg ?? 'La tarjeta fue rechazada. Intenta con otro método de pago.'}
        onAction={() => { setEstado('idle'); setErrorMsg(null); setCardNumber(''); setCardExpiry(''); setCardCvv(''); }}
        actionLabel="Intentar de nuevo"
      />
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────
  if (loadingPedido) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center">
        <p className="text-[#5F6368]">Cargando pedido...</p>
      </div>
    );
  }

  if (!pedido || errorMsg) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center">
        <p className="text-red-600">{errorMsg ?? 'Pedido no encontrado'}</p>
      </div>
    );
  }

  // ── Render principal ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F2EB]">
      {/* Header */}
      <section className="bg-[#2B2D31] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl font-bold">Pagar Pedido #{pedido.id}</h1>
          <p className="text-[#E5E2DA] mt-2">Selecciona tu método de pago preferido</p>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

          {/* Panel izquierdo */}
          <div className="space-y-5">

            {/* Selector de método */}
            <div className="bg-white rounded-xl p-6 shadow-md">
              <h2 className="text-lg font-bold text-[#2B2D31] mb-4">Método de pago</h2>
              <div className="grid grid-cols-3 gap-3">
                <MetodoBtn
                  selected={metodo === 'EFECTIVO'}
                  onClick={() => { setMetodo('EFECTIVO'); setErrorMsg(null); }}
                  icon={<IcoCash />}
                  label="Efectivo"
                  sublabel="Al retirar"
                />
                <MetodoBtn
                  selected={metodo === 'TARJETA'}
                  onClick={() => { setMetodo('TARJETA'); setErrorMsg(null); }}
                  icon={<IcoCard />}
                  label="Tarjeta"
                  sublabel="Simulada"
                />
                <MetodoBtn
                  selected={metodo === 'TRANSFERENCIA'}
                  onClick={() => { setMetodo('TRANSFERENCIA'); setErrorMsg(null); }}
                  icon={<IcoTransfer />}
                  label="Transferencia"
                  sublabel="Con comprobante"
                />
              </div>
            </div>

            {/* Formulario por método */}
            <div className="bg-white rounded-xl p-6 shadow-md">
              {metodo === 'EFECTIVO' && (
                <EfectivoForm total={pedido.total} />
              )}
              {metodo === 'TARJETA' && (
                <TarjetaForm
                  cardNumber={cardNumber}
                  cardExpiry={cardExpiry}
                  cardCvv={cardCvv}
                  cardError={cardError}
                  onCardNumber={(v) => { setCardNumber(formatCardNumber(v)); setCardError(null); }}
                  onExpiry={(v) => { setCardExpiry(v); setCardError(null); }}
                  onCvv={(v) => { setCardCvv(v); setCardError(null); }}
                />
              )}
              {metodo === 'TRANSFERENCIA' && (
                <TransferenciaForm
                  referencia={referencia}
                  archivo={archivo}
                  previewUrl={previewUrl}
                  dragOver={dragOver}
                  uploadError={uploadError}
                  onReferencia={setReferencia}
                  onDrop={onDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onFileChange={(f) => handleFile(f)}
                  onRemoveFile={() => { setArchivo(null); setPreviewUrl(null); setUploadError(null); }}
                  fileInputRef={fileInputRef}
                />
              )}
            </div>

            {/* Error general */}
            {errorMsg && estado === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            {/* Botón confirmar */}
            <button
              type="button"
              onClick={confirmarPago}
              disabled={estado === 'loading'}
              className="w-full bg-[#D97706] text-white py-4 rounded-xl font-bold text-base hover:bg-[#B45309] disabled:bg-[#E5E2DA] disabled:text-[#5F6368] transition-colors"
            >
              {estado === 'loading'
                ? 'Procesando...'
                : metodo === 'EFECTIVO'
                ? 'Confirmar pago en efectivo'
                : metodo === 'TARJETA'
                ? 'Pagar con tarjeta'
                : 'Enviar comprobante'}
            </button>
          </div>

          {/* Resumen del pedido */}
          <aside className="bg-white rounded-xl p-6 shadow-md h-fit">
            <h3 className="font-bold text-[#2B2D31] text-lg mb-4">Resumen</h3>
            <div className="space-y-3 pb-4 border-b border-[#E5E2DA]">
              <InfoRow label="Pedido" value={`#${pedido.id}`} />
              <InfoRow label="Estado" value={pedido.estado} />
              <InfoRow label="Entrega" value={pedido.tipoEntrega === 'RETIRO' ? 'Retiro en sucursal' : 'Envío a domicilio'} />
              {(pedido.detalles?.length ?? 0) > 0 && (
                <InfoRow label="Productos" value={`${pedido.detalles?.length} ítem(s)`} />
              )}
              <InfoRow label="Subtotal" value={fmt(pedido.subtotal)} />
              {pedido.costoEnvio > 0 && (
                <InfoRow label="Envío" value={fmt(pedido.costoEnvio)} />
              )}
            </div>
            <div className="flex justify-between items-center pt-4">
              <span className="font-bold text-[#2B2D31]">Total</span>
              <span className="text-2xl font-bold text-[#D97706]">{fmt(pedido.total)}</span>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

// ── Sub-formularios ───────────────────────────────────────────────────────

function EfectivoForm({ total }: { total: number }) {
  return (
    <div>
      <h3 className="font-bold text-[#2B2D31] text-lg mb-4">Pago en efectivo</h3>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 mb-4">
        <span className="text-amber-600 flex-shrink-0 mt-0.5"><IcoInfo /></span>
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">¿Cómo funciona?</p>
          <p>Presenta este pedido al momento de retirar en sucursal. El pago se registrará al entregar el pedido.</p>
        </div>
      </div>
      <div className="bg-[#F5F2EB] rounded-xl p-5 text-center">
        <p className="text-sm text-[#5F6368] mb-1">Monto a pagar</p>
        <p className="text-3xl font-bold text-[#2B2D31]">{fmt(total)}</p>
        <p className="text-xs text-[#5F6368] mt-2">Lleva el monto exacto para agilizar el proceso</p>
      </div>
    </div>
  );
}

function TarjetaForm({
  cardNumber, cardExpiry, cardCvv, cardError,
  onCardNumber, onExpiry, onCvv,
}: {
  cardNumber: string; cardExpiry: string; cardCvv: string; cardError: string | null;
  onCardNumber: (v: string) => void; onExpiry: (v: string) => void; onCvv: (v: string) => void;
}) {
  const digits = cardNumber.replace(/\s/g, '');
  const isTestCard = digits.startsWith('4111');

  return (
    <div>
      <h3 className="font-bold text-[#2B2D31] text-lg mb-4">Datos de tarjeta</h3>

      {/* Banner pago de prueba */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 mb-5">
        <span className="text-blue-600 flex-shrink-0 mt-0.5"><IcoInfo /></span>
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Entorno de prueba</p>
          <p>Usa el número <strong>4111 1111 1111 1111</strong> para simular un rechazo. Cualquier otro número de 16 dígitos será aprobado.</p>
        </div>
      </div>

      {isTestCard && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700 font-semibold">
          ⚠ Esta tarjeta será rechazada por el simulador
        </div>
      )}

      <div className="space-y-4">
        <label className="block">
          <span className="block text-sm font-semibold text-[#2B2D31] mb-2">Número de tarjeta</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={(e) => onCardNumber(e.target.value)}
            maxLength={19}
            className="w-full border border-[#D8D3C8] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D97706] font-mono text-lg tracking-widest"
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-semibold text-[#2B2D31] mb-2">Expiración</span>
            <input
              type="text"
              placeholder="MM/AA"
              value={cardExpiry}
              onChange={(e) => onExpiry(e.target.value)}
              maxLength={5}
              className="w-full border border-[#D8D3C8] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D97706]"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-[#2B2D31] mb-2">CVV</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="123"
              value={cardCvv}
              onChange={(e) => onCvv(e.target.value)}
              maxLength={4}
              className="w-full border border-[#D8D3C8] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D97706]"
            />
          </label>
        </div>
        {cardError && <p className="text-sm text-red-600">{cardError}</p>}
      </div>
    </div>
  );
}

function TransferenciaForm({
  referencia, archivo, previewUrl, dragOver, uploadError,
  onReferencia, onDrop, onDragOver, onDragLeave, onFileChange, onRemoveFile, fileInputRef,
}: {
  referencia: string;
  archivo: File | null;
  previewUrl: string | null;
  dragOver: boolean;
  uploadError: string | null;
  onReferencia: (v: string) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onFileChange: (f: File) => void;
  onRemoveFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div>
      <h3 className="font-bold text-[#2B2D31] text-lg mb-4">Transferencia bancaria</h3>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 mb-5">
        <span className="text-amber-600 flex-shrink-0 mt-0.5"><IcoInfo /></span>
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">Datos para transferir</p>
          <p>Banco: <strong>Agrícola</strong> · Cuenta: <strong>3000-123456-7</strong> · Titular: <strong>FERRED S.A.</strong></p>
          <p className="mt-1">Una vez realizada, sube el comprobante abajo. Tu pedido quedará en revisión.</p>
        </div>
      </div>

      <label className="block mb-4">
        <span className="block text-sm font-semibold text-[#2B2D31] mb-2">Número de referencia (opcional)</span>
        <input
          type="text"
          placeholder="Ej: REF-20260509-001"
          value={referencia}
          onChange={(e) => onReferencia(e.target.value)}
          className="w-full border border-[#D8D3C8] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D97706]"
        />
      </label>

      {/* Dropzone */}
      <div className="mb-2">
        <span className="block text-sm font-semibold text-[#2B2D31] mb-2">
          Comprobante <span className="text-red-500">*</span>
        </span>

        {!archivo ? (
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
              dragOver ? 'border-[#D97706] bg-[#FFF7ED]' : 'border-[#D8D3C8] bg-[#F9F8F6] hover:border-[#D97706] hover:bg-[#FFF7ED]'
            }`}
          >
            <span className="text-[#D97706]"><IcoUpload /></span>
            <div className="text-center">
              <p className="font-semibold text-[#2B2D31] text-sm">Arrastra tu comprobante aquí</p>
              <p className="text-[#5F6368] text-xs mt-1">o haz clic para seleccionar · JPG o PNG · máx. 2MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileChange(f); }}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-[#D8D3C8] overflow-hidden">
            {/* Preview del comprobante */}
            {previewUrl && (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Comprobante"
                  className="w-full max-h-64 object-contain bg-[#F5F2EB]"
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-3 bg-white">
              <div>
                <p className="text-sm font-semibold text-[#2B2D31] truncate max-w-[200px]">{archivo.name}</p>
                <p className="text-xs text-[#5F6368]">{(archivo.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                type="button"
                onClick={onRemoveFile}
                className="text-sm text-red-600 font-semibold hover:text-red-700 px-3 py-1"
              >
                Quitar
              </button>
            </div>
          </div>
        )}
        {uploadError && <p className="text-sm text-red-600 mt-2">{uploadError}</p>}
      </div>
    </div>
  );
}

// ── Pantalla de resultado ─────────────────────────────────────────────────
function ResultScreen({
  tipo, titulo, descripcion, onAction, actionLabel,
}: {
  tipo: 'success' | 'error';
  titulo: string;
  descripcion: string;
  onAction: () => void;
  actionLabel: string;
}) {
  const isSuccess = tipo === 'success';
  return (
    <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-10 shadow-lg max-w-md w-full text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isSuccess ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {isSuccess ? <IcoCheck /> : <IcoX />}
        </div>
        <h2 className="text-2xl font-bold text-[#2B2D31] mb-3">{titulo}</h2>
        <p className="text-[#5F6368] mb-8 leading-relaxed">{descripcion}</p>
        <button
          type="button"
          onClick={onAction}
          className="w-full bg-[#D97706] text-white py-3 rounded-xl font-bold hover:bg-[#B45309] transition-colors"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────
function MetodoBtn({
  selected, onClick, icon, label, sublabel,
}: {
  selected: boolean; onClick: () => void; icon: React.ReactNode; label: string; sublabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
        selected
          ? 'border-[#D97706] bg-[#FFF7ED] text-[#D97706]'
          : 'border-[#D8D3C8] bg-white text-[#5F6368] hover:border-[#D97706]'
      }`}
    >
      {icon}
      <span className="text-sm font-bold text-[#2B2D31]">{label}</span>
      <span className="text-xs text-[#5F6368]">{sublabel}</span>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[#5F6368]">{label}</span>
      <span className="font-semibold text-[#2B2D31]">{value}</span>
    </div>
  );
}
