
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { getLowStockProducts } from '../handlers/get_low_stock_products';

// Test products with different stock scenarios
const lowStockProduct: CreateProductInput = {
  name: 'Low Stock Product',
  sku: 'LSP001',
  barcode: '1234567890',
  type: 'fisik',
  category: 'Electronics',
  cost_price: 10.00,
  selling_price: 15.00,
  stock_quantity: 5,
  min_stock_alert: 10
};

const criticalStockProduct: CreateProductInput = {
  name: 'Critical Stock Product',
  sku: 'CSP001',
  barcode: '0987654321',
  type: 'fisik',
  category: 'Accessories',
  cost_price: 20.00,
  selling_price: 35.00,
  stock_quantity: 2,
  min_stock_alert: 5
};

const healthyStockProduct: CreateProductInput = {
  name: 'Healthy Stock Product',
  sku: 'HSP001',
  barcode: '1122334455',
  type: 'fisik',
  category: 'Tools',
  cost_price: 8.00,
  selling_price: 12.00,
  stock_quantity: 50,
  min_stock_alert: 10
};

const noAlertProduct: CreateProductInput = {
  name: 'No Alert Product',
  sku: 'NAP001',
  barcode: '5544332211',
  type: 'digital',
  category: 'Software',
  cost_price: 5.00,
  selling_price: 25.00,
  stock_quantity: 0,
  min_stock_alert: null
};

describe('getLowStockProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return products with stock below or equal to min_stock_alert', async () => {
    // Create test products
    await db.insert(productsTable).values([
      {
        ...lowStockProduct,
        cost_price: lowStockProduct.cost_price.toString(),
        selling_price: lowStockProduct.selling_price.toString()
      },
      {
        ...criticalStockProduct,
        cost_price: criticalStockProduct.cost_price.toString(),
        selling_price: criticalStockProduct.selling_price.toString()
      },
      {
        ...healthyStockProduct,
        cost_price: healthyStockProduct.cost_price.toString(),
        selling_price: healthyStockProduct.selling_price.toString()
      }
    ]).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(2);
    
    // Verify low stock product is included
    const lowStock = result.find(p => p.name === 'Low Stock Product');
    expect(lowStock).toBeDefined();
    expect(lowStock!.stock_quantity).toBe(5);
    expect(lowStock!.min_stock_alert).toBe(10);
    expect(typeof lowStock!.cost_price).toBe('number');
    expect(typeof lowStock!.selling_price).toBe('number');

    // Verify critical stock product is included
    const criticalStock = result.find(p => p.name === 'Critical Stock Product');
    expect(criticalStock).toBeDefined();
    expect(criticalStock!.stock_quantity).toBe(2);
    expect(criticalStock!.min_stock_alert).toBe(5);

    // Verify healthy stock product is NOT included
    const healthyStock = result.find(p => p.name === 'Healthy Stock Product');
    expect(healthyStock).toBeUndefined();
  });

  it('should exclude products without min_stock_alert set', async () => {
    // Create product without min_stock_alert
    await db.insert(productsTable).values({
      ...noAlertProduct,
      cost_price: noAlertProduct.cost_price.toString(),
      selling_price: noAlertProduct.selling_price.toString()
    }).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(0);
  });

  it('should exclude inactive products', async () => {
    // Create inactive product with low stock
    await db.insert(productsTable).values({
      ...lowStockProduct,
      cost_price: lowStockProduct.cost_price.toString(),
      selling_price: lowStockProduct.selling_price.toString(),
      is_active: false
    }).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(0);
  });

  it('should include products with stock equal to min_stock_alert', async () => {
    // Create product with stock exactly equal to alert threshold
    await db.insert(productsTable).values({
      name: 'Equal Stock Product',
      sku: 'ESP001',
      barcode: '9988776655',
      type: 'fisik',
      category: 'Test',
      cost_price: '15.00',
      selling_price: '25.00',
      stock_quantity: 10,
      min_stock_alert: 10
    }).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Equal Stock Product');
    expect(result[0].stock_quantity).toBe(10);
    expect(result[0].min_stock_alert).toBe(10);
  });

  it('should return empty array when no low stock products exist', async () => {
    // Create only healthy stock products
    await db.insert(productsTable).values({
      ...healthyStockProduct,
      cost_price: healthyStockProduct.cost_price.toString(),
      selling_price: healthyStockProduct.selling_price.toString()
    }).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(0);
  });
});
