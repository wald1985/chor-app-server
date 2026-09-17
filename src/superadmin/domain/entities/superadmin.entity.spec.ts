import {
  CannotDeleteSelfError,
  UseChangePasswordError,
} from '../errors/superadmin.errors';
import { Superadmin } from './superadmin.entity';

function makeSuperadmin(id = 'sa-1'): Superadmin {
  return Superadmin.create({
    id,
    email: 'alex@example.org',
    name: 'Alex',
    passwordHash: 'hash',
  });
}

describe('Superadmin', () => {
  it('creates with default tokenVersion 0', () => {
    const sa = makeSuperadmin();
    expect(sa.tokenVersion).toBe(0);
    expect(sa.email).toBe('alex@example.org');
    expect(sa.name).toBe('Alex');
  });

  it('rename() and changeEmail() update the value objects', () => {
    const sa = makeSuperadmin();
    sa.rename('Alexander');
    sa.changeEmail('new@example.org');
    expect(sa.name).toBe('Alexander');
    expect(sa.email).toBe('new@example.org');
  });

  describe('assertDeletableBy', () => {
    it('throws CannotDeleteSelfError when actor is self', () => {
      const sa = makeSuperadmin('sa-1');
      expect(() => sa.assertDeletableBy('sa-1')).toThrow(CannotDeleteSelfError);
    });

    it('allows a different actor', () => {
      const sa = makeSuperadmin('sa-1');
      expect(() => sa.assertDeletableBy('sa-2')).not.toThrow();
    });
  });

  describe('assertPasswordSettableBy', () => {
    it('throws UseChangePasswordError when actor is self', () => {
      const sa = makeSuperadmin('sa-1');
      expect(() => sa.assertPasswordSettableBy('sa-1')).toThrow(
        UseChangePasswordError,
      );
    });

    it('allows a different actor', () => {
      const sa = makeSuperadmin('sa-1');
      expect(() => sa.assertPasswordSettableBy('sa-2')).not.toThrow();
    });
  });
});
