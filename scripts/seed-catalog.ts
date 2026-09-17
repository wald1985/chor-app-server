import * as fs from 'node:fs';
import * as path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { convertLegacyCatalog } from './convert-legacy-catalog';
import {
  PreviewImportUseCase,
  ApplyImportUseCase,
} from '../src/library';

async function main(): Promise<void> {
  const defaultHtmlPath = path.resolve(
    __dirname,
    '../../chor-app-docs/chor-app_v3.html',
  );
  const inputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : defaultHtmlPath;

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Legacy HTML file not found at: ${inputPath}`);
    process.exit(1);
  }

  console.log(`Reading legacy catalog HTML from: ${inputPath}`);
  const html = fs.readFileSync(inputPath, 'utf-8');

  console.log('Converting legacy HTML to library JSON format and validating invariants...');
  const catalogJson = convertLegacyCatalog(html);
  const buffer = Buffer.from(JSON.stringify(catalogJson), 'utf-8');

  console.log('Bootstrapping application context...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const previewUseCase = app.get(PreviewImportUseCase);
    const applyUseCase = app.get(ApplyImportUseCase);

    console.log('Calculating import plan preview...');
    const preview = await previewUseCase.execute({
      buffer,
      filename: 'catalog.json',
    });

    console.log('Preview plan summary:', JSON.stringify(preview.plan.summary(), null, 2));
    console.log(`Plan hash: ${preview.plan.hash()}`);

    if (preview.plan.errors.length > 0) {
      console.error('Plan has errors:', preview.plan.errors);
      process.exit(1);
    }

    console.log('Applying import plan into the database...');
    const result = await applyUseCase.execute({
      buffer,
      filename: 'catalog.json',
      expectedPlanHash: preview.plan.hash(),
    });

    console.log('Import successfully applied!');
    console.log('Result summary:', JSON.stringify(result.summary, null, 2));
  } catch (error) {
    console.error('Failed to seed catalog:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  void main();
}
