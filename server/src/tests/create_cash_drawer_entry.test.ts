
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { cashDrawerTable, usersTable } from '../db/schema';
import { type CreateCashDrawerInput } from '../schema';
import { createCashDrawerEntry } from '../handlers/create_cash_drawer_entry';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateCashDrawerInput = {
  type: 'masuk',
  amount: 100000,
  description: 'Saldo awal kasir shift pagi'
};

describe('createCashDrawerEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        role: 'kasir'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  it('should create a cash drawer entry', async () => {
    const result = await createCashDrawerEntry(testInput, testUserId);

    // Basic field validation
    expect(result.type).toEqual('masuk');
    expect(result.amount).toEqual(100000);
    expect(typeof result.amount).toEqual('number');
    expect(result.description).toEqual('Saldo awal kasir shift pagi');
    expect(result.user_id).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save cash drawer entry to database', async () => {
    const result = await createCashDrawerEntry(testInput, testUserId);

    // Query using proper drizzle syntax
    const entries = await db.select()
      .from(cashDrawerTable)
      .where(eq(cashDrawerTable.id, result.id))
      .execute();

    expect(entries).toHaveLength(1);
    expect(entries[0].type).toEqual('masuk');
    expect(parseFloat(entries[0].amount)).toEqual(100000);
    expect(entries[0].description).toEqual('Saldo awal kasir shift pagi');
    expect(entries[0].user_id).toEqual(testUserId);
    expect(entries[0].created_at).toBeInstanceOf(Date);
  });

  it('should create entry with different types', async () => {
    // Test 'keluar' type
    const keluarInput: CreateCashDrawerInput = {
      type: 'keluar',
      amount: 50000,
      description: 'Pengeluaran untuk keperluan operasional'
    };

    const keluarResult = await createCashDrawerEntry(keluarInput, testUserId);
    expect(keluarResult.type).toEqual('keluar');
    expect(keluarResult.amount).toEqual(50000);

    // Test 'saldo_awal' type
    const saldoAwalInput: CreateCashDrawerInput = {
      type: 'saldo_awal',
      amount: 200000,
      description: 'Saldo kas awal hari'
    };

    const saldoAwalResult = await createCashDrawerEntry(saldoAwalInput, testUserId);
    expect(saldoAwalResult.type).toEqual('saldo_awal');
    expect(saldoAwalResult.amount).toEqual(200000);
  });

  it('should handle decimal amounts correctly', async () => {
    const decimalInput: CreateCashDrawerInput = {
      type: 'masuk',
      amount: 75500.50,
      description: 'Test decimal amount'
    };

    const result = await createCashDrawerEntry(decimalInput, testUserId);

    expect(result.amount).toEqual(75500.50);
    expect(typeof result.amount).toEqual('number');

    // Verify in database
    const entries = await db.select()
      .from(cashDrawerTable)
      .where(eq(cashDrawerTable.id, result.id))
      .execute();

    expect(parseFloat(entries[0].amount)).toEqual(75500.50);
  });
});
