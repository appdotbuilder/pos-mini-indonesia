
import { db } from '../db';
import { transactionItemsTable, transactionsTable, productsTable } from '../db/schema';
import { type ReportPeriodInput } from '../schema';
import { eq, gte, lte, and, sql } from 'drizzle-orm';

export async function getProfitReport(input: ReportPeriodInput): Promise<{ total_profit: number; total_revenue: number; profit_margin: number }> {
  try {
    // Parse date strings to Date objects for filtering
    const startDate = new Date(input.start_date);
    const endDate = new Date(input.end_date);
    // Set end date to end of day to include the entire end date
    endDate.setHours(23, 59, 59, 999);

    // First, let's get all transaction items with their costs and revenues in the date range
    const results = await db
      .select({
        quantity: transactionItemsTable.quantity,
        total_price: transactionItemsTable.total_price,
        cost_price: productsTable.cost_price,
        created_at: transactionsTable.created_at
      })
      .from(transactionItemsTable)
      .innerJoin(transactionsTable, eq(transactionItemsTable.transaction_id, transactionsTable.id))
      .innerJoin(productsTable, eq(transactionItemsTable.product_id, productsTable.id))
      .where(
        and(
          gte(transactionsTable.created_at, startDate),
          lte(transactionsTable.created_at, endDate)
        )
      )
      .execute();

    // Calculate totals manually
    let totalRevenue = 0;
    let totalCost = 0;

    for (const item of results) {
      totalRevenue += parseFloat(item.total_price);
      totalCost += item.quantity * parseFloat(item.cost_price);
    }

    const totalProfit = totalRevenue - totalCost;
    
    // Calculate profit margin as percentage
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      total_profit: totalProfit,
      total_revenue: totalRevenue,
      profit_margin: Math.round(profitMargin * 100) / 100 // Round to 2 decimal places
    };
  } catch (error) {
    console.error('Profit report calculation failed:', error);
    throw error;
  }
}
