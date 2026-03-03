import { Sale } from '../../domain/Sale';
import { ISaleRepository } from '../../ports/outbound/ISaleRepository';
import { IInventoryRepository } from '../../ports/outbound/IInventoryRepository';

export class RegisterSale {
  constructor(
    private saleRepo: ISaleRepository,
    private inventoryRepo: IInventoryRepository,
  ) {}

  async execute(sale: Sale): Promise<Sale> {
    // RB-01: Validar stock por cada item antes de vender
    for (const item of sale.items) {
      const inv = await this.inventoryRepo.findByProductAndBranch(item.productId, sale.branchId);
      if (!inv || inv.stock < item.qty) {
        throw new Error(`Stock insuficiente para producto ${item.productId}`);
      }
    }

    // Registrar la venta
    const created = await this.saleRepo.create(sale);

    // RB-02: Descontar stock automáticamente
    for (const item of sale.items) {
      await this.inventoryRepo.decreaseStock(item.productId, sale.branchId, item.qty);
    }

    return created;
  }
}
