import { Inject, Injectable } from '@nestjs/common';
import { Performance } from '../../domain/entities/performance.entity';
import {
  PERFORMANCE_REPOSITORY,
  type PerformanceRepository,
} from '../../domain/ports/performance-repository.port';
import { PerformanceDate } from '../../domain/value-objects/performance-date';
import { PerformanceViewBuilder } from '../services/performance-view-builder';
import { ReferenceValidator } from '../services/reference-validator';
import type { PerformanceView } from '../views/performance.views';

export interface RecordPerformanceCommand {
  communityId: string;
  date: string;
  songId: string;
  pianistId?: string | null;
  conductorId?: string | null;
  note?: string | null;
}

@Injectable()
export class RecordPerformanceUseCase {
  constructor(
    @Inject(PERFORMANCE_REPOSITORY)
    private readonly repository: PerformanceRepository,
    private readonly references: ReferenceValidator,
    private readonly views: PerformanceViewBuilder,
  ) {}

  async execute(command: RecordPerformanceCommand): Promise<PerformanceView> {
    // Build the aggregate first: it validates date and note without any I/O.
    const performance = Performance.create({
      communityId: command.communityId,
      date: new PerformanceDate(command.date),
      songId: command.songId,
      pianistId: command.pianistId,
      conductorId: command.conductorId,
      note: command.note,
    });

    await this.references.assertSongUsable(command.communityId, command.songId);
    await this.references.assertPeopleUsable(command.communityId, [
      { id: command.pianistId, role: 'PIANIST' },
      { id: command.conductorId, role: 'CONDUCTOR' },
    ]);

    await this.repository.save(performance);
    const [view] = await this.views.build(command.communityId, [performance]);
    return view;
  }
}
