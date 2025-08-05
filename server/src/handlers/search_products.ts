
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { eq, or, ilike, and } from 'drizzle-orm';

export async function searchProducts(query: string): Promise<Product[]> {
  try {
    // Build base query for active products only
    let baseQuery = db.select().from(productsTable);
    
    // Build conditions array
    const conditions = [
      eq(productsTable.is_active, true)
    ];

    // Add search conditions if query is provided
    if (query.trim()) {
      const searchTerm = `%${query.trim()}%`;
      conditions.push(
        or(
          ilike(productsTable.name, searchTerm),
          ilike(productsTable.sku, searchTerm),
          ilike(productsTable.barcode, searchTerm)
        )!
      );
    }

    // Apply where clause
    const results = await baseQuery
      .where(and(...conditions))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(product => ({
      ...product,
      cost_price: parseFloat(product.cost_price),
      selling_price: parseFloat(product.selling_price)
    }));
  } catch (error) {
    console.error('Product search failed:', error);
    throw error;
  }
}
