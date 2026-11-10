export const SITE_URL = 'https://haythamasalama.github.io/pr-sift/'
export const REPO_URL = 'https://github.com/haythamasalama/pr-sift'
export const INSTALL_URL = `${REPO_URL}#install`
export const AUTHOR = { name: 'Haytham A. Salama', url: 'https://haythamasalama.me/', x: 'https://x.com/haythamasalama' }

export const SAME_MAKER_APPS = [
  { logo: 'easyshoot', name: 'EasyShoot', about: 'Screenshot app for Mac', url: 'https://easyshoot.app/' },
  {
    logo: 'whatsapp-business-monitor',
    name: 'WhatsApp Business Monitor',
    about: 'Open-source WhatsApp dashboard',
    url: 'https://wbm.haythamasalama.me/',
  },
]

export const home = {
  title: 'PR Sift: review large GitHub pull requests without the noise',
  description:
    'Free Chrome extension for large GitHub pull requests. Filter files by type and change, track what you viewed, and send private notes to Claude Code, Codex, Cursor or ChatGPT.',
  hero: {
    lead: 'Cut a pull request down to the files that matter, and keep notes only you can see. Send them to your AI, or post them when you choose.',
    cta: 'Install PR Sift',
    secondary: 'Star on GitHub',
  },
  demos: [
    ['tour', 'play', 'Full tour', 'A 10-file pull request, from noise to notes.'],
    ['filters', 'funnel', 'Filters', 'Include, exclude and combine types and changes.'],
    ['review', 'list-checks', 'Review', 'Mark files and whole folders as viewed.'],
    ['claude', 'bot', 'Notes to AI', 'Copy your notes for Claude Code, Codex, Cursor or ChatGPT.'],
  ],
  notesStory: {
    title: 'Notes for you, not for the whole pull request',
    lead: 'Write on any lines while you review. Notes stay in your browser until you decide otherwise.',
    cases: [
      [
        'bot',
        'Self-review your AI code',
        'You ship more code written with AI. Note what looks off, send the notes to your AI to fix, and nothing appears on the pull request.',
      ],
      ['users', 'Side notes in a team review', 'Keep your own questions and reminders while the team discusses. Nobody sees them.'],
      ['send', 'Publish only what helps', 'Turn any note into a GitHub review comment in one click. The rest stay private.'],
    ],
  },
  pain: {
    title: 'Big pull requests are mostly noise',
    lead: 'Reviewers keep asking GitHub for the same fixes. PR Sift ships them today.',
    issues: [
      [
        'shuffle',
        'Moved and renamed files',
        'Thousands of moved files bury a handful of real changes.',
        'https://github.com/orgs/community/discussions/159256',
        'Hide renamed files with one chip.',
      ],
      [
        'package',
        'Lock and generated files',
        'They count as files to review and hold your progress back.',
        'https://github.com/orgs/community/discussions/186824',
        'Shift-click .lock once, hidden for good.',
      ],
      [
        'hourglass',
        'Huge pull requests',
        'The Files changed page gets slow and hard to follow.',
        'https://github.com/orgs/community/discussions/183812',
        'Lazy rendering stays fast at 500 files.',
      ],
    ],
  },
  features: [
    {
      id: 'filters',
      icon: 'funnel',
      title: 'Include or exclude in one click',
      text: 'Chips come from the pull request itself.',
      points: [
        ['mouse-pointer-click', 'Click', 'shows only that type or change.'],
        ['eye-off', 'Shift-click', 'hides it on every pull request.'],
        ['plus', '+ type', 'adds endings like .blade.php or .test.ts.'],
      ],
      video: 'filters',
    },
    {
      id: 'folders',
      icon: 'folder-tree',
      title: 'Open and close whole folders',
      text: 'One folder, its subfolders, or the whole tree.',
      points: [
        ['folder-open', 'Subtree', 'expands or collapses everything inside.'],
        ['chevrons-down-up', 'All folders', 'in one click.'],
        ['search', 'Search', 'opens the tree to the match.'],
      ],
      video: 'folders',
    },
    {
      id: 'smart',
      icon: 'sparkles',
      title: 'Jump to a category',
      text: 'Files grouped the way reviewers read them.',
      points: [
        ['flask-conical', 'Tests', 'and their helpers.'],
        ['database', 'Migrations', 'and schema changes.'],
        ['languages', 'Translations', 'config and CI.'],
      ],
      video: 'smart-filters',
    },
    {
      id: 'review',
      icon: 'list-checks',
      title: 'Never read a file twice',
      text: 'Viewed files leave the list. The ring shows what is left.',
      points: [
        ['check-check', 'Folders', 'marked viewed at once.'],
        ['circle-dashed', 'Progress', 'that ignores search and filters.'],
        ['git-compare', 'New push', 'brings changed files back.'],
      ],
      video: 'review',
    },
    {
      id: 'notes',
      icon: 'notebook-pen',
      title: 'Private notes on any lines',
      text: 'Drag from + like on GitHub. Notes stay in your browser.',
      points: [
        ['text-select', 'Many lines', 'with an adjustable start and end.'],
        ['pencil', 'Edit', 'from the diff or the Notes list.'],
        ['send', 'Post', 'one to GitHub when it is worth it.'],
      ],
      video: 'notes',
    },
    {
      id: 'resolve',
      icon: 'circle-check',
      title: 'Resolve as you go',
      text: 'Resolved notes leave the diff and the prompt.',
      points: [
        ['circle-check', 'Resolve', 'with one click on the note.'],
        ['eye', 'Show resolved', 'when you want them back.'],
        ['rotate-ccw', 'Reopen', 'any note later.'],
      ],
      video: 'resolve',
    },
    {
      id: 'views',
      icon: 'columns-2',
      title: 'Read it your way',
      text: 'Unified or split, for every file or just one.',
      points: [
        ['columns-2', 'Split one file', 'and leave the rest unified.'],
        ['copy', 'Copy', 'the name, path, diff or added lines.'],
        ['file-diff', 'GitHub colors', 'and syntax highlighting.'],
      ],
      video: 'views',
    },
  ],
  ai: {
    title: 'Ask your AI about the code you doubt',
    lead: 'Open notes become one prompt with the file, lines and code. Nothing goes to a server or into a link.',
    steps: [
      ['notebook-pen', 'Write notes', 'on the lines you doubt.'],
      ['message-square-text', 'Open Notes', 'all of them, by file.'],
      ['bot', 'Pick your AI', 'a coding agent or a chat.'],
      ['clipboard-check', 'Paste', 'into your agent or the chat that opens.'],
    ],
  },
  theme: {
    title: 'Light, dark or your system',
    text: 'GitHub colors in both themes. Switch from the palette button, or let your device decide.',
  },
  openSource: {
    title: 'Built in the open',
    text: 'The source code is public. Read it, report a bug or send a pull request.',
    links: [
      ['github', 'Source code', REPO_URL],
      ['bug', 'Report a bug', `${REPO_URL}/issues/new?template=bug_report.yml`],
      ['lightbulb', 'Suggest an idea', `${REPO_URL}/issues/new?template=feature_request.yml`],
      ['messages-square', 'Discussions', `${REPO_URL}/discussions`],
      ['git-pull-request', 'Contribute', `${REPO_URL}/blob/main/CONTRIBUTING.md`],
      ['history', 'Changelog', 'changelog/'],
    ],
  },
  how: [
    ['download', 'Install', 'Add PR Sift to your browser.'],
    ['github', 'Open a pull request', 'Any Files changed tab on github.com.'],
    ['funnel', 'Press PR Sift', 'Bottom right of the page.'],
  ],
  privacy: {
    title: 'Your code stays in your browser',
    text: 'No server, no account, no analytics. PR Sift only talks to GitHub.',
  },
  faq: [
    ['Is PR Sift free?', 'Yes, for everyone, including at work. The source code is public under the PolyForm Shield license.'],
    ['Does it send my code anywhere?', 'No. It only talks to GitHub. Notes go to your clipboard when you copy them.'],
    ['Do I need a GitHub token?', 'No. A token is only used to post a note as a review comment.'],
    [
      'How is it different from the GitHub file filter?',
      'It combines type and change filters, remembers hidden types, groups files, marks folders as viewed and adds private notes.',
    ],
    ['Which browsers does it support?', 'Chrome, Edge, Brave, Arc, Dia, Opera, Vivaldi and other Chromium browsers.'],
    ['Does it work on private repositories?', 'Yes, anything you can open on github.com. GitHub Enterprise Server is not supported yet.'],
  ],
}

export const guides = [
  {
    slug: 'self-review-ai-generated-pull-requests',
    short: 'Self-review AI pull requests',
    title: 'Self-review an AI-generated pull request with private notes',
    description: 'Check code your AI wrote before anyone else reads it, without leaving public comments.',
    video: 'notes',
    sections: [
      [
        'eye-off',
        'Hide what the AI touched by accident',
        'Lock files, formatting-only changes and generated files: shift-click their types so they stay out of the way.',
      ],
      [
        'notebook-pen',
        'Note every doubt on the line',
        'Drag over the lines and write what looks wrong. Notes stay in your browser, not on the pull request.',
      ],
      [
        'bot',
        'Send the notes back to your AI',
        'Open Notes and copy them for Claude Code, Codex, Cursor or ChatGPT. Each note carries its file, lines and code.',
      ],
      [
        'circle-check',
        'Resolve as fixes land',
        'Push the fixes, mark notes resolved, and check that changed files come back for a second look.',
      ],
      [
        'send',
        'Publish only if it helps others',
        'If a note is worth sharing with reviewers, post it to GitHub as a review comment. The rest stay private.',
      ],
    ],
  },
  {
    slug: 'review-large-pull-requests',
    short: 'Review a large pull request',
    title: 'How to review a large pull request on GitHub',
    description: 'Hide the noise, review in passes, and track what you have read.',
    video: 'tour',
    sections: [
      ['file-text', 'Read the description first', 'Decide what changes and where the risk is. A few files usually carry the decision.'],
      ['eye-off', 'Hide the noise', 'Shift-click .lock and other generated types. Open Smart filters for categories and busy folders.'],
      ['layers', 'Review in passes', 'Core logic, then tests, then the rest. Short sessions catch more than one long one.'],
      [
        'check-check',
        'Mark what you read',
        'Tick Viewed on files or folders and turn on Hide viewed. A new push brings changed files back.',
      ],
      ['notebook-pen', 'Keep doubts private', 'Write notes, ask your AI about them, then post only what still matters.'],
    ],
  },
  {
    slug: 'hide-lock-and-generated-files',
    short: 'Hide lock and generated files',
    title: 'Hide lock files and generated files in a GitHub pull request',
    description: 'Keep lock files, minified files and generated code out of every review.',
    video: 'filters',
    sections: [
      ['package', 'Why hide them', 'Nobody reads them, and they hold your viewed progress back.'],
      [
        'mouse-pointer-click',
        'Shift-click the type',
        'Shift-click or right-click a chip such as .lock. It stays hidden on every pull request.',
      ],
      ['settings', 'Hide by path', 'In the options, add patterns such as **/*.lock or **/generated/**.'],
      ['eye', 'Peek when needed', 'Tick Hidden in the toolbar to see them without changing your rules.'],
    ],
  },
  {
    slug: 'filter-pull-request-files-by-type-and-status',
    short: 'Filter by type and change',
    title: 'Filter pull request files by extension and change type',
    description: 'Show only new PHP files, deleted tests or renamed files by combining filters.',
    video: 'filters',
    sections: [
      ['layers', 'Two groups', 'Types (.php, .vue, .test.ts) and changes (added, modified, deleted, renamed, with notes).'],
      ['funnel', 'Combine them', 'Inside a group chips add up. Across groups they narrow: .php and added shows new PHP files.'],
      ['plus', 'Your own endings', 'Press + type and enter .blade.php, .spec.ts or Controller.php.'],
      ['rotate-ccw', 'Start over', 'Reset filters clears chips, search and folders.'],
    ],
  },
  {
    slug: 'send-code-review-notes-to-ai',
    short: 'Send notes to AI',
    title: 'Send code review notes to Claude Code, Codex, Cursor or ChatGPT',
    description: 'Turn private notes into one prompt with the code attached.',
    video: 'claude',
    sections: [
      ['notebook-pen', 'Write notes', 'Drag from the + next to a line to cover several lines, then write your question.'],
      ['message-square-text', 'Open Notes', 'Every open note, by file. Resolved notes stay out of the prompt.'],
      [
        'bot',
        'Pick the assistant',
        'Use the arrow next to Copy: a coding agent (Claude Code, Codex, Cursor, GitHub Copilot), a chat (Claude, ChatGPT) or clipboard only.',
      ],
      [
        'clipboard-check',
        'Paste',
        'The prompt is copied with file, lines and code. Paste it into your agent; Claude and ChatGPT open in a new tab.',
      ],
    ],
  },
]

export const brand = {
  title: 'Brand and press kit',
  description: 'Logo, colors, name and screenshots for articles, posts and talks.',
  descriptions: [
    ['One line', 'Review large GitHub pull requests without the noise.'],
    [
      'Short',
      'PR Sift is a free Chrome extension for large GitHub pull requests: smart file filters, viewed tracking and private notes for Claude Code, Codex, Cursor or ChatGPT.',
    ],
  ],
  colors: [
    ['Black', '#000000'],
    ['White', '#ffffff'],
    ['Gray', '#57606a'],
  ],
}
