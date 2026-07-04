import { useStore } from '@tanstack/react-store'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  currentHeaderConfigStore,
  savedConfigsStore,
} from '@/lib/headerMappings'

export function FileFormatSelect({ className }: { className?: string }) {
  const savedConfigs = useStore(savedConfigsStore)
  const currentHeaderConfig = useStore(currentHeaderConfigStore)

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <Label className="text-xs text-muted-foreground">Data Header Config</Label>
      <Select
        value={currentHeaderConfig.name}
        onValueChange={(value) => {
          const config = savedConfigsStore.state.find((c) => c.name === value)
          if (config) {
            currentHeaderConfigStore.setState(() => config)
          }
        }}
      >
        <SelectTrigger className="min-w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {savedConfigs.map((c) => (
            <SelectItem key={c.name} value={c.name}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default FileFormatSelect
