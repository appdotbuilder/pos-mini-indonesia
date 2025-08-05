
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, digitalBalancesTable, usersTable } from '../db/schema';
import { getDigitalBalances } from '../handlers/get_digital_balances';

describe('getDigitalBalances', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no digital balances exist', async () => {
    const result = await getDigitalBalances();
    expect(result).toEqual([]);
  });

  it('should return all digital balances with proper field types', async () => {
    // Create a user first (required for foreign key)
    const users = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashedpassword123',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create digital products
    const products = await db.insert(productsTable)
      .values([
        {
          name: 'Digital Product 1',
          type: 'digital',
          cost_price: '10.00',
          selling_price: '15.00',
          stock_quantity: 0
        },
        {
          name: 'Digital Product 2', 
          type: 'digital',
          cost_price: '20.00',
          selling_price: '30.00',
          stock_quantity: 0
        }
      ])
      .returning()
      .execute();

    // Create digital balances
    await db.insert(digitalBalancesTable)
      .values([
        {
          product_id: products[0].id,
          balance: '100.50'
        },
        {
          product_id: products[1].id,
          balance: '250.75'
        }
      ])
      .execute();

    const result = await getDigitalBalances();

    expect(result).toHaveLength(2);
    
    // Check first balance
    expect(result[0].product_id).toEqual(products[0].id);
    expect(result[0].balance).toEqual(100.50);
    expect(typeof result[0].balance).toBe('number');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Check second balance
    expect(result[1].product_id).toEqual(products[1].id);
    expect(result[1].balance).toEqual(250.75);
    expect(typeof result[1].balance).toBe('number');
    expect(result[1].id).toBeDefined();
    expect(result[1].created_at).toBeInstanceOf(Date);
    expect(result[1].updated_at).toBeInstanceOf(Date);
  });

  it('should only return balances for products that exist', async () => {
    // Create a user first (required for foreign key)
    const users = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashedpassword123',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create a digital product
    const products = await db.insert(productsTable)
      .values({
        name: 'Valid Digital Product',
        type: 'digital',
        cost_price: '10.00',
        selling_price: '15.00',
        stock_quantity: 0
      })
      .returning()
      .execute();

    // Create digital balance
    await db.insert(digitalBalancesTable)
      .values({
        product_id: products[0].id,
        balance: '75.25'
      })
      .execute();

    const result = await getDigitalBalances();

    expect(result).toHaveLength(1);
    expect(result[0].product_id).toEqual(products[0].id);
    expect(result[0].balance).toEqual(75.25);
  });

  it('should handle zero balance correctly', async () => {
    // Create a user first (required for foreign key)
    const users = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashedpassword123',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create digital product
    const products = await db.insert(productsTable)
      .values({
        name: 'Zero Balance Product',
        type: 'digital',
        cost_price: '5.00',
        selling_price: '10.00',
        stock_quantity: 0
      })
      .returning()
      .execute();

    // Create digital balance with zero value
    await db.insert(digitalBalancesTable)
      .values({
        product_id: products[0].id,
        balance: '0.00'
      })
      .execute();

    const result = await getDigitalBalances();

    expect(result).toHaveLength(1);
    expect(result[0].balance).toEqual(0);
    expect(typeof result[0].balance).toBe('number');
  });
});
