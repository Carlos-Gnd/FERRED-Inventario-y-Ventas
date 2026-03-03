export interface ISyncPort {
  pushPending(branchId: number): Promise<number>;  // retorna cuántos registros se enviaron
  isOnline(): Promise<boolean>;
}
