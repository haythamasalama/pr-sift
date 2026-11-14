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

const LOCALES = ['ar', 'de', 'es', 'fr', 'hi', 'id', 'it', 'ja', 'ko', 'nl', 'pl', 'pt_BR', 'ru', 'sv', 'tr', 'uk', 'zh_CN']
const LANG_FILES = ['billing', 'invoices', 'payments', 'plans', 'usage', 'validation']
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

for (const locale of LOCALES) {
  for (const file of LANG_FILES) {
    add(`lang/${locale}/${file}.php`, `<?php\n\nreturn [\n    'title' => '${file}',\n    'period' => ':start – :end',\n];`)
  }
}
for (const subject of SUBJECTS) {
  for (const suite of ['Feature', 'Unit']) {
    add(
      `tests/${suite}/Billing/${subject}Test.php`,
      `<?php\n\nit('handles ${subject} for a usage period', function () {\n    expect(true)->toBeTrue();\n});`,
    )
  }
}
for (const subject of SUBJECTS.slice(0, 30)) {
  const name = subject[0].toLowerCase() + subject.slice(1)
  add(`tests/js/billing/${name}.test.ts`, `import { it, expect } from 'vitest'\n\nit('${name}', () => {\n  expect(true).toBe(true)\n})`)
}

export const BIG_PATHS = [...IMPORTANT, ...LOCKFILES, ...noise]
export const BIG_DIFF = diffFor(BIG_PATHS)
