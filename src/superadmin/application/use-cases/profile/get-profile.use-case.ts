import { Inject, Injectable } from '@nestjs/common';
import { SuperadminNotFoundError } from '../../../domain/errors/superadmin.errors';
import { SUPERADMIN_REPOSITORY } from '../../../domain/ports/superadmin-repository.port';
import type { SuperadminRepository } from '../../../domain/ports/superadmin-repository.port';
import { toSuperadminView } from '../../views/superadmin.view';
import type { SuperadminView } from '../../views/superadmin.view';

@Injectable()
export class GetProfileUseCase {
  constructor(
    @Inject(SUPERADMIN_REPOSITORY)
    private readonly superadminRepository: SuperadminRepository,
  ) {}

  async execute(actorId: string): Promise<SuperadminView> {
    const superadmin = await this.superadminRepository.findById(actorId);
    if (!superadmin) {
      throw new SuperadminNotFoundError(actorId);
    }
    return toSuperadminView(superadmin, actorId);
  }
}
