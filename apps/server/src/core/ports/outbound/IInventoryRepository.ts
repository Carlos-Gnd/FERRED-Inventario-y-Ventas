import { Inventory } from '../../domain/Inventory';
export interface IInventoryRepository {
  findByProductAndBranch(productId: number, branchId: number): Promise<Inventory | null>;
  decreaseStock(productId: number, branchId: number, qty: number): Promise<void>;
  findBelowMinStock(branchId: number): Promise<Inventory[]>;
}
