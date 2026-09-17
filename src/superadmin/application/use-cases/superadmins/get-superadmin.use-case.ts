import { Inject, Injectable } from '@nestjs/common';
import { SuperadminNotFoundError } from '../../../domain/errors/superadmin.errors';
import { SUPERADMIN_REPOSITORY } from '../../../domain/ports/superadmin-repository.port';
import type { SuperadminRepository } from '../../../domain/ports/superadmin-repository.port';
import { toSuperadminView } from '../../views/superadmin.view';
import type { SuperadminView } from '../../views/superadmin.view';

@Injectable()
export class GetSuperadminUseCase {
  constructor(
    @Inject(SUPERADMIN_REPOSITORY)
    private readonly superadminRepository: SuperadminRepository,
  ) {}

  async execute(id: string, actorId: string): Promise<SuperadminView> {
    const superadmin = await this.superadminRepository.findById(id);
    if (!superadmin) {
      throw new SuperadminNotFoundError(id);
    }
    return toSuperadminView(superadmin, actorId);
  }
}
