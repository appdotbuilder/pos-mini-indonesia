
import { db } from '../db';
import { transactionItemsTable, productsTable, transactionsTable } from '../db/schema';
import { type ReportPeriodInput, type TopProduct } from '../schema';
import { eq, sql, between, and, desc } from 'drizzle-orm';

export async function getTopProducts(input: ReportPeriodInput): Promise<TopProduct[]> {
  try {
    // Parse date strings to Date objects for proper filtering
    const startDate = new Date(input.start_date);
    const endDate = new Date(input.end_date);
    
    // Set end date to end of day to include full day
    endDate.setHours(23, 59, 59, 999);

    const results = await db
      .select({
        product_id: transactionItemsTable.product_id,
        product_name: productsTable.name,
        total_quantity: sql<number>`sum(${transactionItemsTable.quantity})`,
        total_revenue: sql<number>`sum(${transactionItemsTable.total_price})`
      })
      .from(transactionItemsTable)
      .innerJoin(productsTable, eq(transactionItemsTable.product_id, productsTable.id))
      .innerJoin(transactionsTable, eq(transactionItemsTable.transaction_id, transactionsTable.id))
      .where(
        and(
          between(transactionsTable.created_at, startDate, endDate)
        )
      )
      .groupBy(transactionItemsTable.product_id, productsTable.name)
      .orderBy(desc(sql`sum(${transactionItemsTable.quantity})`))
      .execute();

    // Convert numeric fields and ensure proper types
    return results.map(result => ({
      product_id: result.product_id,
      product_name: result.product_name,
      total_quantity: parseInt(result.total_quantity.toString()),
      total_revenue: parseFloat(result.total_revenue.toString())
    }));
  } catch (error) {
    console.error('Get top products failed:', error);
    throw error;
  }
}
