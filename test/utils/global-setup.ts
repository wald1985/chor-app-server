import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

export default function globalSetup(): void {
  const envPath = path.resolve(__dirname, '../../.env.test');
  dotenv.config({ path: envPath });

  const databaseUrl =
    process.env.DATABASE_URL ||
    'postgresql://test_user:test_password@localhost:5433/chor_test?schema=public';

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });
}
