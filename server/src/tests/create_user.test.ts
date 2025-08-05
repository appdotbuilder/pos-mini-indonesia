
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input for admin user
const testAdminInput: CreateUserInput = {
  username: 'testadmin',
  full_name: 'Test Admin User',
  password: 'password123',
  role: 'admin'
};

// Test input for kasir user
const testKasirInput: CreateUserInput = {
  username: 'testkasir',
  full_name: 'Test Kasir User',
  password: 'password456',
  role: 'kasir'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an admin user', async () => {
    const result = await createUser(testAdminInput);

    // Basic field validation
    expect(result.username).toEqual('testadmin');
    expect(result.full_name).toEqual('Test Admin User');
    expect(result.role).toEqual('admin');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a kasir user', async () => {
    const result = await createUser(testKasirInput);

    // Basic field validation
    expect(result.username).toEqual('testkasir');
    expect(result.full_name).toEqual('Test Kasir User');
    expect(result.role).toEqual('kasir');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database with hashed password', async () => {
    const result = await createUser(testAdminInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    
    expect(savedUser.username).toEqual('testadmin');
    expect(savedUser.full_name).toEqual('Test Admin User');
    expect(savedUser.role).toEqual('admin');
    expect(savedUser.is_active).toEqual(true);
    expect(savedUser.password_hash).toEqual('hashed_password123');
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should enforce unique username constraint', async () => {
    // Create first user
    await createUser(testAdminInput);

    // Try to create another user with same username
    await expect(createUser(testAdminInput)).rejects.toThrow(/unique/i);
  });

  it('should create users with different roles', async () => {
    const adminResult = await createUser(testAdminInput);
    const kasirResult = await createUser(testKasirInput);

    expect(adminResult.role).toEqual('admin');
    expect(kasirResult.role).toEqual('kasir');
    expect(adminResult.id).not.toEqual(kasirResult.id);
  });

  it('should set default values correctly', async () => {
    const result = await createUser(testAdminInput);

    // Verify default values are applied
    expect(result.is_active).toEqual(true);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify timestamps are recent (within last minute)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    expect(result.created_at.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
  });
});
