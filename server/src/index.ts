
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createUserInputSchema, 
  updateUserInputSchema,
  createProductInputSchema,
  updateProductInputSchema,
  updateDigitalBalanceInputSchema,
  createTransactionInputSchema,
  createStockMovementInputSchema,
  createCashDrawerInputSchema,
  reportPeriodInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { updateUser } from './handlers/update_user';
import { getUsers } from './handlers/get_users';
import { createProduct } from './handlers/create_product';
import { updateProduct } from './handlers/update_product';
import { getProducts } from './handlers/get_products';
import { searchProducts } from './handlers/search_products';
import { updateDigitalBalance } from './handlers/update_digital_balance';
import { getDigitalBalances } from './handlers/get_digital_balances';
import { createTransaction } from './handlers/create_transaction';
import { getTransactions } from './handlers/get_transactions';
import { createStockMovement } from './handlers/create_stock_movement';
import { getStockMovements } from './handlers/get_stock_movements';
import { createCashDrawerEntry } from './handlers/create_cash_drawer_entry';
import { getCashDrawerEntries } from './handlers/get_cash_drawer_entries';
import { getCashDrawerBalance } from './handlers/get_cash_drawer_balance';
import { getSalesReport } from './handlers/get_sales_report';
import { getProfitReport } from './handlers/get_profit_report';
import { getTopProducts } from './handlers/get_top_products';
import { getLowStockProducts } from './handlers/get_low_stock_products';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  // Product management routes
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),
  
  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),
  
  getProducts: publicProcedure
    .query(() => getProducts()),
  
  searchProducts: publicProcedure
    .input(z.string())
    .query(({ input }) => searchProducts(input)),
  
  getLowStockProducts: publicProcedure
    .query(() => getLowStockProducts()),
  
  // Digital balance management
  updateDigitalBalance: publicProcedure
    .input(updateDigitalBalanceInputSchema)
    .mutation(({ input }) => updateDigitalBalance(input)),
  
  getDigitalBalances: publicProcedure
    .query(() => getDigitalBalances()),
  
  // Transaction routes (POS)
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input, 1)), // TODO: Get actual user ID from context
  
  getTransactions: publicProcedure
    .query(() => getTransactions()),
  
  // Stock management routes
  createStockMovement: publicProcedure
    .input(createStockMovementInputSchema)
    .mutation(({ input }) => createStockMovement(input, 1)), // TODO: Get actual user ID from context
  
  getStockMovements: publicProcedure
    .query(() => getStockMovements()),
  
  // Cash drawer routes
  createCashDrawerEntry: publicProcedure
    .input(createCashDrawerInputSchema)
    .mutation(({ input }) => createCashDrawerEntry(input, 1)), // TODO: Get actual user ID from context
  
  getCashDrawerEntries: publicProcedure
    .query(() => getCashDrawerEntries()),
  
  getCashDrawerBalance: publicProcedure
    .query(() => getCashDrawerBalance()),
  
  // Reporting routes
  getSalesReport: publicProcedure
    .input(reportPeriodInputSchema)
    .query(({ input }) => getSalesReport(input)),
  
  getProfitReport: publicProcedure
    .input(reportPeriodInputSchema)
    .query(({ input }) => getProfitReport(input)),
  
  getTopProducts: publicProcedure
    .input(reportPeriodInputSchema)
    .query(({ input }) => getTopProducts(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
