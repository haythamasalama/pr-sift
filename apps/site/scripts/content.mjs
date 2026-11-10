export const SITE_URL = 'https://haythamasalama.github.io/pr-sift/'
export const REPO_URL = 'https://github.com/haythamasalama/pr-sift'
export const INSTALL_URL = `${REPO_URL}#install`
export const AUTHOR = { name: 'Haytham Salama', url: 'https://haythamasalama.me/' }

export const home = {
  title: 'PR Sift: review large GitHub pull requests without the noise',
  description:
    'PR Sift is a free, open-source Chrome extension for reviewing large GitHub pull requests. Filter files by type and change, hide what you have viewed, and send private notes to Claude, ChatGPT or Gemini.',
  hero: {
    eyebrow: 'Free and open source',
    title: 'Review large pull requests without the noise.',
    lead: 'PR Sift turns a 200-file GitHub pull request into a focused review. Filter by type and change, hide what you have read, and keep private notes you can hand to your AI.',
    cta: 'Install PR Sift',
    secondary: 'Star on GitHub',
  },
  problem: {
    title: 'Pull requests got bigger. Reviewing them did not get easier.',
    lead: 'AI agents and big refactors open pull requests with hundreds of files. GitHub shows them in one long list, so the files that matter hide between lock files, translations and renames.',
    cards: [
      ['layers', 'Noise everywhere', 'Lock files, generated code, moved files and translations bury the few files that carry the change.'],
      ['search', 'You lose your place', 'After a new push or a break you scroll again, unsure which files you already read.'],
      [
        'lock',
        'Thoughts you are not ready to post',
        'You want to note a doubt or ask an AI about a line without commenting in front of the team.',
      ],
    ],
  },
  features: [
    {
      id: 'filters',
      icon: 'funnel',
      eyebrow: 'Include and exclude',
      title: 'Show exactly the files you want.',
      text: 'Chips are generated from the pull request. Click .php to show only PHP, add added to see only new PHP files, shift-click .lock to hide lock files for good.',
      points: [
        ['funnel', 'Type and change together', 'Pick .php and added: only new PHP files.'],
        ['eye-off', 'Hide forever', 'Shift-click a type. It stays hidden on every pull request.'],
        ['file-diff', 'Your own types', 'Add .blade.php, .test.ts, .d.ts or any ending you use.'],
      ],
      video: 'filters',
    },
    {
      id: 'smart',
      icon: 'sparkles',
      eyebrow: 'Smart filters and tree',
      title: 'Find where the change really is.',
      text: 'Files are grouped into tests, migrations, translations, config and CI, with the busiest folders first. Collapse or expand any folder and everything inside it.',
      points: [
        ['sparkles', 'Categories', 'Review all tests, then migrations, then the rest.'],
        ['folder-tree', 'Folder by folder', 'Expand or collapse one folder and its children.'],
        ['search', 'Search', 'Type part of a path and the tree opens to it.'],
      ],
      video: 'smart-filters',
    },
    {
      id: 'progress',
      icon: 'list-checks',
      eyebrow: 'Review mode',
      title: 'Never read the same file twice.',
      text: 'Mark a file or a whole folder as viewed and it leaves the list. A ring shows what is left. Marks follow the content, so a file that changes after a new push comes back.',
      points: [
        ['check-check', 'Mark a folder', 'Clear every translation or migration in one click.'],
        ['circle-check', 'Progress', 'Always know how many files are left.'],
        ['git-compare', 'Changed again', 'Files edited after you viewed them return by themselves.'],
      ],
      video: 'review',
    },
    {
      id: 'notes',
      icon: 'notebook-pen',
      eyebrow: 'Private notes',
      title: 'Think out loud. Nobody sees it.',
      text: 'Drag over any lines to write a note that stays in your browser. Adjust the range, resolve notes as you go, and post one to GitHub only when it is worth it.',
      points: [
        ['notebook-pen', 'Many lines', 'Drag from + like on GitHub, then fine-tune start and end.'],
        ['circle-check', 'Resolve', 'Resolved notes leave the diff and the prompt.'],
        ['message-square-text', 'Post when ready', 'Turn a note into a review comment in one click.'],
      ],
      video: 'notes',
    },
    {
      id: 'views',
      icon: 'columns-2',
      eyebrow: 'Your way of reading',
      title: 'Split, unified, and every copy you need.',
      text: 'Switch the whole review between unified and split, or flip one file without touching the rest. Copy a file name, its full path, the diff or only the added lines.',
      points: [
        ['columns-2', 'Per file', 'One file side by side, the others unified.'],
        ['copy', 'Copy menu', 'Name, path, diff or added lines.'],
        ['sun-moon', 'Light and dark', 'Follows your device, or pick one.'],
      ],
      video: 'views',
    },
  ],
  ai: {
    eyebrow: 'Notes to AI',
    title: 'Send your review notes to Claude, ChatGPT or Gemini.',
    lead: 'Your notes become one prompt with the file, the lines and the surrounding code. PR Sift copies it and opens the assistant you choose. Nothing goes through a server or into a link.',
    steps: [
      ['notebook-pen', 'Write notes', 'Drag over lines and write what worries you. Notes stay in your browser.'],
      ['message-square-text', 'Open Notes', 'Every open note, grouped by file, with its line range.'],
      ['bot', 'Pick your assistant', 'Claude, ChatGPT, Gemini, or the clipboard only. PR Sift remembers it.'],
      ['copy', 'Copy and paste', 'The prompt is on your clipboard and the assistant is open. Paste and ask.'],
    ],
    image: 'ai-export',
  },
  how: {
    title: 'Three steps. No account.',
    steps: [
      ['download', 'Install', 'Add PR Sift to your browser. It only runs on github.com.'],
      ['github', 'Open a pull request', 'Go to Files changed on any pull request you can see.'],
      ['funnel', 'Press PR Sift', 'The review opens on top of GitHub with your filters and notes.'],
    ],
  },
  privacy: {
    title: 'Your code stays in your browser.',
    text: 'PR Sift reads pull requests with your GitHub login. Filters, viewed marks and notes are stored locally. No server, no account, no analytics. A GitHub token is optional and only posts a note as a comment.',
  },
  faq: [
    ['Is PR Sift free?', 'Yes. It is free and open source under the MIT license.'],
    [
      'Does it send my code anywhere?',
      'No. It talks only to GitHub. Notes are copied to your clipboard when you ask, and the extension never sends anything to an AI service.',
    ],
    [
      'Do I need a GitHub token?',
      'No. A token is only used to post a private note as a review comment, or as a fallback when GitHub will not load a very large diff.',
    ],
    [
      'How is it different from the GitHub file filter?',
      'GitHub can hide some file types and viewed files. PR Sift combines types with the change status, remembers hidden types, groups files into smart categories, tracks viewed files by content and adds private multi-line notes.',
    ],
    ['Which browsers does it support?', 'Chrome and Chromium browsers such as Edge, Brave, Arc, Dia, Opera and Vivaldi.'],
    ['Does it work with private repositories?', 'Yes, anything you can open on github.com. GitHub Enterprise Server is not supported yet.'],
  ],
}

export const guides = [
  {
    slug: 'review-large-pull-requests',
    short: 'Review a large pull request',
    title: 'How to review a large pull request on GitHub',
    description:
      'A practical method for reviewing pull requests with hundreds of files: triage the noise, review in passes, and track what you have read.',
    sections: [
      [
        'Start with the description, not file one',
        'Read the pull request description and the commit list first. Decide which part of the system changes and what the risk is. A 200-file pull request usually has ten files that carry the decision and many that follow from it.',
      ],
      [
        'Split the files into three piles',
        'Core logic, supporting changes such as tests and translations, and mechanical noise such as lock files, generated code and renames. In PR Sift, shift-click .lock and the generated types to hide them, then open Smart filters to see the categories and the busiest folders.',
      ],
      [
        'Review in passes',
        'Read the core logic first for correctness. Then read the tests and check they cover what changed. Finish with the supporting files, quickly. Short sessions catch more than one long one.',
      ],
      [
        'Mark what you have read',
        'Tick Viewed on each file, or on a whole folder of translations. With Hide viewed on, the list shrinks as you go and the ring shows what is left. If the author pushes again, the files they changed come back.',
      ],
      [
        'Keep your doubts private until they are worth posting',
        'Write private notes on the lines you are unsure about. Ask your AI assistant about them in one go, then post only the comments that still matter.',
      ],
    ],
  },
  {
    slug: 'hide-lock-and-generated-files',
    short: 'Hide lock and generated files',
    title: 'Hide lock files and generated files in a GitHub pull request',
    description:
      'Keep pnpm-lock.yaml, composer.lock, minified files and other generated output out of your review, and keep them hidden on every pull request.',
    sections: [
      [
        'Why they get in the way',
        'Lock files and generated output change in hundreds of lines and are not meant to be read. They also hold your viewed progress back, because you have to open each one to tick it.',
      ],
      [
        'Hide a type with one click',
        'In PR Sift, shift-click or right-click a chip such as .lock. It turns red and those files leave the list. The choice is remembered on every pull request until you press Reset filters.',
      ],
      [
        'Hide paths by rule',
        'In the options page, add path patterns such as **/*.lock, **/*.min.js or **/generated/**. Files that match stay out of the list and the progress count until you tick Hidden.',
      ],
      ['Bring them back for a moment', 'Tick Hidden in the toolbar to see the hidden files without changing your rules.'],
    ],
  },
  {
    slug: 'filter-pull-request-files-by-type-and-status',
    short: 'Filter by type and change',
    title: 'Filter pull request files by extension and change type',
    description:
      'Show only new PHP files, only deleted tests or only renamed files in a GitHub pull request by combining type and status filters.',
    sections: [
      [
        'Types and changes are separate groups',
        'PR Sift builds a chip for every file ending in the pull request (.php, .vue, .test.ts) and one for each kind of change: added, modified, deleted, renamed, and files that have your notes.',
      ],
      [
        'Combine them like a sentence',
        'Inside a group, chips add up: .php and .ts shows both. Across groups they narrow down: .php and added shows only new PHP files.',
      ],
      [
        'Add your own endings',
        'Press + type and enter an ending such as .blade.php, .spec.ts or Controller.php. It becomes a chip for every pull request.',
      ],
      ['Undo everything', 'Reset filters clears the chips, the search and the selected folders in one click.'],
    ],
  },
  {
    slug: 'send-code-review-notes-to-ai',
    short: 'Send notes to AI',
    title: 'Send code review notes to Claude, ChatGPT or Gemini',
    description:
      'Collect your questions about a pull request as private notes and send them to your AI assistant as one prompt with the code attached.',
    sections: [
      [
        'Write the notes where the code is',
        'Hover a line and drag from the + to select several lines, or select code and press Add note. Write the question as you would ask a colleague.',
      ],
      [
        'Open Notes',
        'The Notes button lists every open note by file with its lines. Resolve the ones you answered yourself; resolved notes are left out of the prompt.',
      ],
      [
        'Choose the assistant',
        'Use the arrow next to Copy to pick Claude, ChatGPT, Gemini or the clipboard only. PR Sift remembers your choice.',
      ],
      [
        'Copy and paste',
        'Press Copy. The prompt lists each note with its file, line range and surrounding code, and the assistant opens in a new tab. Paste it and ask. Nothing is sent by the extension itself.',
      ],
    ],
  },
]

export const brand = {
  title: 'Brand and press kit',
  description: 'The PR Sift logo, colors, name, descriptions and screenshots for articles, posts and talks.',
  descriptions: [
    ['One line', 'Review large GitHub pull requests without the noise.'],
    [
      'Short',
      'PR Sift is a free, open-source Chrome extension that turns large GitHub pull requests into a focused review: smart file filters, viewed tracking and private notes you can send to Claude, ChatGPT or Gemini.',
    ],
  ],
  colors: [
    ['Black', '#0a0a0a'],
    ['White', '#ffffff'],
    ['Gray', '#737373'],
  ],
}
