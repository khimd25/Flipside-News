import cron from 'node-cron';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env.local' });
dotenvConfig();

import { generateOnboardingBatch } from '../lib/onboarding';
import { prisma } from '../lib/prisma';

const SCHEDULE = process.env.ONBOARDING_CRON_SCHEDULE || '0 6 * * *'; // Default: 6:00 AM daily

async function runBatch() {
  const startedAt = new Date();
  console.log(`[OnboardingCron] Starting batch generation at ${startedAt.toISOString()}`);

  try {
    const { created, batch } = await generateOnboardingBatch(false);
    const msg = created ? 'created new batch' : 'reused active batch';
    console.log(
      `[OnboardingCron] ${msg}: id=${batch.id} expiresAt=${batch.expiresAt.toISOString()} articles=${batch.articles?.length ?? 'n/a'}`
    );
  } catch (err) {
    console.error('[OnboardingCron] Error generating onboarding batch:', err);
  } finally {
    try {
      await prisma.$disconnect();
    } catch {}
    console.log(`[OnboardingCron] Finished at ${new Date().toISOString()}`);
  }
}

async function main() {
  const once = process.argv.includes('--once') || process.env.RUN_ONCE === '1';
  const now = process.argv.includes('--now') || process.env.RUN_NOW === '1';

  if (once) {
    await runBatch();
    process.exit(0);
  }

  console.log(`[OnboardingCron] Scheduling daily job with expression: "${SCHEDULE}"`);
  cron.schedule(SCHEDULE, async () => {
    await runBatch();
  });

  if (now) {
    await runBatch();
  }

  console.log('[OnboardingCron] Cron is running. Press Ctrl+C to stop.');
}

main().catch((e) => {
  console.error('[OnboardingCron] Fatal error:', e);
  process.exit(1);
});
