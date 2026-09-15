import { User } from '../entities/user.entity';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
