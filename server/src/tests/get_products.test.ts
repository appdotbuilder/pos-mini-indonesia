
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { getProducts } from '../handlers/get_products';

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getProducts();
    expect(result).toEqual([]);
  });

  it('should return all products', async () => {
    // Create test products
    await db.insert(productsTable).values([
      {
        name: 'Physical Product',
        type: 'fisik',
        category: 'electronics',
        cost_price: '15.50',
        selling_price: '25.99',
        stock_quantity: 100
      },
      {
        name: 'Digital Product',
        type: 'digital',
        category: 'software',
        cost_price: '5.00',
        selling_price: '9.99',
        stock_quantity: 0
      }
    ]).execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);
    
    // Verify first product
    const physicalProduct = result.find(p => p.name === 'Physical Product');
    expect(physicalProduct).toBeDefined();
    expect(physicalProduct!.type).toEqual('fisik');
    expect(physicalProduct!.category).toEqual('electronics');
    expect(physicalProduct!.cost_price).toEqual(15.50);
    expect(physicalProduct!.selling_price).toEqual(25.99);
    expect(physicalProduct!.stock_quantity).toEqual(100);
    expect(physicalProduct!.is_active).toBe(true);
    expect(physicalProduct!.id).toBeDefined();
    expect(physicalProduct!.created_at).toBeInstanceOf(Date);
    expect(physicalProduct!.updated_at).toBeInstanceOf(Date);

    // Verify second product
    const digitalProduct = result.find(p => p.name === 'Digital Product');
    expect(digitalProduct).toBeDefined();
    expect(digitalProduct!.type).toEqual('digital');
    expect(digitalProduct!.category).toEqual('software');
    expect(digitalProduct!.cost_price).toEqual(5.00);
    expect(digitalProduct!.selling_price).toEqual(9.99);
    expect(digitalProduct!.stock_quantity).toEqual(0);
  });

  it('should return products with null fields correctly', async () => {
    // Create product with nullable fields
    await db.insert(productsTable).values({
      name: 'Test Product',
      type: 'fisik',
      sku: null,
      barcode: null,
      category: null,
      cost_price: '10.00',
      selling_price: '20.00',
      stock_quantity: 50,
      min_stock_alert: null
    }).execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Test Product');
    expect(result[0].sku).toBeNull();
    expect(result[0].barcode).toBeNull();
    expect(result[0].category).toBeNull();
    expect(result[0].min_stock_alert).toBeNull();
    expect(result[0].cost_price).toEqual(10.00);
    expect(result[0].selling_price).toEqual(20.00);
  });

  it('should handle numeric type conversions correctly', async () => {
    await db.insert(productsTable).values({
      name: 'Price Test Product',
      type: 'fisik',
      cost_price: '99.99',
      selling_price: '199.95',
      stock_quantity: 25
    }).execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(typeof result[0].cost_price).toBe('number');
    expect(typeof result[0].selling_price).toBe('number');
    expect(result[0].cost_price).toEqual(99.99);
    expect(result[0].selling_price).toEqual(199.95);
  });

  it('should return products ordered by creation date', async () => {
    // Create products with slight delay to ensure different timestamps
    await db.insert(productsTable).values({
      name: 'First Product',
      type: 'fisik',
      cost_price: '10.00',
      selling_price: '15.00',
      stock_quantity: 10
    }).execute();

    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay

    await db.insert(productsTable).values({
      name: 'Second Product',
      type: 'digital',
      cost_price: '5.00',
      selling_price: '10.00',
      stock_quantity: 0
    }).execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('First Product');
    expect(result[1].name).toEqual('Second Product');
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });
});
