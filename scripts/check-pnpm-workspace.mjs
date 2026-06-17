import { readFileSync, existsSync } from 'fs'

const workspaceFile = 'pnpm-workspace.yaml'

if (!existsSync(workspaceFile)) {
  process.exit(0)
}

const contents = readFileSync(workspaceFile, 'utf8')

if (contents.includes('set this to true or false')) {
  console.error(
    [
      'Invalid pnpm-workspace.yaml: placeholder allowBuilds entries detected.',
      '',
      'pnpm 11 writes these during install when build scripts are not approved yet.',
      'Replace placeholders with true/false, or run:',
      '',
      '  pnpm approve-builds --all',
      '',
      'See pnpm-workspace.yaml in the repo for the committed baseline.',
    ].join('\n')
  )
  process.exit(1)
}

if (!/^packages:/m.test(contents)) {
  console.error(
    'Invalid pnpm-workspace.yaml: missing packages field (required for pnpm 9 on CI).'
  )
  process.exit(1)
}
