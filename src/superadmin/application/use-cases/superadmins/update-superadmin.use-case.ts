import { Inject, Injectable } from '@nestjs/common';
import { SuperadminNotFoundError } from '../../../domain/errors/superadmin.errors';
import { SUPERADMIN_REPOSITORY } from '../../../domain/ports/superadmin-repository.port';
import type { SuperadminRepository } from '../../../domain/ports/superadmin-repository.port';
import { toSuperadminView } from '../../views/superadmin.view';
import type { SuperadminView } from '../../views/superadmin.view';

export interface UpdateSuperadminInput {
  id: string;
  name?: string;
  email?: string;
}

@Injectable()
export class UpdateSuperadminUseCase {
  constructor(
    @Inject(SUPERADMIN_REPOSITORY)
    private readonly superadminRepository: SuperadminRepository,
  ) {}

  async execute(
    input: UpdateSuperadminInput,
    actorId: string,
  ): Promise<SuperadminView> {
    const superadmin = await this.superadminRepository.findById(input.id);
    if (!superadmin) {
      throw new SuperadminNotFoundError(input.id);
    }

    if (input.name !== undefined) {
      superadmin.rename(input.name);
    }
    if (input.email !== undefined) {
      superadmin.changeEmail(input.email);
    }

    await this.superadminRepository.save(superadmin);
    return toSuperadminView(superadmin, actorId);
  }
}
