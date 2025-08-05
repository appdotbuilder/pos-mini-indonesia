
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type ReportPeriodInput } from '../schema';
import { getSalesReport } from '../handlers/get_sales_report';

describe('getSalesReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no transactions exist', async () => {
    const input: ReportPeriodInput = {
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    const result = await getSalesReport(input);
    expect(result).toEqual([]);
  });

  it('should generate sales report for single day with transactions', async () => {
    // Create test user
    const [user] = await db.insert(usersTable).values({
      username: 'testuser',
      password_hash: 'hash123',
      full_name: 'Test User',
      role: 'kasir'
    }).returning().execute();

    // Create test products
    const [physicalProduct] = await db.insert(productsTable).values({
      name: 'Physical Product',
      type: 'fisik',
      cost_price: '10.00',
      selling_price: '20.00',
      stock_quantity: 100
    }).returning().execute();

    const [digitalProduct] = await db.insert(productsTable).values({
      name: 'Digital Product',
      type: 'digital',
      cost_price: '5.00',
      selling_price: '15.00',
      stock_quantity: 50
    }).returning().execute();

    // Create test transaction on specific date
    const testDate = new Date('2024-01-15T10:30:00Z');
    const [transaction] = await db.insert(transactionsTable).values({
      transaction_number: 'TXN001',
      user_id: user.id,
      total_amount: '70.00',
      payment_method: 'tunai',
      payment_received: '70.00',
      change_amount: '0.00',
      created_at: testDate
    }).returning().execute();

    // Create transaction items
    await db.insert(transactionItemsTable).values([
      {
        transaction_id: transaction.id,
        product_id: physicalProduct.id,
        quantity: 2,
        unit_price: '20.00',
        total_price: '40.00',
        is_digital_sale: false
      },
      {
        transaction_id: transaction.id,
        product_id: digitalProduct.id,
        quantity: 2,
        unit_price: '15.00',
        total_price: '30.00',
        is_digital_sale: true
      }
    ]).execute();

    const input: ReportPeriodInput = {
      start_date: '2024-01-15',
      end_date: '2024-01-15'
    };

    const result = await getSalesReport(input);

    expect(result).toHaveLength(1);
    const report = result[0];
    
    expect(report.date).toBe('2024-01-15');
    expect(report.total_transactions).toBe(1);
    expect(report.total_revenue).toBe(70.00);
    expect(report.total_profit).toBe(40.00); // Physical: 2 * (20 - 10) = 20, Digital: 2 * (15 - 5) = 20, Total: 40
    expect(report.physical_sales).toBe(40.00);
    expect(report.digital_sales).toBe(30.00);
  });

  it('should generate sales report for multiple days', async () => {
    // Create test user
    const [user] = await db.insert(usersTable).values({
      username: 'testuser',
      password_hash: 'hash123',
      full_name: 'Test User',
      role: 'kasir'
    }).returning().execute();

    // Create test product
    const [product] = await db.insert(productsTable).values({
      name: 'Test Product',
      type: 'fisik',
      cost_price: '10.00',
      selling_price: '25.00',
      stock_quantity: 100
    }).returning().execute();

    // Create transactions on different dates
    const [transaction1] = await db.insert(transactionsTable).values({
      transaction_number: 'TXN001',
      user_id: user.id,
      total_amount: '50.00',
      payment_method: 'tunai',
      created_at: new Date('2024-01-10T10:00:00Z')
    }).returning().execute();

    const [transaction2] = await db.insert(transactionsTable).values({
      transaction_number: 'TXN002',
      user_id: user.id,
      total_amount: '75.00',
      payment_method: 'digital',
      created_at: new Date('2024-01-12T15:00:00Z')
    }).returning().execute();

    // Create transaction items
    await db.insert(transactionItemsTable).values([
      {
        transaction_id: transaction1.id,
        product_id: product.id,
        quantity: 2,
        unit_price: '25.00',
        total_price: '50.00',
        is_digital_sale: false
      },
      {
        transaction_id: transaction2.id,
        product_id: product.id,
        quantity: 3,
        unit_price: '25.00',
        total_price: '75.00',
        is_digital_sale: false
      }
    ]).execute();

    const input: ReportPeriodInput = {
      start_date: '2024-01-10',
      end_date: '2024-01-15'
    };

    const result = await getSalesReport(input);

    expect(result).toHaveLength(2);
    
    // First day report
    expect(result[0].date).toBe('2024-01-10');
    expect(result[0].total_transactions).toBe(1);
    expect(result[0].total_revenue).toBe(50.00);
    expect(result[0].total_profit).toBe(30.00); // 2 * (25 - 10) = 30
    
    // Second day report
    expect(result[1].date).toBe('2024-01-12');
    expect(result[1].total_transactions).toBe(1);
    expect(result[1].total_revenue).toBe(75.00);
    expect(result[1].total_profit).toBe(45.00); // 3 * (25 - 10) = 45
  });

  it('should filter transactions by date range correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable).values({
      username: 'testuser',
      password_hash: 'hash123',
      full_name: 'Test User',
      role: 'kasir'
    }).returning().execute();

    // Create test product
    const [product] = await db.insert(productsTable).values({
      name: 'Test Product',
      type: 'fisik',
      cost_price: '10.00',
      selling_price: '20.00',
      stock_quantity: 100
    }).returning().execute();

    // Create transactions - one before range, one in range, one after range
    const transactions = await db.insert(transactionsTable).values([
      {
        transaction_number: 'TXN001',
        user_id: user.id,
        total_amount: '20.00',
        payment_method: 'tunai',
        created_at: new Date('2024-01-05T10:00:00Z') // Before range
      },
      {
        transaction_number: 'TXN002',
        user_id: user.id,
        total_amount: '40.00',
        payment_method: 'tunai',
        created_at: new Date('2024-01-15T10:00:00Z') // In range
      },
      {
        transaction_number: 'TXN003',
        user_id: user.id,
        total_amount: '60.00',
        payment_method: 'tunai',
        created_at: new Date('2024-01-25T10:00:00Z') // After range
      }
    ]).returning().execute();

    // Create transaction items for all transactions
    await db.insert(transactionItemsTable).values([
      {
        transaction_id: transactions[0].id,
        product_id: product.id,
        quantity: 1,
        unit_price: '20.00',
        total_price: '20.00',
        is_digital_sale: false
      },
      {
        transaction_id: transactions[1].id,
        product_id: product.id,
        quantity: 2,
        unit_price: '20.00',
        total_price: '40.00',
        is_digital_sale: false
      },
      {
        transaction_id: transactions[2].id,
        product_id: product.id,
        quantity: 3,
        unit_price: '20.00',
        total_price: '60.00',
        is_digital_sale: false
      }
    ]).execute();

    const input: ReportPeriodInput = {
      start_date: '2024-01-10',
      end_date: '2024-01-20'
    };

    const result = await getSalesReport(input);

    // Should only include the transaction from 2024-01-15
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2024-01-15');
    expect(result[0].total_revenue).toBe(40.00);
  });
});
