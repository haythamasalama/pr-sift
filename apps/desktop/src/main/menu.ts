import { app, Menu, shell, type MenuItemConstructorOptions } from 'electron'
import type { MenuCommand } from '#shared/ipc'

const REPO = 'https://github.com/haythamasalama/pr-sift'

// The menu bar every desktop app has: Settings on ⌘, (Ctrl+, elsewhere), the views on ⌘1 to ⌘4, and the usual Edit,
// View and Window items. Items that belong to the window are passed to it as commands.
export function buildMenu(platform: NodeJS.Platform, run: (command: MenuCommand) => void) {
  const mac = platform === 'darwin'
  app.setAboutPanelOptions({ applicationName: 'PR Sift', applicationVersion: app.getVersion(), website: REPO })
  const item = (label: string, command: MenuCommand, accelerator?: string): MenuItemConstructorOptions => ({
    label,
    accelerator,
    click: () => run(command),
  })
  const settings = item(mac ? 'Settings…' : 'Settings', 'settings', 'CmdOrCtrl+,')

  const template: MenuItemConstructorOptions[] = [
    ...(mac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              settings,
              item('Account', 'account'),
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          } satisfies MenuItemConstructorOptions,
        ]
      : []),
    {
      label: 'File',
      submenu: [
        item('Add Project…', 'add-project', 'CmdOrCtrl+N'),
        item('Open Pull Request Link…', 'open-link', 'CmdOrCtrl+L'),
        { type: 'separator' },
        item('Refresh', 'refresh', 'CmdOrCtrl+R'),
        { type: 'separator' },
        ...(mac ? [{ role: 'close' } as const] : [settings, { type: 'separator' } as const, { role: 'quit' } as const]),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'selectAll' },
        item('Find…', 'find', 'CmdOrCtrl+F'),
      ],
    },
    {
      label: 'View',
      submenu: [
        item('Needs You', 'view:inbox', 'CmdOrCtrl+1'),
        item('Auto-approve', 'view:autoapprove', 'CmdOrCtrl+2'),
        item('Worktrees', 'view:worktrees', 'CmdOrCtrl+3'),
        item('Cleanup', 'view:cleanup', 'CmdOrCtrl+4'),
        { type: 'separator' },
        item('Toggle Sidebar', 'toggle-sidebar', mac ? 'Cmd+Ctrl+S' : 'Ctrl+B'),
        item('Focus on the Review', 'focus', 'CmdOrCtrl+.'),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(app.isPackaged ? [] : [{ type: 'separator' } as const, { role: 'toggleDevTools' } as const]),
      ],
    },
    {
      label: 'Go',
      submenu: [
        item('Back', 'back', 'CmdOrCtrl+['),
        { type: 'separator' },
        item('Previous Pull Request', 'pull:previous', 'CmdOrCtrl+Up'),
        item('Next Pull Request', 'pull:next', 'CmdOrCtrl+Down'),
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        item('Keyboard Shortcuts', 'shortcuts', 'CmdOrCtrl+/'),
        { type: 'separator' },
        { label: 'PR Sift on GitHub', click: () => void shell.openExternal(REPO) },
        { label: 'Report a Problem', click: () => void shell.openExternal(`${REPO}/issues/new`) },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
