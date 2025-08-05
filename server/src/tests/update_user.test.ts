
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Test user data
const testCreateInput: CreateUserInput = {
  username: 'testuser',
  full_name: 'Test User',
  password: 'password123',
  role: 'kasir'
};

// Helper function to create a user directly in the database
const createTestUser = async (input: CreateUserInput) => {
  const passwordHash = await Bun.password.hash(input.password);
  
  const result = await db.insert(usersTable)
    .values({
      username: input.username,
      password_hash: passwordHash,
      full_name: input.full_name,
      role: input.role
    })
    .returning()
    .execute();

  return result[0];
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user basic information', async () => {
    // Create a user first
    const createdUser = await createTestUser(testCreateInput);

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      username: 'updateduser',
      full_name: 'Updated User Name',
      role: 'admin'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.username).toEqual('updateduser');
    expect(result.full_name).toEqual('Updated User Name');
    expect(result.role).toEqual('admin');
    expect(result.is_active).toEqual(true); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should update user password', async () => {
    // Create a user first
    const createdUser = await createTestUser(testCreateInput);

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      password: 'newpassword456'
    };

    const result = await updateUser(updateInput);

    // Verify user was updated
    expect(result.id).toEqual(createdUser.id);
    expect(result.username).toEqual(testCreateInput.username); // Should remain unchanged

    // Verify password was hashed and updated in database
    const updatedUserInDb = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(updatedUserInDb).toHaveLength(1);
    
    // Verify new password works
    const isNewPasswordValid = await Bun.password.verify('newpassword456', updatedUserInDb[0].password_hash);
    expect(isNewPasswordValid).toBe(true);

    // Verify old password no longer works
    const isOldPasswordValid = await Bun.password.verify('password123', updatedUserInDb[0].password_hash);
    expect(isOldPasswordValid).toBe(false);
  });

  it('should update user active status', async () => {
    // Create a user first
    const createdUser = await createTestUser(testCreateInput);

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.is_active).toEqual(false);
    expect(result.username).toEqual(testCreateInput.username); // Should remain unchanged

    // Verify in database
    const updatedUserInDb = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(updatedUserInDb[0].is_active).toBe(false);
  });

  it('should update only specified fields', async () => {
    // Create a user first
    const createdUser = await createTestUser(testCreateInput);

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      full_name: 'Only Name Changed'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.full_name).toEqual('Only Name Changed');
    expect(result.username).toEqual(testCreateInput.username); // Should remain unchanged
    expect(result.role).toEqual(testCreateInput.role); // Should remain unchanged
    expect(result.is_active).toEqual(true); // Should remain unchanged
  });

  it('should throw error when user does not exist', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999,
      username: 'nonexistent'
    };

    expect(updateUser(updateInput)).rejects.toThrow(/user not found/i);
  });

  it('should update updated_at timestamp', async () => {
    // Create a user first
    const createdUser = await createTestUser(testCreateInput);
    
    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      username: 'timestamptest'
    };

    const result = await updateUser(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > createdUser.updated_at).toBe(true);

    // Verify in database
    const updatedUserInDb = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(updatedUserInDb[0].updated_at).toBeInstanceOf(Date);
    expect(updatedUserInDb[0].updated_at > createdUser.updated_at).toBe(true);
  });
});
