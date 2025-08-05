
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUsers } from '../handlers/get_users';

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    
    expect(result).toEqual([]);
  });

  it('should return all users', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        {
          username: 'admin1',
          password_hash: 'hashed_password_1',
          full_name: 'Admin User',
          role: 'admin'
        },
        {
          username: 'kasir1',
          password_hash: 'hashed_password_2',
          full_name: 'Kasir User',
          role: 'kasir'
        }
      ])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Verify first user
    expect(result[0].username).toEqual('admin1');
    expect(result[0].full_name).toEqual('Admin User');
    expect(result[0].role).toEqual('admin');
    expect(result[0].is_active).toBe(true);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    
    // Verify second user
    expect(result[1].username).toEqual('kasir1');
    expect(result[1].full_name).toEqual('Kasir User');
    expect(result[1].role).toEqual('kasir');
    expect(result[1].is_active).toBe(true);
    expect(result[1].id).toBeDefined();
    expect(result[1].created_at).toBeInstanceOf(Date);
    expect(result[1].updated_at).toBeInstanceOf(Date);

    // Verify password_hash is not included in the response
    expect((result[0] as any).password_hash).toBeUndefined();
    expect((result[1] as any).password_hash).toBeUndefined();
  });

  it('should include inactive users', async () => {
    // Create inactive user
    await db.insert(usersTable)
      .values({
        username: 'inactive_user',
        password_hash: 'hashed_password',
        full_name: 'Inactive User',
        role: 'kasir',
        is_active: false
      })
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    expect(result[0].username).toEqual('inactive_user');
    expect(result[0].is_active).toBe(false);
  });

  it('should return users with correct field types', async () => {
    await db.insert(usersTable)
      .values({
        username: 'test_user',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        role: 'admin'
      })
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];
    
    expect(typeof user.id).toBe('number');
    expect(typeof user.username).toBe('string');
    expect(typeof user.full_name).toBe('string');
    expect(typeof user.role).toBe('string');
    expect(typeof user.is_active).toBe('boolean');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });
});
