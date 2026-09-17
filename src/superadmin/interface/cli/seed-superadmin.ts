import { NestFactory } from '@nestjs/core';
import { SeedSuperadminUseCase } from '../../application/use-cases/seed/seed-superadmin.use-case';
import { SuperadminExistsError } from '../../domain/errors/superadmin.errors';
import { SuperadminCliModule } from './superadmin-cli.module';

const USAGE = `Usage:
  seed-superadmin --email <email> --name <name>
  seed-superadmin --email <email> --reset-password

Creates a superadmin (printing a generated password once), or resets an
existing superadmin's password with --reset-password. The password is never
accepted as an argument.`;

export type SeedArgs =
  | { ok: true; email: string; name?: string; resetPassword: boolean }
  | { ok: false; message: string };

const KNOWN_FLAGS = new Set(['--email', '--name', '--reset-password']);

type FlagValues = Record<string, string | true>;

function tokenizeArgs(
  argv: string[],
): { ok: true; values: FlagValues } | { ok: false; message: string } {
  const values: FlagValues = {};

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--password') {
      return {
        ok: false,
        message: 'The password cannot be passed as an argument.',
      };
    }
    if (!KNOWN_FLAGS.has(flag)) {
      return { ok: false, message: `Unknown argument: ${flag}` };
    }
    if (flag === '--reset-password') {
      values[flag] = true;
      continue;
    }
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      return { ok: false, message: `Missing value for ${flag}` };
    }
    values[flag] = value;
    i++;
  }

  return { ok: true, values };
}

function buildSeedArgs(values: FlagValues): SeedArgs {
  const email = values['--email'];
  if (typeof email !== 'string' || email.trim().length === 0) {
    return { ok: false, message: '--email is required.' };
  }

  const resetPassword = values['--reset-password'] === true;
  const name = values['--name'];

  if (!resetPassword && typeof name !== 'string') {
    return {
      ok: false,
      message: '--name is required unless --reset-password is set.',
    };
  }

  return {
    ok: true,
    email,
    name: typeof name === 'string' ? name : undefined,
    resetPassword,
  };
}

export function parseSeedArgs(argv: string[]): SeedArgs {
  const tokenized = tokenizeArgs(argv);
  if (!tokenized.ok) {
    return tokenized;
  }
  return buildSeedArgs(tokenized.values);
}

export interface SeedIo {
  useCase: Pick<SeedSuperadminUseCase, 'execute'>;
  stdout: (line: string) => void;
  stderr: (line: string) => void;
}

export async function runSeedSuperadmin(
  argv: string[],
  io: SeedIo,
): Promise<number> {
  const args = parseSeedArgs(argv);
  if (!args.ok) {
    io.stderr(args.message);
    io.stderr(USAGE);
    return 2;
  }

  try {
    const result = await io.useCase.execute({
      email: args.email,
      name: args.name,
      resetPassword: args.resetPassword,
    });
    io.stdout(`email: ${result.email}`);
    io.stdout(`password: ${result.password}`);
    io.stdout(`action: ${result.action}`);
    return 0;
  } catch (error) {
    if (error instanceof SuperadminExistsError) {
      io.stderr(`Superadmin already exists: ${error.email}`);
      return 1;
    }
    if (error instanceof Error && error.name === 'SuperadminNotFoundError') {
      io.stderr(`No superadmin found for --reset-password: ${args.email}`);
      return 1;
    }
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(SuperadminCliModule, {
    logger: false,
  });
  const useCase = app.get(SeedSuperadminUseCase);

  const exitCode = await runSeedSuperadmin(process.argv.slice(2), {
    useCase,
    stdout: (line) => process.stdout.write(`${line}\n`),
    stderr: (line) => process.stderr.write(`${line}\n`),
  });

  await app.close();
  process.exit(exitCode);
}

if (require.main === module) {
  void main();
}
