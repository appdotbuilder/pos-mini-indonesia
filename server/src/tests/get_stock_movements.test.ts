
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, stockMovementsTable } from '../db/schema';
import { getStockMovements } from '../handlers/get_stock_movements';
import { eq } from 'drizzle-orm';

describe('getStockMovements', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no stock movements exist', async () => {
    const result = await getStockMovements();
    expect(result).toEqual([]);
  });

  it('should return all stock movements ordered by created_at desc', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        type: 'fisik',
        cost_price: '10.00',
        selling_price: '15.00',
        stock_quantity: 100
      })
      .returning()
      .execute();
    const productId = productResult[0].id;

    // Create multiple stock movements with slight delay to ensure different timestamps
    const movement1 = await db.insert(stockMovementsTable)
      .values({
        product_id: productId,
        type: 'masuk',
        quantity: 50,
        previous_stock: 100,
        new_stock: 150,
        notes: 'First movement',
        user_id: userId
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const movement2 = await db.insert(stockMovementsTable)
      .values({
        product_id: productId,
        type: 'keluar',
        quantity: 20,
        previous_stock: 150,
        new_stock: 130,
        notes: 'Second movement',
        user_id: userId
      })
      .returning()
      .execute();

    const result = await getStockMovements();

    expect(result).toHaveLength(2);

    // Verify ordering - most recent first
    expect(result[0].id).toEqual(movement2[0].id);
    expect(result[1].id).toEqual(movement1[0].id);

    // Verify first movement data
    expect(result[0].product_id).toEqual(productId);
    expect(result[0].type).toEqual('keluar');
    expect(result[0].quantity).toEqual(20);
    expect(result[0].previous_stock).toEqual(150);
    expect(result[0].new_stock).toEqual(130);
    expect(result[0].notes).toEqual('Second movement');
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].created_at).toBeInstanceOf(Date);

    // Verify second movement data
    expect(result[1].product_id).toEqual(productId);
    expect(result[1].type).toEqual('masuk');
    expect(result[1].quantity).toEqual(50);
    expect(result[1].previous_stock).toEqual(100);
    expect(result[1].new_stock).toEqual(150);
    expect(result[1].notes).toEqual('First movement');
    expect(result[1].user_id).toEqual(userId);
    expect(result[1].created_at).toBeInstanceOf(Date);
  });

  it('should handle stock movements with null notes', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'kasir'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        type: 'fisik',
        cost_price: '10.00',
        selling_price: '15.00',
        stock_quantity: 50
      })
      .returning()
      .execute();
    const productId = productResult[0].id;

    // Create stock movement with null notes
    await db.insert(stockMovementsTable)
      .values({
        product_id: productId,
        type: 'opname',
        quantity: 10,
        previous_stock: 50,
        new_stock: 60,
        notes: null,
        user_id: userId
      })
      .execute();

    const result = await getStockMovements();

    expect(result).toHaveLength(1);
    expect(result[0].notes).toBeNull();
    expect(result[0].type).toEqual('opname');
    expect(result[0].quantity).toEqual(10);
  });

  it('should verify data is saved correctly in database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        type: 'digital',
        cost_price: '5.00',
        selling_price: '10.00',
        stock_quantity: 0
      })
      .returning()
      .execute();
    const productId = productResult[0].id;

    // Create stock movement
    const movementResult = await db.insert(stockMovementsTable)
      .values({
        product_id: productId,
        type: 'masuk',
        quantity: 25,
        previous_stock: 0,
        new_stock: 25,
        notes: 'Initial stock',
        user_id: userId
      })
      .returning()
      .execute();

    const result = await getStockMovements();

    // Verify database contains the movement
    const dbMovements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.id, movementResult[0].id))
      .execute();

    expect(dbMovements).toHaveLength(1);
    expect(dbMovements[0].product_id).toEqual(productId);
    expect(dbMovements[0].type).toEqual('masuk');
    expect(dbMovements[0].quantity).toEqual(25);

    // Verify handler returns same data
    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(movementResult[0].id);
    expect(result[0].product_id).toEqual(productId);
    expect(result[0].user_id).toEqual(userId);
  });
});
