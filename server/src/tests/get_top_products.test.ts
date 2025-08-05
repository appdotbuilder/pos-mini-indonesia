
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type ReportPeriodInput } from '../schema';
import { getTopProducts } from '../handlers/get_top_products';

describe('getTopProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no transactions exist', async () => {
    const input: ReportPeriodInput = {
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    const result = await getTopProducts(input);
    expect(result).toEqual([]);
  });

  it('should return top products ordered by total quantity', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashedpassword123',
        full_name: 'Test User',
        role: 'kasir'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test products
    const productResults = await db.insert(productsTable)
      .values([
        {
          name: 'Product A',
          type: 'fisik',
          cost_price: '10.00',
          selling_price: '15.00',
          stock_quantity: 100
        },
        {
          name: 'Product B',
          type: 'fisik',
          cost_price: '20.00',
          selling_price: '30.00',
          stock_quantity: 100
        },
        {
          name: 'Product C',
          type: 'digital',
          cost_price: '5.00',
          selling_price: '10.00',
          stock_quantity: 100
        }
      ])
      .returning()
      .execute();

    const productA = productResults[0];
    const productB = productResults[1];
    const productC = productResults[2];

    // Create test transactions within date range
    const transactionResults = await db.insert(transactionsTable)
      .values([
        {
          transaction_number: 'TXN001',
          user_id: userId,
          total_amount: '75.00',
          payment_method: 'tunai',
          created_at: new Date('2024-01-15T10:00:00Z')
        },
        {
          transaction_number: 'TXN002',
          user_id: userId,
          total_amount: '90.00',
          payment_method: 'tunai',
          created_at: new Date('2024-01-20T14:00:00Z')
        }
      ])
      .returning()
      .execute();

    const transaction1 = transactionResults[0];
    const transaction2 = transactionResults[1];

    // Create transaction items
    await db.insert(transactionItemsTable)
      .values([
        // Transaction 1: Product A (5 qty), Product B (1 qty)
        {
          transaction_id: transaction1.id,
          product_id: productA.id,
          quantity: 5,
          unit_price: '15.00',
          total_price: '75.00'
        },
        {
          transaction_id: transaction1.id,
          product_id: productB.id,
          quantity: 1,
          unit_price: '30.00',
          total_price: '30.00'
        },
        // Transaction 2: Product B (2 qty), Product C (6 qty)
        {
          transaction_id: transaction2.id,
          product_id: productB.id,
          quantity: 2,
          unit_price: '30.00',
          total_price: '60.00'
        },
        {
          transaction_id: transaction2.id,
          product_id: productC.id,
          quantity: 6,
          unit_price: '10.00',
          total_price: '60.00'
        }
      ])
      .execute();

    const input: ReportPeriodInput = {
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    const result = await getTopProducts(input);

    // Should return products ordered by total quantity (desc)
    expect(result).toHaveLength(3);
    
    // Product C should be first (6 qty total)
    expect(result[0].product_id).toBe(productC.id);
    expect(result[0].product_name).toBe('Product C');
    expect(result[0].total_quantity).toBe(6);
    expect(result[0].total_revenue).toBe(60.00);

    // Product A should be second (5 qty total)
    expect(result[1].product_id).toBe(productA.id);
    expect(result[1].product_name).toBe('Product A');
    expect(result[1].total_quantity).toBe(5);
    expect(result[1].total_revenue).toBe(75.00);

    // Product B should be third (3 qty total: 1 + 2)
    expect(result[2].product_id).toBe(productB.id);
    expect(result[2].product_name).toBe('Product B');
    expect(result[2].total_quantity).toBe(3);
    expect(result[2].total_revenue).toBe(90.00);
  });

  it('should filter transactions by date range correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashedpassword123',
        full_name: 'Test User',
        role: 'kasir'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test product
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

    // Create transactions - one inside range, one outside
    const transactionResults = await db.insert(transactionsTable)
      .values([
        {
          transaction_number: 'TXN001',
          user_id: userId,
          total_amount: '15.00',
          payment_method: 'tunai',
          created_at: new Date('2024-01-15T10:00:00Z') // Inside range
        },
        {
          transaction_number: 'TXN002',
          user_id: userId,
          total_amount: '30.00',
          payment_method: 'tunai',
          created_at: new Date('2024-02-15T10:00:00Z') // Outside range
        }
      ])
      .returning()
      .execute();

    // Create transaction items
    await db.insert(transactionItemsTable)
      .values([
        {
          transaction_id: transactionResults[0].id,
          product_id: productId,
          quantity: 1,
          unit_price: '15.00',
          total_price: '15.00'
        },
        {
          transaction_id: transactionResults[1].id,
          product_id: productId,
          quantity: 2,
          unit_price: '15.00',
          total_price: '30.00'
        }
      ])
      .execute();

    const input: ReportPeriodInput = {
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    const result = await getTopProducts(input);

    // Should only include transaction from January
    expect(result).toHaveLength(1);
    expect(result[0].total_quantity).toBe(1);
    expect(result[0].total_revenue).toBe(15.00);
  });

  it('should aggregate quantities and revenue correctly for same product', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashedpassword123',
        full_name: 'Test User',
        role: 'kasir'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test product
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

    // Create multiple transactions with same product
    const transactionResults = await db.insert(transactionsTable)
      .values([
        {
          transaction_number: 'TXN001',
          user_id: userId,
          total_amount: '45.00',
          payment_method: 'tunai',
          created_at: new Date('2024-01-15T10:00:00Z')
        },
        {
          transaction_number: 'TXN002',
          user_id: userId,
          total_amount: '30.00',
          payment_method: 'tunai',
          created_at: new Date('2024-01-20T14:00:00Z')
        }
      ])
      .returning()
      .execute();

    // Create transaction items with same product
    await db.insert(transactionItemsTable)
      .values([
        {
          transaction_id: transactionResults[0].id,
          product_id: productId,
          quantity: 3,
          unit_price: '15.00',
          total_price: '45.00'
        },
        {
          transaction_id: transactionResults[1].id,
          product_id: productId,
          quantity: 2,
          unit_price: '15.00',
          total_price: '30.00'
        }
      ])
      .execute();

    const input: ReportPeriodInput = {
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    const result = await getTopProducts(input);

    // Should aggregate same product data
    expect(result).toHaveLength(1);
    expect(result[0].product_id).toBe(productId);
    expect(result[0].total_quantity).toBe(5); // 3 + 2
    expect(result[0].total_revenue).toBe(75.00); // 45.00 + 30.00
  });
});
