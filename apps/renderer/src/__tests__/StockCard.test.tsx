// DT-18: Tests del componente StockCard (ruta crítica: alertas de stock).
import { render, screen, fireEvent } from '@testing-library/react';
import { StockCard, SkeletonCard } from '../pages/dashboard/StockCard';

describe('StockCard', () => {
  test('muestra estado OK cuando no hay items críticos', () => {
    render(<StockCard sucursalNombre="Sucursal Central" criticos={0} onClick={() => {}} />);
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('Sucursal Central')).toBeInTheDocument();
    expect(screen.getByText('0 items')).toBeInTheDocument();
  });

  test('muestra estado Crítico cuando hay items bajo mínimo', () => {
    render(<StockCard sucursalNombre="Sucursal Norte" criticos={7} onClick={() => {}} />);
    expect(screen.getByText('Crítico')).toBeInTheDocument();
    expect(screen.getByText('7 items')).toBeInTheDocument();
  });

  test('llama onClick al hacer clic', () => {
    const handler = vi.fn();
    render(<StockCard sucursalNombre="Test" criticos={3} onClick={handler} />);
    fireEvent.click(screen.getByTitle('Ver página de Stock'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('muestra "—" mientras carga', () => {
    render(<StockCard sucursalNombre="Cargando" criticos={0} onClick={() => {}} loading />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  test('SkeletonCard renderiza sin errores', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
