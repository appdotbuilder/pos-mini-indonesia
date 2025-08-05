
import { db } from '../db';
import { transactionsTable, transactionItemsTable, productsTable } from '../db/schema';
import { type ReportPeriodInput, type SalesReport } from '../schema';
import { sql, gte, lte, and, eq } from 'drizzle-orm';

export async function getSalesReport(input: ReportPeriodInput): Promise<SalesReport[]> {
  try {
    // Parse date strings to Date objects for proper comparison
    const startDate = new Date(input.start_date);
    const endDate = new Date(input.end_date);
    
    // Set end date to end of day to include all transactions on that date
    endDate.setHours(23, 59, 59, 999);

    // Query to get aggregated sales data grouped by date
    const results = await db
      .select({
        date: sql<string>`DATE(${transactionsTable.created_at})`.as('date'),
        total_transactions: sql<number>`COUNT(DISTINCT ${transactionsTable.id})`.as('total_transactions'),
        total_revenue: sql<string>`SUM(${transactionItemsTable.total_price})`.as('total_revenue'),
        total_profit: sql<string>`SUM(${transactionItemsTable.total_price} - (${transactionItemsTable.quantity} * ${productsTable.cost_price}))`.as('total_profit'),
        physical_sales: sql<string>`SUM(CASE WHEN ${transactionItemsTable.is_digital_sale} = false THEN ${transactionItemsTable.total_price} ELSE 0 END)`.as('physical_sales'),
        digital_sales: sql<string>`SUM(CASE WHEN ${transactionItemsTable.is_digital_sale} = true THEN ${transactionItemsTable.total_price} ELSE 0 END)`.as('digital_sales')
      })
      .from(transactionsTable)
      .innerJoin(transactionItemsTable, eq(transactionsTable.id, transactionItemsTable.transaction_id))
      .innerJoin(productsTable, eq(transactionItemsTable.product_id, productsTable.id))
      .where(and(
        gte(transactionsTable.created_at, startDate),
        lte(transactionsTable.created_at, endDate)
      ))
      .groupBy(sql`DATE(${transactionsTable.created_at})`)
      .orderBy(sql`DATE(${transactionsTable.created_at})`)
      .execute();

    // Convert numeric string results to numbers
    return results.map(result => ({
      date: result.date,
      total_transactions: Number(result.total_transactions),
      total_revenue: parseFloat(result.total_revenue),
      total_profit: parseFloat(result.total_profit),
      physical_sales: parseFloat(result.physical_sales),
      digital_sales: parseFloat(result.digital_sales)
    }));
  } catch (error) {
    console.error('Sales report generation failed:', error);
    throw error;
  }
}
