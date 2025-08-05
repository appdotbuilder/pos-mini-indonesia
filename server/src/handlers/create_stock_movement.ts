
import { db } from '../db';
import { stockMovementsTable, productsTable } from '../db/schema';
import { type CreateStockMovementInput, type StockMovement } from '../schema';
import { eq } from 'drizzle-orm';

export async function createStockMovement(input: CreateStockMovementInput, userId: number): Promise<StockMovement> {
  try {
    // First, get the current product to validate it exists and get current stock
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();

    if (products.length === 0) {
      throw new Error(`Product with id ${input.product_id} not found`);
    }

    const product = products[0];
    const previousStock = product.stock_quantity;

    // Calculate new stock based on movement type
    let newStock: number;
    switch (input.type) {
      case 'masuk':
        newStock = previousStock + input.quantity;
        break;
      case 'keluar':
        newStock = previousStock - input.quantity;
        if (newStock < 0) {
          throw new Error('Insufficient stock for outbound movement');
        }
        break;
      case 'opname':
        // For stock opname (adjustment), the quantity represents the final stock amount
        newStock = input.quantity;
        break;
      default:
        throw new Error(`Invalid movement type: ${input.type}`);
    }

    // Start a transaction to ensure data consistency
    const result = await db.transaction(async (tx) => {
      // Insert stock movement record
      const stockMovementResult = await tx.insert(stockMovementsTable)
        .values({
          product_id: input.product_id,
          type: input.type,
          quantity: input.quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          notes: input.notes,
          user_id: userId
        })
        .returning()
        .execute();

      // Update product stock quantity
      await tx.update(productsTable)
        .set({ 
          stock_quantity: newStock,
          updated_at: new Date()
        })
        .where(eq(productsTable.id, input.product_id))
        .execute();

      return stockMovementResult[0];
    });

    return {
      id: result.id,
      product_id: result.product_id,
      type: result.type,
      quantity: result.quantity,
      previous_stock: result.previous_stock,
      new_stock: result.new_stock,
      notes: result.notes,
      user_id: result.user_id,
      created_at: result.created_at
    };
  } catch (error) {
    console.error('Stock movement creation failed:', error);
    throw error;
  }
}
