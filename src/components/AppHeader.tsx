import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'

import Logo from '@/components/Logo'
import XPBadge from '@/components/gamification/XPBadge'
import { Button } from '@/components/ui/button'
import { isClerkClientConfigured } from '@/lib/clerk'

const NAV = [
  { to: '/analytics', label: 'Analytics' },
  { to: '/journal', label: 'Journal' },
  { to: '/calculator', label: 'Calculator' },
] as const

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-4 px-4 md:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" aria-label="Quant Companion home">
            <Logo size={30} />
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="nav-link"
                activeProps={{ className: 'nav-link is-active' }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <XPBadge />
          <AuthControls />
        </div>
      </div>

      {/* mobile nav */}
      <nav className="flex items-center gap-6 overflow-x-auto border-t border-border/40 px-4 py-2 text-sm md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="nav-link whitespace-nowrap"
            activeProps={{ className: 'nav-link is-active' }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}

function AuthControls() {
  if (!isClerkClientConfigured()) return null

  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button size="sm">Get started</Button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </>
  )
}
