
import { db } from '../db';
import { stockMovementsTable, productsTable, usersTable } from '../db/schema';
import { type StockMovement } from '../schema';
import { desc } from 'drizzle-orm';

export async function getStockMovements(): Promise<StockMovement[]> {
  try {
    const results = await db.select()
      .from(stockMovementsTable)
      .orderBy(desc(stockMovementsTable.created_at))
      .execute();

    return results.map(movement => ({
      ...movement,
      // No numeric conversions needed - all fields are integers or already proper types
      id: movement.id,
      product_id: movement.product_id,
      type: movement.type,
      quantity: movement.quantity,
      previous_stock: movement.previous_stock,
      new_stock: movement.new_stock,
      notes: movement.notes,
      user_id: movement.user_id,
      created_at: movement.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch stock movements:', error);
    throw error;
  }
}
