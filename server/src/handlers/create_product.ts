
import { db } from '../db';
import { productsTable, digitalBalancesTable } from '../db/schema';
import { type CreateProductInput, type Product } from '../schema';

export async function createProduct(input: CreateProductInput): Promise<Product> {
  try {
    // Insert product record
    const result = await db.insert(productsTable)
      .values({
        name: input.name,
        sku: input.sku,
        barcode: input.barcode,
        type: input.type,
        category: input.category,
        cost_price: input.cost_price.toString(), // Convert number to string for numeric column
        selling_price: input.selling_price.toString(), // Convert number to string for numeric column
        stock_quantity: input.stock_quantity,
        min_stock_alert: input.min_stock_alert
      })
      .returning()
      .execute();

    const product = result[0];

    // For digital products, create corresponding digital balance entry
    if (input.type === 'digital') {
      await db.insert(digitalBalancesTable)
        .values({
          product_id: product.id,
          balance: '0' // Start with zero balance
        })
        .execute();
    }

    // Convert numeric fields back to numbers before returning
    return {
      ...product,
      cost_price: parseFloat(product.cost_price), // Convert string back to number
      selling_price: parseFloat(product.selling_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Product creation failed:', error);
    throw error;
  }
}
