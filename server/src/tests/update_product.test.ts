
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type CreateProductInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

// Helper to create a test product
const createTestProduct = async (): Promise<number> => {
  const testProduct: CreateProductInput = {
    name: 'Original Product',
    sku: 'ORIG-001',
    barcode: '1234567890',
    type: 'fisik',
    category: 'Electronics',
    cost_price: 50.00,
    selling_price: 75.00,
    stock_quantity: 100,
    min_stock_alert: 10
  };

  const result = await db.insert(productsTable)
    .values({
      ...testProduct,
      cost_price: testProduct.cost_price.toString(),
      selling_price: testProduct.selling_price.toString()
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update product fields', async () => {
    const productId = await createTestProduct();

    const updateInput: UpdateProductInput = {
      id: productId,
      name: 'Updated Product',
      selling_price: 85.00,
      stock_quantity: 150,
      is_active: false
    };

    const result = await updateProduct(updateInput);

    expect(result.id).toEqual(productId);
    expect(result.name).toEqual('Updated Product');
    expect(result.selling_price).toEqual(85.00);
    expect(typeof result.selling_price).toEqual('number');
    expect(result.stock_quantity).toEqual(150);
    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Unchanged fields should remain the same
    expect(result.sku).toEqual('ORIG-001');
    expect(result.cost_price).toEqual(50.00);
    expect(typeof result.cost_price).toEqual('number');
  });

  it('should save updated product to database', async () => {
    const productId = await createTestProduct();

    const updateInput: UpdateProductInput = {
      id: productId,
      name: 'Database Updated Product',
      cost_price: 60.00,
      category: 'Updated Category'
    };

    await updateProduct(updateInput);

    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(products).toHaveLength(1);
    const dbProduct = products[0];
    expect(dbProduct.name).toEqual('Database Updated Product');
    expect(parseFloat(dbProduct.cost_price)).toEqual(60.00);
    expect(dbProduct.category).toEqual('Updated Category');
    expect(dbProduct.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    const productId = await createTestProduct();

    const updateInput: UpdateProductInput = {
      id: productId,
      stock_quantity: 200
    };

    const result = await updateProduct(updateInput);

    // Only stock_quantity should change
    expect(result.stock_quantity).toEqual(200);
    
    // Other fields should remain unchanged
    expect(result.name).toEqual('Original Product');
    expect(result.selling_price).toEqual(75.00);
    expect(result.cost_price).toEqual(50.00);
    expect(result.sku).toEqual('ORIG-001');
    expect(result.is_active).toEqual(true);
  });

  it('should handle nullable fields correctly', async () => {
    const productId = await createTestProduct();

    const updateInput: UpdateProductInput = {
      id: productId,
      sku: null,
      barcode: null,
      category: null,
      min_stock_alert: null
    };

    const result = await updateProduct(updateInput);

    expect(result.sku).toBeNull();
    expect(result.barcode).toBeNull();
    expect(result.category).toBeNull();
    expect(result.min_stock_alert).toBeNull();
  });

  it('should throw error for non-existent product', async () => {
    const updateInput: UpdateProductInput = {
      id: 99999,
      name: 'Non-existent Product'
    };

    await expect(updateProduct(updateInput)).rejects.toThrow(/product with id 99999 not found/i);
  });

  it('should update timestamp correctly', async () => {
    const productId = await createTestProduct();

    // Get original timestamp
    const originalProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();
    const originalUpdatedAt = originalProducts[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateProductInput = {
      id: productId,
      name: 'Timestamp Test'
    };

    const result = await updateProduct(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});
