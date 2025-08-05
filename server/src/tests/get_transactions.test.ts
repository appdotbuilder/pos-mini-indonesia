
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { getTransactions } from '../handlers/get_transactions';

describe('getTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no transactions exist', async () => {
    const result = await getTransactions();
    expect(result).toEqual([]);
  });

  it('should fetch all transactions', async () => {
    // Create a test user first
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

    // Create first transaction
    await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN001',
        user_id: userId,
        total_amount: '150.75',
        payment_method: 'tunai',
        payment_received: '200.00',
        change_amount: '49.25',
        notes: 'Test transaction 1'
      })
      .execute();

    // Add delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create second transaction
    await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN002',
        user_id: userId,
        total_amount: '99.50',
        payment_method: 'digital',
        payment_received: null,
        change_amount: null,
        notes: null
      })
      .execute();

    const result = await getTransactions();

    // Should return 2 transactions
    expect(result).toHaveLength(2);

    // Verify numeric conversions
    expect(typeof result[0].total_amount).toBe('number');
    expect(typeof result[1].total_amount).toBe('number');

    // Check the first transaction (should be TXN002 due to desc order - most recent)
    const firstTransaction = result[0];
    expect(firstTransaction.transaction_number).toBe('TXN002');
    expect(firstTransaction.total_amount).toBe(99.50);
    expect(firstTransaction.payment_method).toBe('digital');
    expect(firstTransaction.payment_received).toBeNull();
    expect(firstTransaction.change_amount).toBeNull();
    expect(firstTransaction.notes).toBeNull();

    // Check the second transaction (should be TXN001 - older)
    const secondTransaction = result[1];
    expect(secondTransaction.transaction_number).toBe('TXN001');
    expect(secondTransaction.total_amount).toBe(150.75);
    expect(secondTransaction.payment_method).toBe('tunai');
    expect(secondTransaction.payment_received).toBe(200.00);
    expect(secondTransaction.change_amount).toBe(49.25);
    expect(secondTransaction.notes).toBe('Test transaction 1');
  });

  it('should return transactions ordered by creation date descending', async () => {
    // Create a test user
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

    // Create transactions with delays to ensure different timestamps
    const firstTransaction = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN001',
        user_id: userId,
        total_amount: '100.00',
        payment_method: 'tunai',
        payment_received: '100.00',
        change_amount: '0.00'
      })
      .returning()
      .execute();

    // Ensure different creation times
    await new Promise(resolve => setTimeout(resolve, 100));

    const secondTransaction = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN002',
        user_id: userId,
        total_amount: '200.00',
        payment_method: 'digital'
      })
      .returning()
      .execute();

    const result = await getTransactions();

    expect(result).toHaveLength(2);
    
    // First result should be the most recent (TXN002)
    expect(result[0].transaction_number).toBe('TXN002');
    expect(result[0].created_at.getTime()).toBeGreaterThanOrEqual(
      result[1].created_at.getTime()
    );
    
    // Second result should be older (TXN001)
    expect(result[1].transaction_number).toBe('TXN001');
  });

  it('should handle transactions with all required fields', async () => {
    // Create a test user
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

    // Create a complete transaction
    await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN-COMPLETE-001',
        user_id: userId,
        total_amount: '1250.99',
        payment_method: 'tunai',
        payment_received: '1300.00',
        change_amount: '49.01',
        notes: 'Complete transaction with all fields'
      })
      .execute();

    const result = await getTransactions();

    expect(result).toHaveLength(1);
    
    const transaction = result[0];
    expect(transaction.id).toBeDefined();
    expect(transaction.transaction_number).toBe('TXN-COMPLETE-001');
    expect(transaction.user_id).toBe(userId);
    expect(transaction.total_amount).toBe(1250.99);
    expect(transaction.payment_method).toBe('tunai');
    expect(transaction.payment_received).toBe(1300.00);
    expect(transaction.change_amount).toBe(49.01);
    expect(transaction.notes).toBe('Complete transaction with all fields');
    expect(transaction.created_at).toBeInstanceOf(Date);
  });
});
