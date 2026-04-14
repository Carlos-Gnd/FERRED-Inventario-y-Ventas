import { useMemo, useState } from 'react';

interface Producto {
  id: number;
  nombre: string;
  sku: string;
  categoria: string;
  central: number;
  norte: number;
}

const PRODUCTOS_MOCK: Producto[] = [
  { id: 1, nombre: 'Taladro Percutor 20V', sku: 'DEW-992-B', categoria: 'Herramientas', central: 24, norte: 8 },
  { id: 2, nombre: 'Sierra Circular 7-1/4"', sku: 'MAC-441-S', categoria: 'Herramientas', central: 15, norte: 22 },
  { id: 3, nombre: 'Mezcladora de Concreto 120L', sku: 'CON-882-X', categoria: 'Maquinaria', central: 3, norte: 5 },
  { id: 4, nombre: 'Set de Llaves Allen 12 pcs', sku: 'FER-112-L', categoria: 'Ferreteria', central: 145, norte: 98 },
  { id: 5, nombre: 'Nivel Laser Autonivelante', sku: 'NIV-330-A', categoria: 'Medicion', central: 0, norte: 4 },
  { id: 6, nombre: 'Compresor 50L 2HP', sku: 'COM-550-P', categoria: 'Maquinaria', central: 7, norte: 0 },
  { id: 7, nombre: 'Martillo de Carpintero 20oz', sku: 'MAR-220-C', categoria: 'Herramientas', central: 62, norte: 55 },
  { id: 8, nombre: 'Pintura Esmalte 1 Galon', sku: 'PIN-101-E', categoria: 'Pintura', central: 0, norte: 0 },
  { id: 9, nombre: 'Tornillos Autorroscantes x100', sku: 'TOR-440-X', categoria: 'Ferreteria', central: 320, norte: 210 },
  { id: 10, nombre: 'Cinta Metrica 8m', sku: 'CIN-080-M', categoria: 'Medicion', central: 88, norte: 91 },
  { id: 11, nombre: 'Disco de Corte 4.5"', sku: 'DIS-045-C', categoria: 'Herramientas', central: 5, norte: 2 },
  { id: 12, nombre: 'Cemento Portland 42.5kg', sku: 'CEM-425-P', categoria: 'Construccion', central: 18, norte: 33 },
  { id: 13, nombre: 'Rodillo Pintura 9"', sku: 'ROD-090-P', categoria: 'Pintura', central: 44, norte: 12 },
  { id: 14, nombre: 'Broca HSS 6mm', sku: 'BRO-006-H', categoria: 'Ferreteria', central: 0, norte: 15 },
  { id: 15, nombre: 'Guantes de Trabajo L', sku: 'GUA-L00-T', categoria: 'Seguridad', central: 73, norte: 68 },
  { id: 16, nombre: 'Casco de Seguridad', sku: 'CAS-001-S', categoria: 'Seguridad', central: 2, norte: 0 },
];

const POR_PAGINA = 8;
const CATEGORIAS = ['Todas', ...Array.from(new Set(PRODUCTOS_MOCK.map((producto) => producto.categoria))).sort()];

function getStockColor(cantidad: number) {
  if (cantidad === 0) return 'var(--danger)';
  if (cantidad <= 5) return 'var(--warning)';
  return 'var(--success)';
}

function getDiffColor(diferencia: number) {
  if (diferencia > 0) return 'var(--success)';
  if (diferencia < 0) return 'var(--danger)';
  return 'var(--text-muted)';
}

export default function StockPage() {
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [pagina, setPagina] = useState(1);

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return PRODUCTOS_MOCK.filter((producto) => {
      const coincideBusqueda =
        termino.length === 0 ||
        producto.nombre.toLowerCase().includes(termino) ||
        producto.sku.toLowerCase().includes(termino);
      const coincideCategoria = categoria === 'Todas' || producto.categoria === categoria;
      return coincideBusqueda && coincideCategoria;
    });
  }, [busqueda, categoria]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const paginados = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const totalProductos = PRODUCTOS_MOCK.length;
  const conStock = PRODUCTOS_MOCK.filter((producto) => producto.central > 5 && producto.norte > 5).length;
  const stockBajo = PRODUCTOS_MOCK.filter(
    (producto) => (producto.central > 0 && producto.central <= 5) || (producto.norte > 0 && producto.norte <= 5)
  ).length;
  const sinStock = PRODUCTOS_MOCK.filter((producto) => producto.central === 0 || producto.norte === 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Control de Stock</h1>
          <p style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Comparativo de inventario entre sucursal central y sucursal norte.
          </p>
        </div>

        <span
          style={{
            padding: '6px 10px',
            borderRadius: '999px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--accent)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Admin / Bodega
        </span>
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Productos', valor: totalProductos, helper: 'Catalogo monitoreado', color: 'var(--accent)' },
          { label: 'Con stock', valor: conStock, helper: 'Disponibles en ambas sucursales', color: 'var(--success)' },
          { label: 'Stock bajo', valor: stockBajo, helper: 'Requieren atencion', color: 'var(--warning)' },
          { label: 'Sin stock', valor: sinStock, helper: 'Al menos una sucursal en cero', color: 'var(--danger)' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: 'var(--bg-surface)',
              border: `1px solid ${item.color}33`,
              borderLeft: `4px solid ${item.color}`,
              borderRadius: '12px',
              padding: '18px',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: item.color }}>
              {item.label}
            </div>
            <div style={{ marginTop: '10px', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.valor}</div>
            <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>{item.helper}</div>
          </div>
        ))}
      </div>

      <section
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <input
            type="text"
            value={busqueda}
            placeholder="Buscar por nombre o SKU"
            onChange={(event) => {
              setBusqueda(event.target.value);
              setPagina(1);
            }}
            style={{
              minHeight: '42px',
              flex: '1 1 240px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              font: 'inherit',
              outline: 'none',
            }}
          />

          <select
            value={categoria}
            onChange={(event) => {
              setCategoria(event.target.value);
              setPagina(1);
            }}
            style={{
              minHeight: '42px',
              flex: '0 1 220px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              font: 'inherit',
              outline: 'none',
            }}
          >
            {CATEGORIAS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="table-responsive">
          <table style={{ width: '100%', minWidth: '620px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Producto', 'Categoria', 'Central', 'Norte', 'Diferencia'].map((columna) => (
                  <th
                    key={columna}
                    style={{
                      padding: '12px 16px',
                      textAlign: columna === 'Producto' || columna === 'Categoria' ? 'left' : 'center',
                      borderBottom: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {columna}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {paginados.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No se encontraron productos con los filtros actuales.
                  </td>
                </tr>
              ) : (
                paginados.map((producto, index) => {
                  const diferencia = producto.central - producto.norte;

                  return (
                    <tr
                      key={producto.id}
                      style={{
                        background: index % 2 === 0 ? 'transparent' : 'var(--bg-hover)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{producto.nombre}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>SKU: {producto.sku}</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            padding: '4px 8px',
                            borderRadius: '999px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          {producto.categoria}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: getStockColor(producto.central) }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStockColor(producto.central) }} />
                          {producto.central}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: getStockColor(producto.norte) }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStockColor(producto.norte) }} />
                          {producto.norte}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: getDiffColor(diferencia) }}>
                        {diferencia > 0 ? `+${diferencia}` : diferencia}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '14px 16px' }}>
          <small style={{ color: 'var(--text-muted)' }}>
            Mostrando {paginados.length === 0 ? 0 : (paginaActual - 1) * POR_PAGINA + 1}-{Math.min(paginaActual * POR_PAGINA, filtrados.length)} de {filtrados.length}{' '}
            productos
          </small>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={paginaActual === 1}
              onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
              style={{
                minWidth: '38px',
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                cursor: paginaActual === 1 ? 'not-allowed' : 'pointer',
                opacity: paginaActual === 1 ? 0.45 : 1,
              }}
            >
              Anterior
            </button>

            {Array.from({ length: Math.min(totalPaginas, 5) }, (_, index) => {
              let numero = index + 1;

              if (totalPaginas > 5) {
                if (paginaActual <= 3) numero = index + 1;
                else if (paginaActual >= totalPaginas - 2) numero = totalPaginas - 4 + index;
                else numero = paginaActual - 2 + index;
              }

              const activo = numero === paginaActual;

              return (
                <button
                  key={numero}
                  type="button"
                  onClick={() => setPagina(numero)}
                  style={{
                    minWidth: '38px',
                    height: '36px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: activo ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: activo ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: activo ? '#fff' : 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  {numero}
                </button>
              );
            })}

            <button
              type="button"
              disabled={paginaActual === totalPaginas}
              onClick={() => setPagina((prev) => Math.min(totalPaginas, prev + 1))}
              style={{
                minWidth: '38px',
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer',
                opacity: paginaActual === totalPaginas ? 0.45 : 1,
              }}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
//paguina de stock solo para subir