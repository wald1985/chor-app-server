import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaTransactionContext {
  private readonly als = new AsyncLocalStorage<Prisma.TransactionClient>();

  run<T>(tx: Prisma.TransactionClient, fn: () => Promise<T>): Promise<T> {
    return this.als.run(tx, fn);
  }

  getClient(): Prisma.TransactionClient | undefined {
    return this.als.getStore();
  }
}
