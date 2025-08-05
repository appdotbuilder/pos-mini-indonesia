
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { cashDrawerTable, usersTable } from '../db/schema';
import { getCashDrawerBalance } from '../handlers/get_cash_drawer_balance';

describe('getCashDrawerBalance', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero balance when no entries exist', async () => {
    const result = await getCashDrawerBalance();

    expect(result.balance).toEqual(0);
    expect(typeof result.balance).toBe('number');
  });

  it('should calculate balance with single entry', async () => {
    // Create test user first
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'kasir'
      })
      .returning()
      .execute();

    // Add initial balance
    await db.insert(cashDrawerTable)
      .values({
        type: 'saldo_awal',
        amount: '100.00',
        description: 'Initial balance',
        user_id: user[0].id
      })
      .execute();

    const result = await getCashDrawerBalance();

    expect(result.balance).toEqual(100);
  });

  it('should calculate balance with multiple entry types', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'kasir'
      })
      .returning()
      .execute();

    // Add various cash drawer entries
    await db.insert(cashDrawerTable)
      .values([
        {
          type: 'saldo_awal',
          amount: '500.00',
          description: 'Opening balance',
          user_id: user[0].id
        },
        {
          type: 'masuk',
          amount: '250.75',
          description: 'Cash in',
          user_id: user[0].id
        },
        {
          type: 'keluar',
          amount: '100.25',
          description: 'Cash out',
          user_id: user[0].id
        },
        {
          type: 'masuk',
          amount: '50.00',
          description: 'More cash in',
          user_id: user[0].id
        }
      ])
      .execute();

    const result = await getCashDrawerBalance();

    // Expected: 500.00 + 250.75 - 100.25 + 50.00 = 700.50
    expect(result.balance).toEqual(700.50);
  });

  it('should handle negative balance correctly', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'kasir'
      })
      .returning()
      .execute();

    // Add entries that result in negative balance
    await db.insert(cashDrawerTable)
      .values([
        {
          type: 'saldo_awal',
          amount: '100.00',
          description: 'Opening balance',
          user_id: user[0].id
        },
        {
          type: 'keluar',
          amount: '150.00',
          description: 'Large withdrawal',
          user_id: user[0].id
        }
      ])
      .execute();

    const result = await getCashDrawerBalance();

    // Expected: 100.00 - 150.00 = -50.00
    expect(result.balance).toEqual(-50);
  });

  it('should handle decimal amounts correctly', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'kasir'
      })
      .returning()
      .execute();

    // Add entries with decimal amounts
    await db.insert(cashDrawerTable)
      .values([
        {
          type: 'saldo_awal',
          amount: '99.99',
          description: 'Opening balance',
          user_id: user[0].id
        },
        {
          type: 'masuk',
          amount: '0.01',
          description: 'Small amount',
          user_id: user[0].id
        }
      ])
      .execute();

    const result = await getCashDrawerBalance();

    // Expected: 99.99 + 0.01 = 100.00
    expect(result.balance).toEqual(100);
  });
});
