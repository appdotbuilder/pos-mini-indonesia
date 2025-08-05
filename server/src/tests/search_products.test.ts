
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { searchProducts } from '../handlers/search_products';

// Test products data
const testProducts: CreateProductInput[] = [
  {
    name: 'Smartphone Samsung Galaxy',
    sku: 'PHONE-001',
    barcode: '1234567890123',
    type: 'fisik',
    category: 'Electronics',
    cost_price: 500.00,
    selling_price: 699.99,
    stock_quantity: 10,
    min_stock_alert: 2
  },
  {
    name: 'iPhone 15 Pro',
    sku: 'PHONE-002', 
    barcode: '2345678901234',
    type: 'fisik',
    category: 'Electronics',
    cost_price: 800.00,
    selling_price: 1199.99,
    stock_quantity: 5,
    min_stock_alert: 1
  },
  {
    name: 'Digital Voucher Game',
    sku: 'VOUCHER-001',
    barcode: null,
    type: 'digital',
    category: 'Gaming',
    cost_price: 10.00,
    selling_price: 15.00,
    stock_quantity: 100,
    min_stock_alert: 10
  },
  {
    name: 'Inactive Product',
    sku: 'INACTIVE-001',
    barcode: '9999999999999',
    type: 'fisik',
    category: 'Test',
    cost_price: 1.00,
    selling_price: 2.00,
    stock_quantity: 1,
    min_stock_alert: null
  }
];

describe('searchProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all active products when query is empty', async () => {
    // Insert test products
    await db.insert(productsTable).values([
      {
        ...testProducts[0],
        cost_price: testProducts[0].cost_price.toString(),
        selling_price: testProducts[0].selling_price.toString()
      },
      {
        ...testProducts[1],
        cost_price: testProducts[1].cost_price.toString(),
        selling_price: testProducts[1].selling_price.toString()
      },
      {
        ...testProducts[2],
        cost_price: testProducts[2].cost_price.toString(),
        selling_price: testProducts[2].selling_price.toString()
      },
      {
        ...testProducts[3],
        cost_price: testProducts[3].cost_price.toString(),
        selling_price: testProducts[3].selling_price.toString(),
        is_active: false // Make this product inactive
      }
    ]).execute();

    const results = await searchProducts('');

    // Should return only active products (first 3)
    expect(results).toHaveLength(3);
    results.forEach(product => {
      expect(product.is_active).toBe(true);
      expect(typeof product.cost_price).toBe('number');
      expect(typeof product.selling_price).toBe('number');
    });
  });

  it('should search products by name case-insensitively', async () => {
    // Insert test products
    await db.insert(productsTable).values([
      {
        ...testProducts[0],
        cost_price: testProducts[0].cost_price.toString(),
        selling_price: testProducts[0].selling_price.toString()
      },
      {
        ...testProducts[1],
        cost_price: testProducts[1].cost_price.toString(),
        selling_price: testProducts[1].selling_price.toString()
      }
    ]).execute();

    const results = await searchProducts('samsung');

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Smartphone Samsung Galaxy');
    expect(results[0].sku).toEqual('PHONE-001');
    expect(results[0].cost_price).toEqual(500.00);
    expect(results[0].selling_price).toEqual(699.99);
  });

  it('should search products by SKU', async () => {
    // Insert test products
    await db.insert(productsTable).values([
      {
        ...testProducts[0],
        cost_price: testProducts[0].cost_price.toString(),
        selling_price: testProducts[0].selling_price.toString()
      },
      {
        ...testProducts[2],
        cost_price: testProducts[2].cost_price.toString(),
        selling_price: testProducts[2].selling_price.toString()
      }
    ]).execute();

    const results = await searchProducts('VOUCHER');

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Digital Voucher Game');
    expect(results[0].sku).toEqual('VOUCHER-001');
    expect(results[0].type).toEqual('digital');
  });

  it('should search products by barcode', async () => {
    // Insert test products
    await db.insert(productsTable).values([
      {
        ...testProducts[0],
        cost_price: testProducts[0].cost_price.toString(),
        selling_price: testProducts[0].selling_price.toString()
      },
      {
        ...testProducts[1],
        cost_price: testProducts[1].cost_price.toString(),
        selling_price: testProducts[1].selling_price.toString()
      }
    ]).execute();

    const results = await searchProducts('2345678901234');

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('iPhone 15 Pro');
    expect(results[0].barcode).toEqual('2345678901234');
  });

  it('should return multiple matching products', async () => {
    // Insert test products
    await db.insert(productsTable).values([
      {
        ...testProducts[0],
        cost_price: testProducts[0].cost_price.toString(),
        selling_price: testProducts[0].selling_price.toString()
      },
      {
        ...testProducts[1],
        cost_price: testProducts[1].cost_price.toString(),
        selling_price: testProducts[1].selling_price.toString()
      }
    ]).execute();

    const results = await searchProducts('PHONE');

    expect(results).toHaveLength(2);
    expect(results.some(p => p.name === 'Smartphone Samsung Galaxy')).toBe(true);
    expect(results.some(p => p.name === 'iPhone 15 Pro')).toBe(true);
  });

  it('should exclude inactive products from search results', async () => {
    // Insert test products including inactive one
    await db.insert(productsTable).values([
      {
        ...testProducts[0],
        cost_price: testProducts[0].cost_price.toString(),
        selling_price: testProducts[0].selling_price.toString()
      },
      {
        ...testProducts[3],
        cost_price: testProducts[3].cost_price.toString(),
        selling_price: testProducts[3].selling_price.toString(),
        is_active: false
      }
    ]).execute();

    const results = await searchProducts('Product');

    // Should not return the inactive product
    expect(results).toHaveLength(0);
  });

  it('should return empty array when no products match', async () => {
    // Insert test products
    await db.insert(productsTable).values([
      {
        ...testProducts[0],
        cost_price: testProducts[0].cost_price.toString(),
        selling_price: testProducts[0].selling_price.toString()
      }
    ]).execute();

    const results = await searchProducts('nonexistent');

    expect(results).toHaveLength(0);
  });

  it('should handle whitespace in search query', async () => {
    // Insert test products
    await db.insert(productsTable).values([
      {
        ...testProducts[0],
        cost_price: testProducts[0].cost_price.toString(),
        selling_price: testProducts[0].selling_price.toString()
      }
    ]).execute();

    const results = await searchProducts('  samsung  ');

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Smartphone Samsung Galaxy');
  });
});
