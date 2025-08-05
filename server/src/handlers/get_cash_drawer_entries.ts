
import { db } from '../db';
import { cashDrawerTable } from '../db/schema';
import { desc } from 'drizzle-orm';
import { type CashDrawer } from '../schema';

export const getCashDrawerEntries = async (): Promise<CashDrawer[]> => {
  try {
    const results = await db.select()
      .from(cashDrawerTable)
      .orderBy(desc(cashDrawerTable.created_at))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(entry => ({
      ...entry,
      amount: parseFloat(entry.amount)
    }));
  } catch (error) {
    console.error('Failed to fetch cash drawer entries:', error);
    throw error;
  }
};
