
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    // Check if user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error('User not found');
    }

    // Prepare update values
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.username !== undefined) {
      updateValues.username = input.username;
    }

    if (input.full_name !== undefined) {
      updateValues.full_name = input.full_name;
    }

    if (input.role !== undefined) {
      updateValues.role = input.role;
    }

    if (input.is_active !== undefined) {
      updateValues.is_active = input.is_active;
    }

    // Hash password if provided (using Bun's built-in password hashing)
    if (input.password !== undefined) {
      updateValues.password_hash = await Bun.password.hash(input.password);
    }

    // Update user record
    const result = await db.update(usersTable)
      .set(updateValues)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    const updatedUser = result[0];
    return {
      id: updatedUser.id,
      username: updatedUser.username,
      full_name: updatedUser.full_name,
      role: updatedUser.role,
      is_active: updatedUser.is_active,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at
    };
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};
