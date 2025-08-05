
import { db } from '../db';
import { digitalBalancesTable, productsTable } from '../db/schema';
import { type DigitalBalance } from '../schema';
import { eq } from 'drizzle-orm';

export const getDigitalBalances = async (): Promise<DigitalBalance[]> => {
  try {
    // Get all digital balances with their associated products
    const results = await db.select()
      .from(digitalBalancesTable)
      .innerJoin(productsTable, eq(digitalBalancesTable.product_id, productsTable.id))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(result => ({
      id: result.digital_balances.id,
      product_id: result.digital_balances.product_id,
      balance: parseFloat(result.digital_balances.balance),
      created_at: result.digital_balances.created_at,
      updated_at: result.digital_balances.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch digital balances:', error);
    throw error;
  }
};
