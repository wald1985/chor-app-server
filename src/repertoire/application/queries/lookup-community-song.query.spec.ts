import { ThemeSource } from '../../domain/value-objects/theme-source';
import type { CommunitySongView } from '../views/repertoire.views';
import { LookupCommunitySongQuery } from './lookup-community-song.query';

describe('LookupCommunitySongQuery', () => {
  let mockGetCommunitySongs: {
    execute: jest.Mock;
  };
  let query: LookupCommunitySongQuery;

  beforeEach(() => {
    mockGetCommunitySongs = {
      execute: jest.fn(),
    };

    query = new LookupCommunitySongQuery(mockGetCommunitySongs as any);
  });

  it('looks up a song in community and returns it', async () => {
    const songView: CommunitySongView = {
      id: 'fs-1',
      source: ThemeSource.COMMUNITY,
      container: {
        id: 'f-1',
        title: 'Mappe',
        type: 'FOLDER',
        seriesId: null,
      },
      number: '42',
      title: 'Test Song',
      author: null,
      arranger: null,
      isNew: true,
      themes: [],
      archived: false,
    };

    mockGetCommunitySongs.execute.mockResolvedValue([songView]);

    const result = await query.lookup('c-1', 'fs-1');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('fs-1');
    expect(result?.container.title).toBe('Mappe');
    expect(mockGetCommunitySongs.execute).toHaveBeenCalledWith({
      communityId: 'c-1',
      songId: 'fs-1',
    });
  });

  it('returns null if song not found in community', async () => {
    mockGetCommunitySongs.execute.mockResolvedValue([]);

    const result = await query.lookup('c-1', 'non-existent');
    expect(result).toBeNull();
  });

  it('passes includeInactive through when resolving history', async () => {
    mockGetCommunitySongs.execute.mockResolvedValue([]);

    await query.lookup('c-1', 'fs-1', { includeInactive: true });
    expect(mockGetCommunitySongs.execute).toHaveBeenCalledWith({
      communityId: 'c-1',
      songId: 'fs-1',
      includeInactive: true,
    });
  });

  it('resolves many songs in one pass and skips the call for no ids', async () => {
    mockGetCommunitySongs.execute.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);

    const result = await query.lookupMany('c-1', ['a', 'b'], {
      includeInactive: true,
    });
    expect(result.map((s) => s.id)).toEqual(['a', 'b']);
    expect(mockGetCommunitySongs.execute).toHaveBeenCalledWith({
      communityId: 'c-1',
      songIds: ['a', 'b'],
      includeInactive: true,
    });

    mockGetCommunitySongs.execute.mockClear();
    expect(await query.lookupMany('c-1', [])).toEqual([]);
    expect(mockGetCommunitySongs.execute).not.toHaveBeenCalled();
  });
});
