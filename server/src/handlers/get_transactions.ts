
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type Transaction } from '../schema';
import { desc } from 'drizzle-orm';

export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    // Fetch all transactions ordered by creation date (newest first)
    const results = await db.select()
      .from(transactionsTable)
      .orderBy(desc(transactionsTable.created_at))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      total_amount: parseFloat(transaction.total_amount),
      payment_received: transaction.payment_received ? parseFloat(transaction.payment_received) : null,
      change_amount: transaction.change_amount ? parseFloat(transaction.change_amount) : null
    }));
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    throw error;
  }
};
