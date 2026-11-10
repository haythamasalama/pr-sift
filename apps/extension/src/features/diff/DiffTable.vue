<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { MessageSquarePlus, Plus } from '@lucide/vue'
import { useNotesContext } from '../notes/useNotes'
import { anchorOf, buildSplitRows, lineText, parsePatch } from '@pr-sift/core'
import { highlightRows } from './highlight'
import { whenIdle } from '../../lib/idle'
import type { DiffMode, DiffRow, Note } from '../../lib/types'
import NoteBox from '../notes/NoteBox.vue'
import NoteEditor from '../notes/NoteEditor.vue'
import { Button } from '@/components/ui/button'

const { filename, patch, mode } = defineProps<{ filename: string; patch: string; mode: DiffMode }>()
const ctx = useNotesContext()

const LIMIT = 500
const rows = computed(() => parsePatch(patch))
const splitRows = computed(() => buildSplitRows(rows.value))
const highlighted = shallowRef<Map<number, string>>(new Map())
let cancelIdle: (() => void) | null = null

function scheduleHighlight() {
  cancelIdle?.()
  cancelIdle = whenIdle(() => (highlighted.value = highlightRows(rows.value, filename)))
}

watch(() => [patch, filename], scheduleHighlight, { immediate: true })
onBeforeUnmount(() => cancelIdle?.())
const showAll = shallowRef(false)
const total = computed(() => (mode === 'split' ? splitRows.value.length : rows.value.length))
const visibleRows = computed(() => (showAll.value ? rows.value : rows.value.slice(0, LIMIT)))
const visibleSplit = computed(() => (showAll.value ? splitRows.value : splitRows.value.slice(0, LIMIT)))

const rowAt = computed(() => {
  const index = new Map<string, number>()
  rows.value.forEach((r, i) => {
    const a = anchorOf(r)
    if (a) index.set(`${a.side}:${a.line}`, i)
  })
  return index
})

const notesByRow = computed(() => {
  const map = new Map<number, Note[]>()
  for (const n of ctx.notes.value) {
    if (n.file !== filename || (n.resolved && !ctx.showResolved.value)) continue
    const i = rowAt.value.get(`${n.side}:${n.line}`)
    if (i !== undefined) map.set(i, [...(map.get(i) ?? []), n])
  }
  return map
})

const notesFor = (...indexes: (number | null)[]) =>
  indexes.filter((i): i is number => i !== null).flatMap((i) => notesByRow.value.get(i) ?? [])

interface Span {
  side: Note['side']
  start: number
  end: number
}

const draft = shallowRef<(Span & { at: number; quote: string }) | null>(null)
const active = shallowRef<Span | null>(null)
const drag = shallowRef<{ from: number } | null>(null)
const floating = shallowRef<{ x: number; y: number; from: number; to: number; quote: string } | null>(null)
const root = useTemplateRef<HTMLElement>('root')
const viewport = shallowRef('100%')
let resizeObserver: ResizeObserver | undefined
onMounted(() => {
  if (!root.value || typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(() => (viewport.value = `${root.value?.clientWidth ?? 0}px`))
  resizeObserver.observe(root.value)
})
onBeforeUnmount(() => resizeObserver?.disconnect())

const draftHere = (...indexes: (number | null)[]) => draft.value !== null && indexes.includes(draft.value.at)

function spanOf(from: number, to: number): Span | null {
  const a = anchorOf(rows.value[from]!)
  if (!a) return null
  const b = anchorOf(rows.value[to]!)
  const other = b && b.side === a.side ? b.line : a.line
  return { side: a.side, start: Math.min(a.line, other), end: Math.max(a.line, other) }
}

function openRange(from: number, to: number, quote: string) {
  const span = spanOf(from, to)
  if (!span) return
  const at = rowAt.value.get(`${span.side}:${span.end}`)
  if (at === undefined) return
  draft.value = { ...span, at, quote }
  active.value = span
  floating.value = null
}

function closeDraft() {
  draft.value = null
  active.value = null
}

function startDrag(index: number) {
  if (!anchorOf(rows.value[index]!)) return
  drag.value = { from: index }
  active.value = spanOf(index, index)
  floating.value = null
  let last = index
  const over = (e: MouseEvent) => {
    const el = (e.target as Element | null)?.closest<HTMLElement>('[data-i]')
    if (!el || !root.value?.contains(el)) return
    const i = Number(el.dataset.i)
    const span = spanOf(index, i)
    if (span && span.side === active.value?.side) {
      last = i
      active.value = span
    }
  }
  const finish = () => {
    root.value?.removeEventListener('mouseover', over)
    drag.value = null
    openRange(index, last, '')
  }
  root.value?.addEventListener('mouseover', over)
  document.addEventListener('mouseup', finish, { once: true })
}

async function saveDraft(text: string, range?: { start: number; end: number }) {
  const d = draft.value
  if (!d) return
  const r = range ?? d
  await ctx.add({
    file: filename,
    side: d.side,
    line: r.end,
    ...(r.start < r.end ? { startLine: r.start } : {}),
    lineText: lineText(rows.value, d.side, r.end),
    quote: d.quote,
    text,
  })
  closeDraft()
}

function draftAnchor() {
  const d = draft.value
  return d ? { file: filename, side: d.side, line: d.end, ...(d.start < d.end ? { startLine: d.start } : {}) } : null
}

function onMouseUp() {
  const container = root.value?.getRootNode() as (ShadowRoot & { getSelection?: () => Selection | null }) | undefined
  const sel = container?.getSelection?.() ?? window.getSelection()
  const quote = sel?.toString().trim()
  if (!sel || !quote || !sel.rangeCount) return
  const range = sel.getRangeAt(0)
  const rowOf = (node: Node) => {
    const el = node instanceof Element ? node : node.parentElement
    const anchored = el?.closest<HTMLElement>('[data-i]')
    return anchored && root.value?.contains(anchored) ? Number(anchored.dataset.i) : null
  }
  const from = rowOf(range.startContainer)
  if (from === null || !anchorOf(rows.value[from]!)) return
  const to = rowOf(range.endContainer) ?? from
  const rect = range.getBoundingClientRect()
  floating.value = { x: rect.left, y: rect.bottom + 6, from, to, quote: quote.slice(0, 300) }
}

const isActive = (index: number | null) => {
  const span = active.value
  const a = span && index !== null ? anchorOf(rows.value[index]!) : null
  return !!span && !!a && a.side === span.side && a.line >= span.start && a.line <= span.end
}
const lit = 'bg-amber-500/25!'

const rowClass: Record<DiffRow['kind'], string> = {
  add: 'bg-add-bg',
  del: 'bg-del-bg',
  ctx: '',
  hunk: 'bg-hunk text-muted-foreground',
  note: 'text-muted-foreground italic',
}
const sign = { add: '+', del: '−', ctx: '', hunk: '', note: '' }

function cellClass(index: number | null, side: 'left' | 'right') {
  if (index === null) return 'bg-muted'
  if (isActive(index)) return lit
  const kind = rows.value[index]!.kind
  if (side === 'left' && kind === 'del') return 'bg-del-bg'
  if (side === 'right' && kind === 'add') return 'bg-add-bg'
  return ''
}
</script>

<template>
  <div ref="root" class="overflow-x-auto" @mouseup="onMouseUp" @mousedown="floating = null">
    <table v-if="mode === 'unified'" class="w-full border-collapse font-mono text-xs leading-[1.5]">
      <tbody>
        <template v-for="(row, i) in visibleRows" :key="i">
          <tr :data-i="i" class="group" :class="[rowClass[row.kind], isActive(i) ? lit : '']">
            <td class="w-6 px-0.5 text-center select-none">
              <Button
                v-if="anchorOf(row)"
                size="icon-xs"
                class="size-4 invisible group-hover:visible"
                title="Add a private note"
                aria-label="Add a private note"
                @mousedown.prevent="startDrag(i)"
                @click="(e: MouseEvent) => e.detail === 0 && openRange(i, i, '')"
              >
                <Plus />
              </Button>
            </td>
            <td class="w-px min-w-10 px-2 text-right text-muted-foreground select-none">{{ row.oldNo }}</td>
            <td class="w-px min-w-10 px-2 text-right text-muted-foreground select-none">{{ row.newNo }}</td>
            <td class="w-4 text-center select-none" :class="row.kind === 'add' ? 'text-add-fg' : 'text-del-fg'">{{ sign[row.kind] }}</td>
            <td v-if="highlighted.has(i)" class="pr-3 whitespace-pre" v-html="highlighted.get(i)" />
            <td v-else class="pr-3 whitespace-pre">{{ row.text }}</td>
          </tr>
          <tr v-for="n in notesFor(i)" :key="n.id">
            <td colspan="5" class="p-0">
              <div class="sticky left-0" :style="{ width: viewport }">
                <NoteBox :note="n" :rows="rows" @range="active = $event ? { side: n.side, ...$event } : null" />
              </div>
            </td>
          </tr>
          <tr v-if="draftHere(i) && draft">
            <td colspan="5" class="p-0">
              <div class="sticky left-0" :style="{ width: viewport }">
                <NoteEditor
                  :quote="draft.quote"
                  :rows="rows"
                  :side="draft.side"
                  :range="{ start: draft.start, end: draft.end }"
                  @range="active = { side: draft.side, ...$event }"
                  @save="saveDraft"
                  @cancel="closeDraft"
                  @open-github="draftAnchor() && ctx.openOnGithub(draftAnchor()!)"
                />
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>

    <table v-else class="w-full table-fixed border-collapse font-mono text-xs leading-[1.5]">
      <colgroup>
        <col class="w-12" />
        <col />
        <col class="w-12" />
        <col />
      </colgroup>
      <tbody>
        <template v-for="(row, i) in visibleSplit" :key="i">
          <tr v-if="row.full !== null" :class="rowClass[rows[row.full]!.kind]">
            <td colspan="4" class="px-3 whitespace-pre-wrap">{{ rows[row.full]!.text }}</td>
          </tr>
          <tr v-else>
            <td
              :data-i="row.left ?? undefined"
              class="group/l relative px-2 text-right text-muted-foreground select-none"
              :class="cellClass(row.left, 'left')"
            >
              <span :class="row.left !== null ? 'group-hover/l:invisible' : ''">{{ row.left !== null ? rows[row.left]!.oldNo : '' }}</span>
              <Button
                v-if="row.left !== null"
                size="icon-xs"
                class="size-4 invisible absolute inset-y-0 right-1 my-auto group-hover/l:visible"
                title="Add a private note"
                aria-label="Add a private note"
                @mousedown.prevent="startDrag(row.left)"
                @click="(e: MouseEvent) => e.detail === 0 && openRange(row.left!, row.left!, '')"
              >
                <Plus />
              </Button>
            </td>
            <td
              :data-i="row.left ?? undefined"
              class="border-r border-border pr-2 pl-1 whitespace-pre-wrap break-all"
              :class="cellClass(row.left, 'left')"
            >
              <span v-if="row.left !== null" class="mr-1 text-del-fg select-none">{{ rows[row.left]!.kind === 'del' ? '−' : '' }}</span
              ><span v-if="row.left !== null && highlighted.has(row.left)" v-html="highlighted.get(row.left)" /><template v-else>{{
                row.left !== null ? rows[row.left]!.text : ''
              }}</template>
            </td>
            <td
              :data-i="row.right ?? undefined"
              class="group/r relative px-2 text-right text-muted-foreground select-none"
              :class="cellClass(row.right, 'right')"
            >
              <span :class="row.right !== null ? 'group-hover/r:invisible' : ''">{{
                row.right !== null ? rows[row.right]!.newNo : ''
              }}</span>
              <Button
                v-if="row.right !== null"
                size="icon-xs"
                class="size-4 invisible absolute inset-y-0 right-1 my-auto group-hover/r:visible"
                title="Add a private note"
                aria-label="Add a private note"
                @mousedown.prevent="startDrag(row.right)"
                @click="(e: MouseEvent) => e.detail === 0 && openRange(row.right!, row.right!, '')"
              >
                <Plus />
              </Button>
            </td>
            <td :data-i="row.right ?? undefined" class="pr-2 pl-1 whitespace-pre-wrap break-all" :class="cellClass(row.right, 'right')">
              <span v-if="row.right !== null" class="mr-1 text-add-fg select-none">{{ rows[row.right]!.kind === 'add' ? '+' : '' }}</span
              ><span v-if="row.right !== null && highlighted.has(row.right)" v-html="highlighted.get(row.right)" /><template v-else>{{
                row.right !== null ? rows[row.right]!.text : ''
              }}</template>
            </td>
          </tr>
          <tr v-for="n in notesFor(row.left, row.right)" :key="n.id">
            <td colspan="4" class="p-0">
              <div class="sticky left-0" :style="{ width: viewport }">
                <NoteBox :note="n" :rows="rows" @range="active = $event ? { side: n.side, ...$event } : null" />
              </div>
            </td>
          </tr>
          <tr v-if="draftHere(row.left, row.right) && draft">
            <td colspan="4" class="p-0">
              <div class="sticky left-0" :style="{ width: viewport }">
                <NoteEditor
                  :quote="draft.quote"
                  :rows="rows"
                  :side="draft.side"
                  :range="{ start: draft.start, end: draft.end }"
                  @range="active = { side: draft.side, ...$event }"
                  @save="saveDraft"
                  @cancel="closeDraft"
                  @open-github="draftAnchor() && ctx.openOnGithub(draftAnchor()!)"
                />
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>

    <div v-if="!showAll && total > LIMIT" class="border-t border-border p-2 text-center">
      <Button size="sm" variant="outline" @click="showAll = true">Show all {{ total }} lines</Button>
    </div>

    <Button
      v-if="floating"
      size="sm"
      class="fixed z-[60] shadow-lg"
      :style="{ left: floating.x + 'px', top: floating.y + 'px' }"
      @mousedown.stop.prevent
      @click="openRange(floating.from, floating.to, floating.quote)"
    >
      <MessageSquarePlus /> Add note
    </Button>
  </div>
</template>
