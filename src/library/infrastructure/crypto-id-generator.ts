import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { IdGenerator } from '../domain/ports/id-generator.port';

@Injectable()
export class CryptoIdGenerator implements IdGenerator {
  generateId(): string {
    return randomUUID();
  }
}
