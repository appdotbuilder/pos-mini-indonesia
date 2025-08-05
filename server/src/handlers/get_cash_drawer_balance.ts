
import { db } from '../db';
import { cashDrawerTable } from '../db/schema';
import { sql } from 'drizzle-orm';

export async function getCashDrawerBalance(): Promise<{ balance: number }> {
  try {
    // Calculate balance using SQL CASE statement to handle different entry types
    const result = await db.select({
      balance: sql<string>`COALESCE(
        SUM(
          CASE 
            WHEN type = 'masuk' OR type = 'saldo_awal' THEN amount
            WHEN type = 'keluar' THEN -amount
            ELSE 0
          END
        ), 0
      )`.as('balance')
    })
    .from(cashDrawerTable)
    .execute();

    // Convert numeric string result to number
    const balance = parseFloat(result[0]?.balance || '0');

    return { balance };
  } catch (error) {
    console.error('Cash drawer balance calculation failed:', error);
    throw error;
  }
}
