
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  productsTable, 
  digitalBalancesTable,
  transactionsTable,
  transactionItemsTable
} from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

describe('createTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let physicalProductId: number;
  let digitalProductId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        role: 'kasir'
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create physical product
    const physicalProductResult = await db.insert(productsTable)
      .values({
        name: 'Physical Product',
        type: 'fisik',
        cost_price: '10.00',
        selling_price: '15.00',
        stock_quantity: 100
      })
      .returning()
      .execute();
    physicalProductId = physicalProductResult[0].id;

    // Create digital product
    const digitalProductResult = await db.insert(productsTable)
      .values({
        name: 'Digital Product',
        type: 'digital',
        cost_price: '5.00',
        selling_price: '10.00',
        stock_quantity: 0
      })
      .returning()
      .execute();
    digitalProductId = digitalProductResult[0].id;

    // Create digital balance
    await db.insert(digitalBalancesTable)
      .values({
        product_id: digitalProductId,
        balance: '1000.00'
      })
      .execute();
  });

  it('should create a cash transaction with physical products', async () => {
    const input: CreateTransactionInput = {
      items: [
        {
          product_id: physicalProductId,
          quantity: 2,
          unit_price: 15.00,
          is_digital_sale: false
        }
      ],
      payment_method: 'tunai',
      payment_received: 50.00,
      notes: 'Test cash transaction'
    };

    const result = await createTransaction(input, userId);

    // Verify transaction fields
    expect(result.user_id).toBe(userId);
    expect(result.total_amount).toBe(30.00);
    expect(result.payment_method).toBe('tunai');
    expect(result.payment_received).toBe(50.00);
    expect(result.change_amount).toBe(20.00);
    expect(result.notes).toBe('Test cash transaction');
    expect(result.transaction_number).toMatch(/^TRX-/);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a digital payment transaction', async () => {
    const input: CreateTransactionInput = {
      items: [
        {
          product_id: physicalProductId,
          quantity: 1,
          unit_price: 15.00,
          is_digital_sale: false
        }
      ],
      payment_method: 'digital',
      payment_received: null,
      notes: null
    };

    const result = await createTransaction(input, userId);

    expect(result.payment_method).toBe('digital');
    expect(result.payment_received).toBeNull();
    expect(result.change_amount).toBeNull();
    expect(result.total_amount).toBe(15.00);
  });

  it('should create transaction items and update stock', async () => {
    const input: CreateTransactionInput = {
      items: [
        {
          product_id: physicalProductId,
          quantity: 3,
          unit_price: 15.00,
          is_digital_sale: false
        }
      ],
      payment_method: 'tunai',
      payment_received: 50.00,
      notes: null
    };

    const result = await createTransaction(input, userId);

    // Check transaction items were created
    const items = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, result.id))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].product_id).toBe(physicalProductId);
    expect(items[0].quantity).toBe(3);
    expect(parseFloat(items[0].unit_price)).toBe(15.00);
    expect(parseFloat(items[0].total_price)).toBe(45.00);
    expect(items[0].is_digital_sale).toBe(false);

    // Check stock was updated
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, physicalProductId))
      .execute();

    expect(products[0].stock_quantity).toBe(97); // 100 - 3
  });

  it('should handle digital product sales and update balance', async () => {
    const input: CreateTransactionInput = {
      items: [
        {
          product_id: digitalProductId,
          quantity: 5,
          unit_price: 10.00,
          is_digital_sale: true
        }
      ],
      payment_method: 'digital',
      payment_received: null,
      notes: 'Digital sale'
    };

    const result = await createTransaction(input, userId);

    expect(result.total_amount).toBe(50.00);

    // Check digital balance was updated
    const balances = await db.select()
      .from(digitalBalancesTable)
      .where(eq(digitalBalancesTable.product_id, digitalProductId))
      .execute();

    expect(parseFloat(balances[0].balance)).toBe(950.00); // 1000 - 50
  });

  it('should handle mixed physical and digital products', async () => {
    const input: CreateTransactionInput = {
      items: [
        {
          product_id: physicalProductId,
          quantity: 2,
          unit_price: 15.00,
          is_digital_sale: false
        },
        {
          product_id: digitalProductId,
          quantity: 3,
          unit_price: 10.00,
          is_digital_sale: true
        }
      ],
      payment_method: 'tunai',
      payment_received: 100.00,
      notes: 'Mixed transaction'
    };

    const result = await createTransaction(input, userId);

    expect(result.total_amount).toBe(60.00); // (2 * 15) + (3 * 10)
    expect(result.change_amount).toBe(40.00); // 100 - 60

    // Check both products were affected
    const physicalProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, physicalProductId))
      .execute();
    expect(physicalProduct[0].stock_quantity).toBe(98);

    const digitalBalance = await db.select()
      .from(digitalBalancesTable)
      .where(eq(digitalBalancesTable.product_id, digitalProductId))
      .execute();
    expect(parseFloat(digitalBalance[0].balance)).toBe(970.00);
  });

  it('should reject transaction with insufficient stock', async () => {
    const input: CreateTransactionInput = {
      items: [
        {
          product_id: physicalProductId,
          quantity: 150, // More than available stock (100)
          unit_price: 15.00,
          is_digital_sale: false
        }
      ],
      payment_method: 'tunai',
      payment_received: 2000.00,
      notes: null
    };

    await expect(createTransaction(input, userId)).rejects.toThrow(/insufficient stock/i);

    // Verify no transaction was created
    const transactions = await db.select().from(transactionsTable).execute();
    expect(transactions).toHaveLength(0);
  });

  it('should reject transaction with insufficient digital balance', async () => {
    const input: CreateTransactionInput = {
      items: [
        {
          product_id: digitalProductId,
          quantity: 200, // Would require 2000, but only 1000 available
          unit_price: 10.00,
          is_digital_sale: true
        }
      ],
      payment_method: 'digital',
      payment_received: null,
      notes: null
    };

    await expect(createTransaction(input, userId)).rejects.toThrow(/insufficient digital balance/i);

    // Verify balance unchanged
    const balances = await db.select()
      .from(digitalBalancesTable)
      .where(eq(digitalBalancesTable.product_id, digitalProductId))
      .execute();
    expect(parseFloat(balances[0].balance)).toBe(1000.00);
  });

  it('should reject transaction with non-existent product', async () => {
    const input: CreateTransactionInput = {
      items: [
        {
          product_id: 99999, // Non-existent product
          quantity: 1,
          unit_price: 10.00,
          is_digital_sale: false
        }
      ],
      payment_method: 'tunai',
      payment_received: 20.00,
      notes: null
    };

    await expect(createTransaction(input, userId)).rejects.toThrow(/product.*not found/i);
  });

  it('should calculate zero change when exact payment received', async () => {
    const input: CreateTransactionInput = {
      items: [
        {
          product_id: physicalProductId,
          quantity: 2,
          unit_price: 15.00,
          is_digital_sale: false
        }
      ],
      payment_method: 'tunai',
      payment_received: 30.00, // Exact amount
      notes: null
    };

    const result = await createTransaction(input, userId);

    expect(result.total_amount).toBe(30.00);
    expect(result.payment_received).toBe(30.00);
    expect(result.change_amount).toBe(0.00);
  });
});
