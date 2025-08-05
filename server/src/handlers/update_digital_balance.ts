
import { db } from '../db';
import { digitalBalancesTable, productsTable } from '../db/schema';
import { type UpdateDigitalBalanceInput, type DigitalBalance } from '../schema';
import { eq } from 'drizzle-orm';

export const updateDigitalBalance = async (input: UpdateDigitalBalanceInput): Promise<DigitalBalance> => {
  try {
    // First verify the product exists and is a digital product
    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();

    if (product.length === 0) {
      throw new Error(`Product with ID ${input.product_id} not found`);
    }

    if (product[0].type !== 'digital') {
      throw new Error(`Product with ID ${input.product_id} is not a digital product`);
    }

    // Check if digital balance record exists
    const existingBalance = await db.select()
      .from(digitalBalancesTable)
      .where(eq(digitalBalancesTable.product_id, input.product_id))
      .execute();

    let result;
    const now = new Date();

    if (existingBalance.length > 0) {
      // Update existing balance
      const updateResult = await db.update(digitalBalancesTable)
        .set({
          balance: input.balance.toString(),
          updated_at: now
        })
        .where(eq(digitalBalancesTable.product_id, input.product_id))
        .returning()
        .execute();

      result = updateResult[0];
    } else {
      // Create new balance record
      const insertResult = await db.insert(digitalBalancesTable)
        .values({
          product_id: input.product_id,
          balance: input.balance.toString(),
          created_at: now,
          updated_at: now
        })
        .returning()
        .execute();

      result = insertResult[0];
    }

    // Convert numeric field back to number
    return {
      ...result,
      balance: parseFloat(result.balance)
    };
  } catch (error) {
    console.error('Digital balance update failed:', error);
    throw error;
  }
};
