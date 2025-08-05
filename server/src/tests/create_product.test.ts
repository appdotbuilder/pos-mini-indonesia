
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, digitalBalancesTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

// Test input for physical product
const physicalProductInput: CreateProductInput = {
  name: 'Test Physical Product',
  sku: 'TEST-PHY-001',
  barcode: '1234567890',
  type: 'fisik',
  category: 'Electronics',
  cost_price: 15.50,
  selling_price: 25.99,
  stock_quantity: 100,
  min_stock_alert: 10
};

// Test input for digital product
const digitalProductInput: CreateProductInput = {
  name: 'Test Digital Product',
  sku: 'TEST-DIG-001',
  barcode: null,
  type: 'digital',
  category: 'Software',
  cost_price: 5.00,
  selling_price: 12.00,
  stock_quantity: 0,
  min_stock_alert: null
};

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a physical product', async () => {
    const result = await createProduct(physicalProductInput);

    // Basic field validation
    expect(result.name).toEqual('Test Physical Product');
    expect(result.sku).toEqual('TEST-PHY-001');
    expect(result.barcode).toEqual('1234567890');
    expect(result.type).toEqual('fisik');
    expect(result.category).toEqual('Electronics');
    expect(result.cost_price).toEqual(15.50);
    expect(result.selling_price).toEqual(25.99);
    expect(result.stock_quantity).toEqual(100);
    expect(result.min_stock_alert).toEqual(10);
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric types
    expect(typeof result.cost_price).toBe('number');
    expect(typeof result.selling_price).toBe('number');
  });

  it('should create a digital product with digital balance entry', async () => {
    const result = await createProduct(digitalProductInput);

    // Basic field validation
    expect(result.name).toEqual('Test Digital Product');
    expect(result.sku).toEqual('TEST-DIG-001');
    expect(result.barcode).toBeNull();
    expect(result.type).toEqual('digital');
    expect(result.category).toEqual('Software');
    expect(result.cost_price).toEqual(5.00);
    expect(result.selling_price).toEqual(12.00);
    expect(result.stock_quantity).toEqual(0);
    expect(result.min_stock_alert).toBeNull();
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();

    // Verify digital balance entry was created
    const digitalBalances = await db.select()
      .from(digitalBalancesTable)
      .where(eq(digitalBalancesTable.product_id, result.id))
      .execute();

    expect(digitalBalances).toHaveLength(1);
    expect(digitalBalances[0].product_id).toEqual(result.id);
    expect(parseFloat(digitalBalances[0].balance)).toEqual(0);
    expect(digitalBalances[0].created_at).toBeInstanceOf(Date);
  });

  it('should save product to database', async () => {
    const result = await createProduct(physicalProductInput);

    // Query database directly
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Test Physical Product');
    expect(products[0].sku).toEqual('TEST-PHY-001');
    expect(products[0].type).toEqual('fisik');
    expect(parseFloat(products[0].cost_price)).toEqual(15.50);
    expect(parseFloat(products[0].selling_price)).toEqual(25.99);
    expect(products[0].stock_quantity).toEqual(100);
    expect(products[0].is_active).toEqual(true);
    expect(products[0].created_at).toBeInstanceOf(Date);
  });

  it('should not create digital balance for physical products', async () => {
    const result = await createProduct(physicalProductInput);

    // Verify no digital balance entry was created
    const digitalBalances = await db.select()
      .from(digitalBalancesTable)
      .where(eq(digitalBalancesTable.product_id, result.id))
      .execute();

    expect(digitalBalances).toHaveLength(0);
  });

  it('should handle products with minimal data', async () => {
    const minimalInput: CreateProductInput = {
      name: 'Minimal Product',
      sku: null,
      barcode: null,
      type: 'fisik',
      category: null,
      cost_price: 0,
      selling_price: 1.00,
      stock_quantity: 0,
      min_stock_alert: null
    };

    const result = await createProduct(minimalInput);

    expect(result.name).toEqual('Minimal Product');
    expect(result.sku).toBeNull();
    expect(result.barcode).toBeNull();
    expect(result.category).toBeNull();
    expect(result.cost_price).toEqual(0);
    expect(result.selling_price).toEqual(1.00);
    expect(result.min_stock_alert).toBeNull();
    expect(result.id).toBeDefined();
  });
});
