
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type ReportPeriodInput } from '../schema';
import { getProfitReport } from '../handlers/get_profit_report';

describe('getProfitReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should calculate profit report for period with transactions', async () => {
    // Create test user
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

    // Create test products with different costs and selling prices
    const productResults = await db.insert(productsTable)
      .values([
        {
          name: 'Product A',
          type: 'fisik',
          cost_price: '10.00', // Cost: 10, will sell for 15
          selling_price: '15.00',
          stock_quantity: 100
        },
        {
          name: 'Product B',
          type: 'fisik',
          cost_price: '20.00', // Cost: 20, will sell for 35
          selling_price: '35.00',
          stock_quantity: 50
        }
      ])
      .returning()
      .execute();

    // Create transaction within test period with explicit timestamp
    const transactionDate = new Date('2024-06-15T10:00:00Z');
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TRX001',
        user_id: userId,
        total_amount: '95.00', // 3*15 + 2*35 = 45 + 50 = 95
        payment_method: 'tunai',
        created_at: transactionDate
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Create transaction items
    await db.insert(transactionItemsTable)
      .values([
        {
          transaction_id: transactionId,
          product_id: productResults[0].id,
          quantity: 3,
          unit_price: '15.00',
          total_price: '45.00' // 3 * 15
        },
        {
          transaction_id: transactionId,
          product_id: productResults[1].id,
          quantity: 2,
          unit_price: '35.00',
          total_price: '50.00' // 2 * 35
        }
      ])
      .execute();

    const input: ReportPeriodInput = {
      start_date: '2024-01-01',
      end_date: '2024-12-31'
    };

    const result = await getProfitReport(input);

    // Expected calculations:
    // Total Revenue: 45 + 50 = 95
    // Total Cost: (3 * 10) + (2 * 20) = 30 + 40 = 70
    // Total Profit: 95 - 70 = 25
    // Profit Margin: (25 / 95) * 100 = 26.32%

    expect(result.total_revenue).toEqual(95);
    expect(result.total_profit).toEqual(25);
    expect(result.profit_margin).toBeCloseTo(26.32, 2);
  });

  it('should return zero values when no transactions in period', async () => {
    const input: ReportPeriodInput = {
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    const result = await getProfitReport(input);

    expect(result.total_revenue).toEqual(0);
    expect(result.total_profit).toEqual(0);
    expect(result.profit_margin).toEqual(0);
  });

  it('should filter transactions by date range correctly', async () => {
    // Create test user
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

    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        type: 'fisik',
        cost_price: '10.00',
        selling_price: '20.00',
        stock_quantity: 100
      })
      .returning()
      .execute();

    // Create transaction OUTSIDE the test period (should be excluded)
    const oldTransactionResult = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TRX_OLD',
        user_id: userId,
        total_amount: '20.00',
        payment_method: 'tunai',
        created_at: new Date('2023-12-31T10:00:00Z')
      })
      .returning()
      .execute();

    await db.insert(transactionItemsTable)
      .values({
        transaction_id: oldTransactionResult[0].id,
        product_id: productResult[0].id,
        quantity: 1,
        unit_price: '20.00',
        total_price: '20.00'
      })
      .execute();

    // Create transaction INSIDE the test period (should be included)
    const newTransactionResult = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TRX_NEW',
        user_id: userId,
        total_amount: '40.00',
        payment_method: 'tunai',
        created_at: new Date('2024-06-15T10:00:00Z')
      })
      .returning()
      .execute();

    await db.insert(transactionItemsTable)
      .values({
        transaction_id: newTransactionResult[0].id,
        product_id: productResult[0].id,
        quantity: 2,
        unit_price: '20.00',
        total_price: '40.00'
      })
      .execute();

    const input: ReportPeriodInput = {
      start_date: '2024-01-01',
      end_date: '2024-12-31'
    };

    const result = await getProfitReport(input);

    // Should only include the new transaction
    // Revenue: 40, Cost: 2 * 10 = 20, Profit: 20
    expect(result.total_revenue).toEqual(40);
    expect(result.total_profit).toEqual(20);
    expect(result.profit_margin).toEqual(50);
  });

  it('should handle zero profit margin when revenue is zero', async () => {
    // This test case is already covered by the "no transactions" test
    // but let's be explicit about the zero revenue case
    const input: ReportPeriodInput = {
      start_date: '2025-01-01',
      end_date: '2025-01-31'
    };

    const result = await getProfitReport(input);

    expect(result.total_revenue).toEqual(0);
    expect(result.total_profit).toEqual(0);
    expect(result.profit_margin).toEqual(0);
  });

  it('should handle negative profit correctly', async () => {
    // Create test user
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

    // Create product with cost higher than selling price (loss scenario)
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Loss Product',
        type: 'fisik',
        cost_price: '25.00', // Cost is higher than selling price
        selling_price: '20.00',
        stock_quantity: 10
      })
      .returning()
      .execute();

    // Create transaction with explicit timestamp
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TRX_LOSS',
        user_id: userId,
        total_amount: '20.00',
        payment_method: 'tunai',
        created_at: new Date('2024-06-15T10:00:00Z')
      })
      .returning()
      .execute();

    await db.insert(transactionItemsTable)
      .values({
        transaction_id: transactionResult[0].id,
        product_id: productResult[0].id,
        quantity: 1,
        unit_price: '20.00',
        total_price: '20.00'
      })
      .execute();

    const input: ReportPeriodInput = {
      start_date: '2024-01-01',
      end_date: '2024-12-31'
    };

    const result = await getProfitReport(input);

    // Revenue: 20, Cost: 25, Profit: -5 (loss)
    // Profit Margin: (-5 / 20) * 100 = -25%
    expect(result.total_revenue).toEqual(20);
    expect(result.total_profit).toEqual(-5);
    expect(result.profit_margin).toEqual(-25);
  });
});
