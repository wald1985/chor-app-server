import { Person } from './entities/person.entity';
import {
  PersonArchivedError,
  PersonRolesEmptyError,
  PersonValueInvalidError,
} from './errors/people.errors';
import { PersonName } from './value-objects/person-name';
import { PersonRole } from './value-objects/person-role';
import { PersonRoles } from './value-objects/person-roles';

describe('PersonName', () => {
  it('trims, collapses whitespace and builds a lowercase key', () => {
    const name = new PersonName('  Anna   K. ');
    expect(name.value).toBe('Anna K.');
    expect(name.key).toBe('anna k.');
  });

  it('rejects blank and too long names', () => {
    expect(() => new PersonName('   ')).toThrow(PersonValueInvalidError);
    expect(() => new PersonName('x'.repeat(101))).toThrow(
      PersonValueInvalidError,
    );
    expect(new PersonName('x'.repeat(100)).value).toHaveLength(100);
  });
});

describe('PersonRoles', () => {
  it('deduplicates roles', () => {
    const roles = new PersonRoles(['PIANIST', 'PIANIST', 'CONDUCTOR']);
    expect(roles.values).toEqual([PersonRole.PIANIST, PersonRole.CONDUCTOR]);
  });

  it('rejects an empty set and unknown roles', () => {
    expect(() => new PersonRoles([])).toThrow(PersonRolesEmptyError);
    expect(() => new PersonRoles(['SINGER'])).toThrow(PersonValueInvalidError);
  });
});

describe('Person', () => {
  const make = () =>
    Person.create({ communityId: 'c1', name: 'Paul', roles: ['PIANIST'] });

  it('creates an active person with a generated id', () => {
    const person = make();
    expect(person.id).toBeTruthy();
    expect(person.isArchived).toBe(false);
    expect(person.hasRole(PersonRole.PIANIST)).toBe(true);
    expect(person.hasRole(PersonRole.CONDUCTOR)).toBe(false);
  });

  it('renames and changes roles', () => {
    const person = make();
    person.rename('Paula');
    person.changeRoles(['PIANIST', 'CONDUCTOR']);
    expect(person.nameValue).toBe('Paula');
    expect(person.nameKey).toBe('paula');
    expect(person.roles).toEqual(['PIANIST', 'CONDUCTOR']);
  });

  it('keeps previous roles when the new set is empty', () => {
    const person = make();
    expect(() => person.changeRoles([])).toThrow(PersonRolesEmptyError);
    expect(person.roles).toEqual(['PIANIST']);
  });

  it('archive and restore are idempotent; archived persons are not editable', () => {
    const person = make();
    const at = new Date('2026-01-01');
    person.archive(at);
    person.archive(new Date('2026-02-02'));
    expect(person.archivedAt).toBe(at);
    expect(() => person.rename('X')).toThrow(PersonArchivedError);
    expect(() => person.changeRoles(['CONDUCTOR'])).toThrow(
      PersonArchivedError,
    );

    person.restore();
    person.restore();
    expect(person.isArchived).toBe(false);
    person.rename('Paula');
    expect(person.nameValue).toBe('Paula');
  });
});
