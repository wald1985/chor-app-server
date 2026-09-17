import { Injectable } from '@nestjs/common';
import {
  LibraryItemUsage,
  LibraryUsageItemRef,
  LibraryUsageProvider,
} from '../application/ports/library-usage-provider.port';

@Injectable()
export class NoUsageProvider implements LibraryUsageProvider {
  countUsage(refs: LibraryUsageItemRef[]): Promise<LibraryItemUsage[]> {
    return Promise.resolve(
      refs.map((ref) => ({
        ref,
        communities: 0,
        references: 0,
      })),
    );
  }
}
