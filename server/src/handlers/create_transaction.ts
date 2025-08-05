
import { db } from '../db';
import { 
  transactionsTable, 
  transactionItemsTable, 
  productsTable, 
  digitalBalancesTable 
} from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export async function createTransaction(input: CreateTransactionInput, userId: number): Promise<Transaction> {
  return await db.transaction(async (tx) => {
    try {
      // Calculate total amount
      const totalAmount = input.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      
      // Calculate change amount for cash payments
      const changeAmount = input.payment_method === 'tunai' && input.payment_received 
        ? Math.max(0, input.payment_received - totalAmount) 
        : null;

      // Generate unique transaction number
      const transactionNumber = `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      // Create transaction record
      const transactionResult = await tx.insert(transactionsTable)
        .values({
          transaction_number: transactionNumber,
          user_id: userId,
          total_amount: totalAmount.toString(),
          payment_method: input.payment_method,
          payment_received: input.payment_received?.toString() || null,
          change_amount: changeAmount?.toString() || null,
          notes: input.notes
        })
        .returning()
        .execute();

      const transaction = transactionResult[0];

      // Process each item
      for (const item of input.items) {
        // Get product details
        const products = await tx.select()
          .from(productsTable)
          .where(eq(productsTable.id, item.product_id))
          .execute();

        if (products.length === 0) {
          throw new Error(`Product with ID ${item.product_id} not found`);
        }

        const product = products[0];

        // Check stock for physical products
        if (product.type === 'fisik' && product.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock_quantity}, Required: ${item.quantity}`);
        }

        // Create transaction item
        await tx.insert(transactionItemsTable)
          .values({
            transaction_id: transaction.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price.toString(),
            total_price: (item.unit_price * item.quantity).toString(),
            is_digital_sale: item.is_digital_sale
          })
          .execute();

        // Update stock for physical products
        if (product.type === 'fisik') {
          await tx.update(productsTable)
            .set({ 
              stock_quantity: product.stock_quantity - item.quantity,
              updated_at: new Date()
            })
            .where(eq(productsTable.id, item.product_id))
            .execute();
        }

        // Update digital balance for digital products
        if (product.type === 'digital' && item.is_digital_sale) {
          const digitalBalances = await tx.select()
            .from(digitalBalancesTable)
            .where(eq(digitalBalancesTable.product_id, item.product_id))
            .execute();

          if (digitalBalances.length === 0) {
            throw new Error(`Digital balance not found for product ${product.name}`);
          }

          const currentBalance = parseFloat(digitalBalances[0].balance);
          const requiredBalance = item.unit_price * item.quantity;

          if (currentBalance < requiredBalance) {
            throw new Error(`Insufficient digital balance for product ${product.name}. Available: ${currentBalance}, Required: ${requiredBalance}`);
          }

          await tx.update(digitalBalancesTable)
            .set({ 
              balance: (currentBalance - requiredBalance).toString(),
              updated_at: new Date()
            })
            .where(eq(digitalBalancesTable.product_id, item.product_id))
            .execute();
        }
      }

      // Return transaction with converted numeric fields
      return {
        ...transaction,
        total_amount: parseFloat(transaction.total_amount),
        payment_received: transaction.payment_received ? parseFloat(transaction.payment_received) : null,
        change_amount: transaction.change_amount ? parseFloat(transaction.change_amount) : null
      };

    } catch (error) {
      console.error('Transaction creation failed:', error);
      throw error;
    }
  });
}
