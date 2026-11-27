// 12345+login@users.noreply.github.com, or login@users.noreply.github.com
export function loginFromEmail(email: string) {
  return /^(?:\d+\+)?([a-z\d](?:[a-z\d-]{0,38}))@users\.noreply\.github\.com$/i.exec(email)?.[1]
}
