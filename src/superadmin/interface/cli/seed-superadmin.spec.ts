import { SuperadminExistsError } from '../../domain/errors/superadmin.errors';
import { parseSeedArgs, runSeedSuperadmin, SeedIo } from './seed-superadmin';

describe('parseSeedArgs', () => {
  it('requires --email', () => {
    const result = parseSeedArgs(['--name', 'Alex']);
    expect(result.ok).toBe(false);
  });

  it('requires --name unless --reset-password is set', () => {
    const result = parseSeedArgs(['--email', 'a@b.com']);
    expect(result.ok).toBe(false);
  });

  it('accepts --email and --name for creation', () => {
    const result = parseSeedArgs(['--email', 'a@b.com', '--name', 'Alex']);
    expect(result).toEqual({
      ok: true,
      email: 'a@b.com',
      name: 'Alex',
      resetPassword: false,
    });
  });

  it('accepts --email and --reset-password without --name', () => {
    const result = parseSeedArgs(['--email', 'a@b.com', '--reset-password']);
    expect(result).toEqual({
      ok: true,
      email: 'a@b.com',
      name: undefined,
      resetPassword: true,
    });
  });

  it('rejects --password as an argument', () => {
    const result = parseSeedArgs([
      '--email',
      'a@b.com',
      '--password',
      'secret',
    ]);
    expect(result.ok).toBe(false);
  });

  it('rejects unknown arguments', () => {
    const result = parseSeedArgs(['--email', 'a@b.com', '--bogus']);
    expect(result.ok).toBe(false);
  });
});

describe('runSeedSuperadmin', () => {
  function makeIo(execute: jest.Mock): {
    io: SeedIo;
    out: string[];
    err: string[];
  } {
    const out: string[] = [];
    const err: string[] = [];
    return {
      io: {
        useCase: { execute },
        stdout: (line) => out.push(line),
        stderr: (line) => err.push(line),
      },
      out,
      err,
    };
  }

  it('returns exit code 2 and does not call the use case on a usage error', async () => {
    const execute = jest.fn();
    const { io } = makeIo(execute);

    const code = await runSeedSuperadmin(['--email', 'a@b.com'], io);

    expect(code).toBe(2);
    expect(execute).not.toHaveBeenCalled();
  });

  it('prints the email and password exactly once and returns 0 on success', async () => {
    const execute = jest.fn().mockResolvedValue({
      email: 'a@b.com',
      password: 'generated-pw',
      action: 'CREATED',
    });
    const { io, out, err } = makeIo(execute);

    const code = await runSeedSuperadmin(
      ['--email', 'a@b.com', '--name', 'Alex'],
      io,
    );

    expect(code).toBe(0);
    expect(out.join('\n')).toContain('generated-pw');
    expect(out.filter((l) => l.includes('generated-pw'))).toHaveLength(1);
    expect(err.join('\n')).not.toContain('generated-pw');
  });

  it('returns exit code 1 without printing a password when the superadmin already exists', async () => {
    const execute = jest
      .fn()
      .mockRejectedValue(new SuperadminExistsError('a@b.com'));
    const { io, out, err } = makeIo(execute);

    const code = await runSeedSuperadmin(
      ['--email', 'a@b.com', '--name', 'Alex'],
      io,
    );

    expect(code).toBe(1);
    expect(out).toHaveLength(0);
    expect(err.join('\n')).toContain('a@b.com');
  });
});
