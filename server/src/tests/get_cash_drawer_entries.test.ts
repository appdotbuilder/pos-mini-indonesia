
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, cashDrawerTable } from '../db/schema';
import { getCashDrawerEntries } from '../handlers/get_cash_drawer_entries';

describe('getCashDrawerEntries', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no entries exist', async () => {
    const result = await getCashDrawerEntries();
    expect(result).toEqual([]);
  });

  it('should fetch all cash drawer entries', async () => {
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

    const userId = userResult[0].id;

    // Create test cash drawer entries
    await db.insert(cashDrawerTable)
      .values([
        {
          type: 'saldo_awal',
          amount: '1000.00',
          description: 'Opening balance',
          user_id: userId
        },
        {
          type: 'masuk',
          amount: '500.50',
          description: 'Cash sale',
          user_id: userId
        },
        {
          type: 'keluar',
          amount: '50.25',
          description: 'Petty cash',
          user_id: userId
        }
      ])
      .execute();

    const result = await getCashDrawerEntries();

    expect(result).toHaveLength(3);
    
    // Verify numeric conversion
    result.forEach(entry => {
      expect(typeof entry.amount).toBe('number');
      expect(entry.id).toBeDefined();
      expect(entry.user_id).toBe(userId);
      expect(entry.created_at).toBeInstanceOf(Date);
    });

    // Verify specific entries
    const openingBalance = result.find(e => e.type === 'saldo_awal');
    expect(openingBalance?.amount).toBe(1000);
    expect(openingBalance?.description).toBe('Opening balance');

    const cashIn = result.find(e => e.type === 'masuk');
    expect(cashIn?.amount).toBe(500.5);
    expect(cashIn?.description).toBe('Cash sale');

    const cashOut = result.find(e => e.type === 'keluar');
    expect(cashOut?.amount).toBe(50.25);
    expect(cashOut?.description).toBe('Petty cash');
  });

  it('should return entries ordered by created_at descending', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create entries with slight delay to ensure different timestamps
    await db.insert(cashDrawerTable)
      .values({
        type: 'saldo_awal',
        amount: '1000.00',
        description: 'First entry',
        user_id: userId
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(cashDrawerTable)
      .values({
        type: 'masuk',
        amount: '200.00',
        description: 'Second entry',
        user_id: userId
      })
      .execute();

    const result = await getCashDrawerEntries();

    expect(result).toHaveLength(2);
    
    // Most recent entry should be first (descending order)
    expect(result[0].description).toBe('Second entry');
    expect(result[1].description).toBe('First entry');
    
    // Verify timestamps are in descending order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });
});
