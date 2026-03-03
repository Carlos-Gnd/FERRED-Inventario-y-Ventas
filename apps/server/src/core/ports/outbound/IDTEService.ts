import { Sale } from '../../domain/Sale';
export interface IDTEService {
  generate(sale: Sale): Promise<string>;  // retorna JSON string del DTE
  send(dteJson: string): Promise<boolean>;
}
