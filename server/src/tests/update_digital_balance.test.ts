
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { digitalBalancesTable, productsTable } from '../db/schema';
import { type UpdateDigitalBalanceInput } from '../schema';
import { updateDigitalBalance } from '../handlers/update_digital_balance';
import { eq } from 'drizzle-orm';

describe('updateDigitalBalance', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let digitalProductId: number;
  let physicalProductId: number;

  beforeEach(async () => {
    // Create test products
    const digitalProduct = await db.insert(productsTable)
      .values({
        name: 'Digital Product',
        type: 'digital',
        cost_price: '10.00',
        selling_price: '15.00',
        stock_quantity: 0
      })
      .returning()
      .execute();
    digitalProductId = digitalProduct[0].id;

    const physicalProduct = await db.insert(productsTable)
      .values({
        name: 'Physical Product',
        type: 'fisik',
        cost_price: '5.00',
        selling_price: '10.00',
        stock_quantity: 100
      })
      .returning()
      .execute();
    physicalProductId = physicalProduct[0].id;
  });

  const testInput: UpdateDigitalBalanceInput = {
    product_id: 0, // Will be set in tests
    balance: 1000.50
  };

  it('should create new digital balance record', async () => {
    const input = { ...testInput, product_id: digitalProductId };
    const result = await updateDigitalBalance(input);

    expect(result.product_id).toEqual(digitalProductId);
    expect(result.balance).toEqual(1000.50);
    expect(typeof result.balance).toBe('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update existing digital balance record', async () => {
    const input = { ...testInput, product_id: digitalProductId };
    
    // Create initial balance
    await updateDigitalBalance(input);

    // Update with new balance
    const updatedInput = { ...input, balance: 2000.75 };
    const result = await updateDigitalBalance(updatedInput);

    expect(result.product_id).toEqual(digitalProductId);
    expect(result.balance).toEqual(2000.75);
    expect(typeof result.balance).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify only one record exists in database
    const balances = await db.select()
      .from(digitalBalancesTable)
      .where(eq(digitalBalancesTable.product_id, digitalProductId))
      .execute();

    expect(balances).toHaveLength(1);
    expect(parseFloat(balances[0].balance)).toEqual(2000.75);
  });

  it('should save balance to database correctly', async () => {
    const input = { ...testInput, product_id: digitalProductId };
    const result = await updateDigitalBalance(input);

    const balances = await db.select()
      .from(digitalBalancesTable)
      .where(eq(digitalBalancesTable.product_id, digitalProductId))
      .execute();

    expect(balances).toHaveLength(1);
    expect(balances[0].product_id).toEqual(digitalProductId);
    expect(parseFloat(balances[0].balance)).toEqual(1000.50);
    expect(balances[0].created_at).toBeInstanceOf(Date);
    expect(balances[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent product', async () => {
    const input = { ...testInput, product_id: 99999 };

    await expect(updateDigitalBalance(input)).rejects.toThrow(/product.*not found/i);
  });

  it('should throw error for physical product', async () => {
    const input = { ...testInput, product_id: physicalProductId };

    await expect(updateDigitalBalance(input)).rejects.toThrow(/not a digital product/i);
  });

  it('should handle zero balance correctly', async () => {
    const input = { ...testInput, product_id: digitalProductId, balance: 0 };
    const result = await updateDigitalBalance(input);

    expect(result.balance).toEqual(0);
    expect(typeof result.balance).toBe('number');

    const balances = await db.select()
      .from(digitalBalancesTable)
      .where(eq(digitalBalancesTable.product_id, digitalProductId))
      .execute();

    expect(parseFloat(balances[0].balance)).toEqual(0);
  });

  it('should handle large decimal values correctly', async () => {
    const input = { ...testInput, product_id: digitalProductId, balance: 999999.99 };
    const result = await updateDigitalBalance(input);

    expect(result.balance).toEqual(999999.99);
    expect(typeof result.balance).toBe('number');

    const balances = await db.select()
      .from(digitalBalancesTable)
      .where(eq(digitalBalancesTable.product_id, digitalProductId))
      .execute();

    expect(parseFloat(balances[0].balance)).toEqual(999999.99);
  });
});
