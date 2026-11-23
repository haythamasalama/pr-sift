const LABEL = /^(squash and merge|merge pull request|rebase and merge)$/i

export interface MergeBoxButton {
  button: HTMLButtonElement
  anchor: Element
  disabled: boolean
}

// GitHub's merge button shares a group with the caret that picks the method, so PR Sift's button goes after the group.
function groupOf(button: HTMLButtonElement): Element {
  let el: Element = button
  for (let depth = 0; depth < 3 && el.parentElement; depth++) {
    const parent: HTMLElement = el.parentElement
    const buttons = [...parent.querySelectorAll('button')]
    if (buttons.length > 3) break
    if (buttons.some((b) => b !== button && b.hasAttribute('aria-haspopup'))) return parent
    el = parent
  }
  return button
}

export function findMergeButton(root: ParentNode = document): MergeBoxButton | null {
  for (const button of root.querySelectorAll('button')) {
    if (!LABEL.test((button.textContent ?? '').trim())) continue
    if (button.closest('[role="menu"], [role="listbox"], [role="dialog"], [hidden]')) continue
    if (!button.getClientRects().length) continue
    return {
      button,
      anchor: groupOf(button),
      disabled: button.disabled || button.getAttribute('aria-disabled') === 'true',
    }
  }
  return null
}
