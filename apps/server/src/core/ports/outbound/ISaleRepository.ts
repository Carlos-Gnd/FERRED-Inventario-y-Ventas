import { Sale } from '../../domain/Sale';
export interface ISaleRepository {
  create(sale: Sale): Promise<Sale>;
  findByBranchAndDate(branchId: number, from: Date, to: Date): Promise<Sale[]>;
}
