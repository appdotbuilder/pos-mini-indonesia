
import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'kasir']);
export const productTypeEnum = pgEnum('product_type', ['fisik', 'digital']);
export const paymentMethodEnum = pgEnum('payment_method', ['tunai', 'digital']);
export const stockMovementTypeEnum = pgEnum('stock_movement_type', ['masuk', 'keluar', 'opname']);
export const cashDrawerTypeEnum = pgEnum('cash_drawer_type', ['masuk', 'keluar', 'saldo_awal']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Products table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  sku: text('sku'),
  barcode: text('barcode'),
  type: productTypeEnum('type').notNull(),
  category: text('category'),
  cost_price: numeric('cost_price', { precision: 10, scale: 2 }).notNull(),
  selling_price: numeric('selling_price', { precision: 10, scale: 2 }).notNull(),
  stock_quantity: integer('stock_quantity').notNull().default(0),
  min_stock_alert: integer('min_stock_alert'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Digital balances table
export const digitalBalancesTable = pgTable('digital_balances', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').notNull().references(() => productsTable.id),
  balance: numeric('balance', { precision: 15, scale: 2 }).notNull().default('0'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  transaction_number: text('transaction_number').notNull().unique(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  payment_method: paymentMethodEnum('payment_method').notNull(),
  payment_received: numeric('payment_received', { precision: 10, scale: 2 }),
  change_amount: numeric('change_amount', { precision: 10, scale: 2 }),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Transaction items table
export const transactionItemsTable = pgTable('transaction_items', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').notNull().references(() => transactionsTable.id),
  product_id: integer('product_id').notNull().references(() => productsTable.id),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  is_digital_sale: boolean('is_digital_sale').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Stock movements table
export const stockMovementsTable = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').notNull().references(() => productsTable.id),
  type: stockMovementTypeEnum('type').notNull(),
  quantity: integer('quantity').notNull(),
  previous_stock: integer('previous_stock').notNull(),
  new_stock: integer('new_stock').notNull(),
  notes: text('notes'),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Cash drawer table
export const cashDrawerTable = pgTable('cash_drawer', {
  id: serial('id').primaryKey(),
  type: cashDrawerTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description').notNull(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  transactions: many(transactionsTable),
  stockMovements: many(stockMovementsTable),
  cashDrawerEntries: many(cashDrawerTable),
}));

export const productsRelations = relations(productsTable, ({ many, one }) => ({
  transactionItems: many(transactionItemsTable),
  stockMovements: many(stockMovementsTable),
  digitalBalance: one(digitalBalancesTable),
}));

export const digitalBalancesRelations = relations(digitalBalancesTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [digitalBalancesTable.product_id],
    references: [productsTable.id],
  }),
}));

export const transactionsRelations = relations(transactionsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [transactionsTable.user_id],
    references: [usersTable.id],
  }),
  items: many(transactionItemsTable),
}));

export const transactionItemsRelations = relations(transactionItemsTable, ({ one }) => ({
  transaction: one(transactionsTable, {
    fields: [transactionItemsTable.transaction_id],
    references: [transactionsTable.id],
  }),
  product: one(productsTable, {
    fields: [transactionItemsTable.product_id],
    references: [productsTable.id],
  }),
}));

export const stockMovementsRelations = relations(stockMovementsTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [stockMovementsTable.product_id],
    references: [productsTable.id],
  }),
  user: one(usersTable, {
    fields: [stockMovementsTable.user_id],
    references: [usersTable.id],
  }),
}));

export const cashDrawerRelations = relations(cashDrawerTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [cashDrawerTable.user_id],
    references: [usersTable.id],
  }),
}));

// Export all tables
export const tables = {
  users: usersTable,
  products: productsTable,
  digitalBalances: digitalBalancesTable,
  transactions: transactionsTable,
  transactionItems: transactionItemsTable,
  stockMovements: stockMovementsTable,
  cashDrawer: cashDrawerTable,
};
