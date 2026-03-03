export type UnitType = 'UNIT' | 'BOX' | 'WEIGHT';
export interface Product {
  id?: number;
  name: string;
  barcode?: string;
  price: number;
  unitType: UnitType;
}
