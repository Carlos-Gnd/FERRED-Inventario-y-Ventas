/**
 * caja.types.ts
 * T-10.3: Tipos para el módulo de corte de caja
 */

export type TipoCorte = 'X' | 'Y' | 'Z';

export interface Usuario {
  id: number;
  nombre: string;
  email?: string;
  rol?: string;
}

export interface Sucursal {
  id: number;
  nombre: string;
}

export interface CorteCaja {
  id: number;
  sucursalId: number;
  cajeroId?: number | null;
  tipo: TipoCorte;
  fechaInicio: string | Date;
  fechaFin: string | Date;
  totalEfectivo: number;
  totalTarjeta: number;
  totalTransferencia: number;
  totalGeneral: number;
  cantidadVentas: number;
  observaciones?: string | null;
  creadoEn: string | Date;
  cajero?: Usuario | null;
  sucursal?: Sucursal;
}

export interface CortePreview {
  tipo: TipoCorte;
  totalEfectivo: number;
  totalTarjeta: number;
  totalTransferencia: number;
  totalGeneral: number;
  cantidadVentas: number;
  fechaInicio?: string | Date;
  fechaFin?: string | Date;
  sucursalId?: number;
  desgloseCajeros?: Array<{ ventas: number }>;
}
