import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { StockCard, SkeletonCard } from '../pages/dashboard/StockCard';

describe('StockCard', () => {
  it('muestra el nombre de la sucursal', () => {
    render(<StockCard sucursalNombre="Sucursal Central" criticos={0} onClick={() => {}} />);
    expect(screen.getByText('Sucursal Central')).toBeInTheDocument();
  });

  it('muestra badge OK cuando no hay críticos', () => {
    render(<StockCard sucursalNombre="S1" criticos={0} onClick={() => {}} />);
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('muestra badge Crítico cuando hay productos críticos', () => {
    render(<StockCard sucursalNombre="S1" criticos={5} onClick={() => {}} />);
    expect(screen.getByText('Crítico')).toBeInTheDocument();
  });

  it('muestra conteo correcto de ítems', () => {
    render(<StockCard sucursalNombre="S1" criticos={3} onClick={() => {}} />);
    expect(screen.getByText('3 items')).toBeInTheDocument();
  });

  it('muestra guión cuando loading=true', () => {
    render(<StockCard sucursalNombre="S1" criticos={3} onClick={() => {}} loading />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('aplica clase danger cuando hay críticos', () => {
    const { container } = render(<StockCard sucursalNombre="S1" criticos={2} onClick={() => {}} />);
    expect(container.firstChild).toHaveClass('stock-card--danger');
  });

  it('llama a onClick al hacer click', async () => {
    const onClickMock = vi.fn();
    render(<StockCard sucursalNombre="S1" criticos={0} onClick={onClickMock} />);
    await userEvent.click(screen.getByTitle('Ver página de Stock'));
    expect(onClickMock).toHaveBeenCalledOnce();
  });
});

describe('SkeletonCard', () => {
  it('renderiza sin errores', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toHaveClass('stock-card--skeleton');
  });
});
