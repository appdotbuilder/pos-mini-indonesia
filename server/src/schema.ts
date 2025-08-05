
import { z } from 'zod';

// User schemas
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  full_name: z.string(),
  role: z.enum(['admin', 'kasir']),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  username: z.string().min(3),
  full_name: z.string().min(2),
  password: z.string().min(6),
  role: z.enum(['admin', 'kasir'])
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).optional(),
  full_name: z.string().min(2).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['admin', 'kasir']).optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Product schemas
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  sku: z.string().nullable(),
  barcode: z.string().nullable(),
  type: z.enum(['fisik', 'digital']),
  category: z.string().nullable(),
  cost_price: z.number(),
  selling_price: z.number(),
  stock_quantity: z.number().int(),
  min_stock_alert: z.number().int().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

export const createProductInputSchema = z.object({
  name: z.string().min(1),
  sku: z.string().nullable(),
  barcode: z.string().nullable(),
  type: z.enum(['fisik', 'digital']),
  category: z.string().nullable(),
  cost_price: z.number().nonnegative(),
  selling_price: z.number().positive(),
  stock_quantity: z.number().int().nonnegative(),
  min_stock_alert: z.number().int().nonnegative().nullable()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  type: z.enum(['fisik', 'digital']).optional(),
  category: z.string().nullable().optional(),
  cost_price: z.number().nonnegative().optional(),
  selling_price: z.number().positive().optional(),
  stock_quantity: z.number().int().nonnegative().optional(),
  min_stock_alert: z.number().int().nonnegative().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Digital balance schemas
export const digitalBalanceSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  balance: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type DigitalBalance = z.infer<typeof digitalBalanceSchema>;

export const updateDigitalBalanceInputSchema = z.object({
  product_id: z.number(),
  balance: z.number().nonnegative()
});

export type UpdateDigitalBalanceInput = z.infer<typeof updateDigitalBalanceInputSchema>;

// Transaction schemas
export const transactionSchema = z.object({
  id: z.number(),
  transaction_number: z.string(),
  user_id: z.number(),
  total_amount: z.number(),
  payment_method: z.enum(['tunai', 'digital']),
  payment_received: z.number().nullable(),
  change_amount: z.number().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

export const transactionItemSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int(),
  unit_price: z.number(),
  total_price: z.number(),
  is_digital_sale: z.boolean(),
  created_at: z.coerce.date()
});

export type TransactionItem = z.infer<typeof transactionItemSchema>;

export const createTransactionInputSchema = z.object({
  items: z.array(z.object({
    product_id: z.number(),
    quantity: z.number().int().positive(),
    unit_price: z.number().positive(),
    is_digital_sale: z.boolean().default(false)
  })),
  payment_method: z.enum(['tunai', 'digital']),
  payment_received: z.number().positive().nullable(),
  notes: z.string().nullable()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Stock movement schemas
export const stockMovementSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  type: z.enum(['masuk', 'keluar', 'opname']),
  quantity: z.number().int(),
  previous_stock: z.number().int(),
  new_stock: z.number().int(),
  notes: z.string().nullable(),
  user_id: z.number(),
  created_at: z.coerce.date()
});

export type StockMovement = z.infer<typeof stockMovementSchema>;

export const createStockMovementInputSchema = z.object({
  product_id: z.number(),
  type: z.enum(['masuk', 'keluar', 'opname']),
  quantity: z.number().int(),
  notes: z.string().nullable()
});

export type CreateStockMovementInput = z.infer<typeof createStockMovementInputSchema>;

// Cash drawer schemas
export const cashDrawerSchema = z.object({
  id: z.number(),
  type: z.enum(['masuk', 'keluar', 'saldo_awal']),
  amount: z.number(),
  description: z.string(),
  user_id: z.number(),
  created_at: z.coerce.date()
});

export type CashDrawer = z.infer<typeof cashDrawerSchema>;

export const createCashDrawerInputSchema = z.object({
  type: z.enum(['masuk', 'keluar', 'saldo_awal']),
  amount: z.number().positive(),
  description: z.string().min(1)
});

export type CreateCashDrawerInput = z.infer<typeof createCashDrawerInputSchema>;

// Report schemas
export const salesReportSchema = z.object({
  date: z.string(),
  total_transactions: z.number().int(),
  total_revenue: z.number(),
  total_profit: z.number(),
  physical_sales: z.number(),
  digital_sales: z.number()
});

export type SalesReport = z.infer<typeof salesReportSchema>;

export const topProductSchema = z.object({
  product_id: z.number(),
  product_name: z.string(),
  total_quantity: z.number().int(),
  total_revenue: z.number()
});

export type TopProduct = z.infer<typeof topProductSchema>;

export const reportPeriodInputSchema = z.object({
  start_date: z.string(),
  end_date: z.string()
});

export type ReportPeriodInput = z.infer<typeof reportPeriodInputSchema>;
