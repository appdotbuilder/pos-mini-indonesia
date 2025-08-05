
import { db } from '../db';
import { cashDrawerTable } from '../db/schema';
import { type CreateCashDrawerInput, type CashDrawer } from '../schema';

export const createCashDrawerEntry = async (input: CreateCashDrawerInput, userId: number): Promise<CashDrawer> => {
  try {
    // Insert cash drawer entry record
    const result = await db.insert(cashDrawerTable)
      .values({
        type: input.type,
        amount: input.amount.toString(), // Convert number to string for numeric column
        description: input.description,
        user_id: userId
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const entry = result[0];
    return {
      ...entry,
      amount: parseFloat(entry.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Cash drawer entry creation failed:', error);
    throw error;
  }
};
