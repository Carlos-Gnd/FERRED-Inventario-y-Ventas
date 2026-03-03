import { PrismaClient } from '@prisma/client';
import { IInventoryRepository } from '../../../core/ports/outbound/IInventoryRepository';
import { Inventory } from '../../../core/domain/Inventory';

const prisma = new PrismaClient();

export class SQLiteInventoryRepository implements IInventoryRepository {
  async findByProductAndBranch(productId: number, branchId: number): Promise<Inventory | null> {
    return prisma.inventory.findUnique({ where: { productId_branchId: { productId, branchId } } });
  }

  async decreaseStock(productId: number, branchId: number, qty: number): Promise<void> {
    await prisma.inventory.update({
      where: { productId_branchId: { productId, branchId } },
      data: { stock: { decrement: qty } },
    });
  }

  async findBelowMinStock(branchId: number): Promise<Inventory[]> {
    return prisma.inventory.findMany({
      where: { branchId, stock: { lte: prisma.inventory.fields.minStock } },
    });
  }
}
