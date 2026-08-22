import { spawnSync } from 'node:child_process'

const isProductionDeploy = process.env.VERCEL_ENV === 'production'
const [command, ...args] = isProductionDeploy
  ? ['convex', 'deploy', '--cmd', 'pnpm build:ui']
  : ['pnpm', 'build:ui']

const result = spawnSync(command, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (result.error) {
  throw result.error
}

process.exitCode = result.status ?? 1
