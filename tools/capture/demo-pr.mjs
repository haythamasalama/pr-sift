import { added, diffText, modified, removed } from './fixture.mjs'

export const PR = { owner: 'acme', repo: 'shipyard', number: 4821 }
export const TITLE = 'feat(billing): usage-based invoices for the business portal'

modified('src/Domain/Billing/Actions/GenerateInvoice.php', [
  {
    at: 18,
    title: 'final class GenerateInvoice',
    lines: `
    public function handle(Account $account, Period $period): Invoice
    {
-        $lines = $account->subscriptions->map(fn ($sub) => InvoiceLine::forSubscription($sub));
+        $lines = $account->subscriptions
+            ->map(fn (Subscription $sub) => InvoiceLine::forSubscription($sub, $period))
+            ->merge($this->usage->linesFor($account, $period));
+
+        if ($lines->isEmpty()) {
+            throw InvoiceException::nothingToBill($account, $period);
+        }

        return DB::transaction(function () use ($account, $period, $lines) {
-            $invoice = Invoice::create(['account_id' => $account->id]);
+            $invoice = Invoice::create([
+                'account_id' => $account->id,
+                'period_start' => $period->start,
+                'period_end' => $period->end,
+                'currency' => $account->currency,
+            ]);
            $invoice->lines()->createMany($lines->toArray());`,
  },
  {
    at: 52,
    title: 'private function total(Collection $lines): Money',
    lines: `
    private function total(Collection $lines): Money
    {
-        return Money::sum($lines->pluck('amount'));
+        return Money::sum($lines->pluck('amount'))->roundTo($this->rules->precision());
    }`,
  },
])

added(
  'src/Domain/Billing/Usage/UsageMeter.php',
  `<?php

namespace Domain\\Billing\\Usage;

use Domain\\Billing\\Models\\Account;
use Domain\\Billing\\ValueObjects\\Period;
use Illuminate\\Support\\Collection;

final class UsageMeter
{
    public function __construct(private UsageRepository $usage, private PriceBook $prices) {}

    /** @return Collection<int, InvoiceLine> */
    public function linesFor(Account $account, Period $period): Collection
    {
        return $this->usage
            ->totalsFor($account, $period)
            ->filter(fn (UsageTotal $total) => $total->quantity > 0)
            ->map(fn (UsageTotal $total) => InvoiceLine::forUsage(
                metric: $total->metric,
                quantity: $total->quantity,
                unitPrice: $this->prices->unitPrice($account->plan, $total->metric),
            ))
            ->values();
    }
}`,
)

added(
  'src/Domain/Billing/Usage/UsageRepository.php',
  `<?php

namespace Domain\\Billing\\Usage;

use Domain\\Billing\\Models\\Account;
use Domain\\Billing\\Models\\UsageEvent;
use Domain\\Billing\\ValueObjects\\Period;
use Illuminate\\Support\\Collection;

final class UsageRepository
{
    /** @return Collection<int, UsageTotal> */
    public function totalsFor(Account $account, Period $period): Collection
    {
        return UsageEvent::query()
            ->whereBelongsTo($account)
            ->whereBetween('occurred_at', [$period->start, $period->end])
            ->selectRaw('metric, sum(quantity) as quantity')
            ->groupBy('metric')
            ->get()
            ->map(fn ($row) => new UsageTotal($row->metric, (int) $row->quantity));
    }
}`,
)

for (const name of ['UsageTotal', 'PriceBook', 'InvoiceLine']) {
  added(
    `src/Domain/Billing/Usage/${name}.php`,
    `<?php

namespace Domain\\Billing\\Usage;

final readonly class ${name}
{
    public function __construct(
        public string $metric,
        public int $quantity,
    ) {}
}`,
  )
}

modified('src/Domain/Billing/Models/Invoice.php', [
  {
    at: 12,
    title: 'final class Invoice extends Model',
    lines: `
    protected $casts = [
        'issued_at' => 'datetime',
+        'period_start' => 'date',
+        'period_end' => 'date',
        'status' => InvoiceStatus::class,
    ];`,
  },
])

modified('src/Domain/Billing/Enums/InvoiceStatus.php', [
  {
    at: 7,
    title: 'enum InvoiceStatus: string',
    lines: `
    case Draft = 'draft';
    case Issued = 'issued';
-    case Cancelled = 'cancelled';
+    case Void = 'void';
+    case Paid = 'paid';`,
  },
])

modified('src/Presentation/Business/Controllers/InvoiceController.php', [
  {
    at: 21,
    title: 'final class InvoiceController',
    lines: `
    public function index(IndexInvoiceRequest $request): ResponseBuilder
    {
-        return res()->data(InvoiceResource::collection($this->invoices->paginate()));
+        if (! auth()->user()->can('billing.invoices.index')) {
+            abort(403);
+        }
+
+        return res()->data(
+            InvoiceResource::collection(
+                $this->invoices->forBusiness($request->toFilter($this->business()))->paginate(30),
+            ),
+        );
    }`,
  },
  {
    at: 40,
    title: 'public function show(int $id): ResponseBuilder',
    lines: `
    public function show(int $id): ResponseBuilder
    {
-        $invoice = Invoice::findOrFail($id);
+        $invoice = $this->invoices->findForBusiness($id, $this->business()) ?? abort(404);

        return res()->data(new InvoiceResource($invoice->load('lines')));
    }`,
  },
])

for (const name of ['IndexInvoiceRequest', 'StoreUsageEventRequest', 'ExportInvoicesRequest']) {
  added(
    `src/Presentation/Business/Requests/Billing/${name}.php`,
    `<?php

namespace Presentation\\Business\\Requests\\Billing;

use Illuminate\\Foundation\\Http\\FormRequest;

final class ${name} extends FormRequest
{
    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'status' => ['nullable', 'string'],
        ];
    }
}`,
  )
}

added(
  'src/Presentation/Business/Resources/InvoiceResource.php',
  `<?php

namespace Presentation\\Business\\Resources;

use Illuminate\\Http\\Resources\\Json\\JsonResource;

final class InvoiceResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'status' => $this->status,
            'period' => [$this->period_start, $this->period_end],
            'total' => $this->total->format(),
            'lines' => InvoiceLineResource::collection($this->whenLoaded('lines')),
        ];
    }
}`,
)

modified('routes/api.php', [
  {
    at: 88,
    lines: `
Route::prefix('business')->middleware(['auth:sanctum', 'business'])->group(function () {
    Route::get('orders', [OrderController::class, 'index']);
+    Route::get('invoices', [InvoiceController::class, 'index']);
+    Route::get('invoices/{id}', [InvoiceController::class, 'show']);
+    Route::post('usage', [UsageController::class, 'store']);
});`,
  },
])

added(
  'database/migrations/2026_11_02_090000_add_period_to_invoices.php',
  `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->date('period_start')->nullable()->after('account_id');
            $table->date('period_end')->nullable()->after('period_start');
            $table->index(['account_id', 'period_start']);
        });
    }
};`,
)

added(
  'database/migrations/2026_11_02_091500_create_usage_events_table.php',
  `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usage_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained();
            $table->string('metric');
            $table->unsignedInteger('quantity');
            $table->timestamp('occurred_at')->index();
        });
    }
};`,
)

for (const lang of ['ar', 'en']) {
  for (const file of ['billing', 'invoices', 'usage']) {
    modified(`lang/${lang}/${file}.php`, [
      {
        at: 4,
        lines:
          lang === 'ar'
            ? `
    'title' => 'الفواتير',
-    'empty' => 'لا يوجد فواتير',
+    'empty' => 'لا توجد فواتير لهذه الفترة',
+    'usage' => 'الاستهلاك',`
            : `
    'title' => 'Invoices',
-    'empty' => 'No invoices',
+    'empty' => 'No invoices for this period',
+    'usage' => 'Usage',`,
      },
    ])
  }
}

added(
  'resources/js/pages/billing/InvoiceList.vue',
  `<script setup lang="ts">
import { computed } from 'vue'
import { useInvoices } from '@/composables/useInvoices'
import { formatMoney } from '@/lib/money'
import StatusBadge from './StatusBadge.vue'

const props = defineProps<{ businessId: number }>()
const { invoices, loading, period } = useInvoices(() => props.businessId)

const total = computed(() => invoices.value.reduce((sum, invoice) => sum + invoice.total, 0))
</script>

<template>
  <section class="flex flex-col gap-4">
    <header class="flex items-center justify-between">
      <h1 class="text-lg font-semibold">{{ $t('invoices.title') }}</h1>
      <PeriodPicker v-model="period" />
    </header>
    <InvoiceTable :rows="invoices" :loading="loading" />
    <p class="text-sm text-muted-foreground">{{ formatMoney(total) }}</p>
  </section>
</template>`,
)

for (const name of ['InvoiceTable', 'StatusBadge', 'PeriodPicker', 'UsageChart']) {
  added(
    `resources/js/pages/billing/${name}.vue`,
    `<script setup lang="ts">
defineProps<{ loading?: boolean }>()
</script>

<template>
  <div class="rounded-lg border p-4">
    <slot />
  </div>
</template>`,
  )
}

added(
  'resources/js/composables/useInvoices.ts',
  `import { ref, watch, type Ref } from 'vue'
import { api } from '@/lib/api'
import type { Invoice, Period } from '@/types/billing'

export function useInvoices(businessId: () => number) {
  const invoices: Ref<Invoice[]> = ref([])
  const loading = ref(false)
  const period = ref<Period>({ from: null, to: null })

  watch([businessId, period], async () => {
    loading.value = true
    invoices.value = await api.get('/business/invoices', { params: period.value })
    loading.value = false
  }, { immediate: true })

  return { invoices, loading, period }
}`,
)

added(
  'resources/js/types/billing.ts',
  `export type InvoiceStatus = 'draft' | 'issued' | 'void' | 'paid'

export interface Invoice {
  id: number
  number: string
  status: InvoiceStatus
  period: [string, string]
  total: number
}

export interface Period {
  from: string | null
  to: string | null
}`,
)

modified('resources/js/lib/money.ts', [
  {
    at: 1,
    lines: `
-export const formatMoney = (value: number) => '$' + value.toFixed(2)
+export const formatMoney = (value: number, currency = 'USD', locale = navigator.language) =>
+  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)`,
  },
])

for (const name of ['GenerateInvoiceTest', 'UsageMeterTest', 'InvoiceControllerTest', 'UsageRepositoryTest']) {
  added(
    `tests/Feature/Billing/${name}.php`,
    `<?php

use Domain\\Billing\\Models\\Account;

it('bills usage for the period', function () {
    $account = Account::factory()->withUsage(['api_calls' => 1200])->create();

    $invoice = app(GenerateInvoice::class)->handle($account, Period::lastMonth());

    expect($invoice->lines)->toHaveCount(2)
        ->and($invoice->total->format())->toBe('$84.00');
});`,
  )
}

added(
  'resources/js/pages/billing/__tests__/InvoiceList.test.ts',
  `import { mount } from '@vue/test-utils'
import InvoiceList from '../InvoiceList.vue'

it('shows the total for the period', async () => {
  const wrapper = mount(InvoiceList, { props: { businessId: 1 } })
  expect(wrapper.text()).toContain('$84.00')
})`,
)

modified(
  'docs/billing/usage.md',
  [
    {
      at: 1,
      lines: `
# Usage-based billing

-Invoices only include subscriptions.
+Invoices include subscriptions and metered usage for the billing period.
+Usage is recorded with \`POST /business/usage\` and priced from the plan's price book.`,
    },
  ],
  'renamed',
  'docs/billing.md',
)

removed(
  'src/Domain/Billing/Legacy/InvoiceCalculator.php',
  `<?php

namespace Domain\\Billing\\Legacy;

final class InvoiceCalculator
{
    public function total(array $lines): float
    {
        return array_sum(array_column($lines, 'amount'));
    }
}`,
)

modified('config/billing.php', [
  {
    at: 3,
    lines: `
return [
    'currency' => env('BILLING_CURRENCY', 'USD'),
+    'precision' => 2,
+    'usage_metrics' => ['api_calls', 'storage_gb', 'seats'],
];`,
  },
])

modified('.github/workflows/tests.yml', [
  {
    at: 20,
    lines: `
      - run: composer install --no-interaction
-      - run: php artisan test
+      - run: php artisan test --parallel
+      - run: pnpm test`,
  },
])

modified('composer.lock', [
  {
    at: 4,
    lines: `
-    "content-hash": "8f2c1d0b7a6e5f4d3c2b1a0f9e8d7c6b",
+    "content-hash": "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",`,
  },
])

modified('pnpm-lock.yaml', [
  {
    at: 210,
    lines: `
-  /chart.js@4.4.0:
+  /chart.js@4.4.6:`,
  },
])

export const DIFF = diffText()
