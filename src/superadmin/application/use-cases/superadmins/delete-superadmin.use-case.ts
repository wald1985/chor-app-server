import { Inject, Injectable } from '@nestjs/common';
import { SuperadminNotFoundError } from '../../../domain/errors/superadmin.errors';
import { SUPERADMIN_REPOSITORY } from '../../../domain/ports/superadmin-repository.port';
import type { SuperadminRepository } from '../../../domain/ports/superadmin-repository.port';

@Injectable()
export class DeleteSuperadminUseCase {
  constructor(
    @Inject(SUPERADMIN_REPOSITORY)
    private readonly superadminRepository: SuperadminRepository,
  ) {}

  async execute(id: string, actorId: string): Promise<void> {
    const superadmin = await this.superadminRepository.findById(id);
    if (!superadmin) {
      throw new SuperadminNotFoundError(id);
    }
    superadmin.assertDeletableBy(actorId);

    await this.superadminRepository.deleteKeepingAtLeastOne(id);
  }
}
