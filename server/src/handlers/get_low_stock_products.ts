
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { and, eq, lte, isNotNull, sql } from 'drizzle-orm';

export async function getLowStockProducts(): Promise<Product[]> {
  try {
    // Query products where stock_quantity <= min_stock_alert
    // Only include active products that have min_stock_alert set
    const results = await db.select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.is_active, true),
          isNotNull(productsTable.min_stock_alert),
          lte(productsTable.stock_quantity, sql`${productsTable.min_stock_alert}`)
        )
      )
      .execute();

    // Convert numeric fields back to numbers
    return results.map(product => ({
      ...product,
      cost_price: parseFloat(product.cost_price),
      selling_price: parseFloat(product.selling_price)
    }));
  } catch (error) {
    console.error('Failed to fetch low stock products:', error);
    throw error;
  }
}
