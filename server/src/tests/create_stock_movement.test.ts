
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, stockMovementsTable, usersTable } from '../db/schema';
import { type CreateStockMovementInput } from '../schema';
import { createStockMovement } from '../handlers/create_stock_movement';
import { eq } from 'drizzle-orm';

describe('createStockMovement', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testProductId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashed_password_123',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test product with initial stock
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
    testProductId = productResult[0].id;
  });

  it('should create stock movement for incoming stock', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      type: 'masuk',
      quantity: 20,
      notes: 'Stock replenishment'
    };

    const result = await createStockMovement(input, testUserId);

    expect(result.product_id).toEqual(testProductId);
    expect(result.type).toEqual('masuk');
    expect(result.quantity).toEqual(20);
    expect(result.previous_stock).toEqual(50);
    expect(result.new_stock).toEqual(70);
    expect(result.notes).toEqual('Stock replenishment');
    expect(result.user_id).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create stock movement for outgoing stock', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      type: 'keluar',
      quantity: 15,
      notes: 'Product sold'
    };

    const result = await createStockMovement(input, testUserId);

    expect(result.type).toEqual('keluar');
    expect(result.quantity).toEqual(15);
    expect(result.previous_stock).toEqual(50);
    expect(result.new_stock).toEqual(35);
    expect(result.notes).toEqual('Product sold');
  });

  it('should create stock movement for stock opname', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      type: 'opname',
      quantity: 45, // Adjusted stock amount
      notes: 'Stock adjustment after physical count'
    };

    const result = await createStockMovement(input, testUserId);

    expect(result.type).toEqual('opname');
    expect(result.quantity).toEqual(45);
    expect(result.previous_stock).toEqual(50);
    expect(result.new_stock).toEqual(45);
    expect(result.notes).toEqual('Stock adjustment after physical count');
  });

  it('should update product stock quantity', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      type: 'masuk',
      quantity: 30,
      notes: null
    };

    await createStockMovement(input, testUserId);

    // Verify product stock was updated
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].stock_quantity).toEqual(80);
  });

  it('should save stock movement to database', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      type: 'keluar',
      quantity: 10,
      notes: 'Test movement'
    };

    const result = await createStockMovement(input, testUserId);

    // Verify movement was saved
    const movements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.id, result.id))
      .execute();

    expect(movements).toHaveLength(1);
    expect(movements[0].product_id).toEqual(testProductId);
    expect(movements[0].type).toEqual('keluar');
    expect(movements[0].quantity).toEqual(10);
    expect(movements[0].previous_stock).toEqual(50);
    expect(movements[0].new_stock).toEqual(40);
    expect(movements[0].user_id).toEqual(testUserId);
  });

  it('should throw error for non-existent product', async () => {
    const input: CreateStockMovementInput = {
      product_id: 99999,
      type: 'masuk',
      quantity: 10,
      notes: null
    };

    await expect(createStockMovement(input, testUserId))
      .rejects.toThrow(/Product with id 99999 not found/i);
  });

  it('should throw error for insufficient stock on outbound movement', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      type: 'keluar',
      quantity: 60, // More than available stock (50)
      notes: 'Oversold attempt'
    };

    await expect(createStockMovement(input, testUserId))
      .rejects.toThrow(/Insufficient stock for outbound movement/i);
  });

  it('should handle stock opname with zero quantity', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      type: 'opname',
      quantity: 0,
      notes: 'Stock cleared'
    };

    const result = await createStockMovement(input, testUserId);

    expect(result.previous_stock).toEqual(50);
    expect(result.new_stock).toEqual(0);

    // Verify product stock was updated to zero
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();

    expect(products[0].stock_quantity).toEqual(0);
  });
});
