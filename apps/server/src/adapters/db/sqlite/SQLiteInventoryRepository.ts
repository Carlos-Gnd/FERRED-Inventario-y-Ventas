import { PrismaClient } from '@prisma/client';
import { IInventoryRepository } from '../../../core/ports/outbound/IInventoryRepository';
import { Inventory } from '../../../core/domain/Inventory';

let prisma: PrismaClient | null = null;
let prismaInitError: Error | null = null;

function getPrismaClient(): PrismaClient {
  if (prisma) return prisma;
  if (prismaInitError) throw prismaInitError;

  try {
    prisma = new PrismaClient();
    return prisma;
  } catch (error) {
    prismaInitError = error instanceof Error ? error : new Error(String(error));
    throw prismaInitError;
  }
}

export class SQLiteInventoryRepository implements IInventoryRepository {
  async findByProductAndBranch(productId: number, branchId: number): Promise<Inventory | null> {
    const db = getPrismaClient();
    return db.inventory.findUnique({ where: { productId_branchId: { productId, branchId } } });
  }

  async decreaseStock(productId: number, branchId: number, qty: number): Promise<void> {
    const db = getPrismaClient();
    await db.inventory.update({
      where: { productId_branchId: { productId, branchId } },
      data: { stock: { decrement: qty } },
    });
  }

  async findBelowMinStock(branchId: number): Promise<Inventory[]> {
    const db = getPrismaClient();
    return db.inventory.findMany({
      where: { branchId, stock: { lte: db.inventory.fields.minStock } },
    });
  }
}
