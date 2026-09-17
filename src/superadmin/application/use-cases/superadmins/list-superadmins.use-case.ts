import { Inject, Injectable } from '@nestjs/common';
import { SUPERADMIN_REPOSITORY } from '../../../domain/ports/superadmin-repository.port';
import type { SuperadminRepository } from '../../../domain/ports/superadmin-repository.port';
import { toSuperadminView } from '../../views/superadmin.view';
import type { SuperadminView } from '../../views/superadmin.view';

@Injectable()
export class ListSuperadminsUseCase {
  constructor(
    @Inject(SUPERADMIN_REPOSITORY)
    private readonly superadminRepository: SuperadminRepository,
  ) {}

  async execute(actorId: string): Promise<SuperadminView[]> {
    const superadmins = await this.superadminRepository.list();
    return superadmins.map((s) => toSuperadminView(s, actorId));
  }
}
