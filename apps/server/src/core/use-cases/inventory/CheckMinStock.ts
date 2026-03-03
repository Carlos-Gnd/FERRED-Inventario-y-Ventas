import { Inventory } from '../../domain/Inventory';
import { IInventoryRepository } from '../../ports/outbound/IInventoryRepository';

export class CheckMinStock {
  constructor(private inventoryRepo: IInventoryRepository) {}

  async execute(branchId: number): Promise<Inventory[]> {
    return this.inventoryRepo.findBelowMinStock(branchId);
  }
}
