import { DIFF } from './demo-pr.mjs'
import { added, diffFor } from './fixture.mjs'

export const IMPORTANT = [
  'src/Domain/Billing/Actions/GenerateInvoice.php',
  'src/Domain/Billing/Usage/UsageMeter.php',
  'src/Domain/Billing/Usage/UsageRepository.php',
  'src/Domain/Billing/Models/Invoice.php',
  'src/Domain/Billing/Enums/InvoiceStatus.php',
  'src/Presentation/Business/Controllers/InvoiceController.php',
  'src/Presentation/Business/Resources/InvoiceResource.php',
  'routes/api.php',
  'resources/js/pages/billing/InvoiceList.vue',
  'resources/js/composables/useInvoices.ts',
  'resources/js/lib/money.ts',
  'config/billing.php',
]
const LOCKFILES = ['composer.lock', 'pnpm-lock.yaml']
export const QUICK = '.github/workflows/tests.yml'

const LOCALES = ['ar', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'nl', 'pt_BR', 'ru', 'tr', 'zh_CN']
const LANG_FILES = ['billing', 'invoices', 'payments', 'plans', 'usage', 'validation']
const CLAUDE = [
  'agents/billing-reviewer.md',
  'agents/migration-checker.md',
  'agents/test-writer.md',
  'commands/invoice-fixture.md',
  'commands/review-billing.md',
  'commands/seed-usage.md',
  'settings.json',
  'skills/billing/SKILL.md',
  'skills/billing/examples.md',
  'skills/invoices/SKILL.md',
  'skills/invoices/rules.md',
  'skills/money/SKILL.md',
  'skills/money/rounding.md',
  'skills/testing/SKILL.md',
  'skills/testing/fixtures.md',
  'skills/usage/SKILL.md',
]
const DOCS = [
  'billing/usage.md',
  'billing/invoices.md',
  'billing/plans.md',
  'billing/proration.md',
  'billing/refunds.md',
  'billing/taxes.md',
  'api/invoices.md',
  'api/usage.md',
  'api/webhooks.md',
  'adr/0012-usage-billing.md',
  'adr/0013-invoice-periods.md',
  'runbooks/failed-invoices.md',
  'runbooks/month-end.md',
  'changelog/billing.md',
]
const SUBJECTS = [
  'GenerateInvoice',
  'UsageMeter',
  'UsageRepository',
  'InvoiceStatus',
  'InvoiceResource',
  'InvoiceController',
  'PriceBook',
  'Period',
  'Money',
  'Currency',
  'Discount',
  'TaxRule',
  'Proration',
  'Refund',
  'CreditNote',
  'Subscription',
  'PlanChange',
  'Trial',
  'Coupon',
  'Webhook',
  'Receipt',
  'Dunning',
  'PaymentRetry',
  'Ledger',
  'Export',
  'Statement',
  'Rounding',
  'Locale',
  'Timezone',
  'AuditLog',
  'RateLimit',
  'Quota',
  'Seat',
  'Overage',
]

const noise = []
const add = (path, body) => {
  noise.push(path)
  if (!DIFF.includes(` b/${path}\n`)) added(path, body)
}

for (const file of CLAUDE) add(`.claude/${file}`, `# ${file}\n\nProject notes for the coding agent.`)
for (const file of DOCS) add(`docs/${file}`, `# ${file}\n\nHow usage-based billing works.`)
for (const locale of LOCALES) {
  for (const file of LANG_FILES) {
    add(`lang/${locale}/${file}.php`, `<?php\n\nreturn [\n    'title' => '${file}',\n    'period' => ':start – :end',\n];`)
  }
}
const TOTAL = 214
const tests = []
for (const subject of SUBJECTS) {
  tests.push(`tests/Feature/Billing/${subject}Test.php`, `tests/Unit/Billing/${subject}Test.php`)
  tests.push(`tests/js/billing/${subject[0].toLowerCase() + subject.slice(1)}.test.ts`)
}
const room = TOTAL - IMPORTANT.length - LOCKFILES.length - 1 - noise.length
for (const path of tests.slice(0, room)) {
  add(
    path,
    path.endsWith('.ts')
      ? `import { it, expect } from 'vitest'\n\nit('works', () => {\n  expect(true).toBe(true)\n})`
      : `<?php\n\nit('handles a usage period', function () {\n    expect(true)->toBeTrue();\n});`,
  )
}

export const BIG_PATHS = [...IMPORTANT, QUICK, ...LOCKFILES, ...noise]
export const BIG_DIFF = diffFor(BIG_PATHS)
