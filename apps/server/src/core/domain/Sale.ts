export interface SaleItem { productId: number; qty: number; price: number; }
export interface Sale {
  id?: number;
  branchId: number;
  userId: number;
  items: SaleItem[];
  total: number;
  createdAt?: Date;
}
