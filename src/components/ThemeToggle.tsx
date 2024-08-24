import { useColorMode } from '@kobalte/core'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-solid'

export function ThemeToggle() {
  const { colorMode, setColorMode } = useColorMode()

  // setColorMode('system');
  return (
    <Button
      aria-label="Toggle theme"
      title="Toggle theme"
      onClick={() => setColorMode(colorMode() === 'light' ? 'dark' : 'light')}
    >
      {colorMode() === 'light' ? <Sun class="h-4 w-4" /> : <Moon class="h-4 w-4" />}
    </Button>
  )
}
