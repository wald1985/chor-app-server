import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { LibraryBusyError } from '../../domain/errors/library.errors';
import { LibraryUnitOfWork } from '../../domain/ports/library-unit-of-work.port';
import { PrismaTransactionContext } from './prisma-transaction-context';

export const LIBRARY_ADVISORY_LOCK_ID = 842719530192384n;

@Injectable()
export class PrismaLibraryUnitOfWork implements LibraryUnitOfWork {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txContext: PrismaTransactionContext,
  ) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          try {
            await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '5s';`);
            await tx.$executeRawUnsafe(
              `SELECT pg_advisory_xact_lock(${LIBRARY_ADVISORY_LOCK_ID});`,
            );
          } catch (lockErr: unknown) {
            this.handleLockError(lockErr);
          }
          return await this.txContext.run(tx, work);
        },
        { timeout: 60_000, maxWait: 10_000 },
      );
    } catch (err: unknown) {
      this.handleLockError(err);
      throw err;
    }
  }

  private handleLockError(error: unknown): void {
    if (!error || typeof error !== 'object') {
      return;
    }
    const err = error as {
      code?: string;
      message?: string;
      meta?: { code?: string };
    };
    const code = err.code ?? err.meta?.code;
    const message = typeof err.message === 'string' ? err.message : '';

    if (
      code === '55P03' ||
      message.includes('55P03') ||
      message.includes('lock timeout') ||
      message.includes('canceling statement due to lock timeout')
    ) {
      throw new LibraryBusyError();
    }
  }
}
