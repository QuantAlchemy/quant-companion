import { useStore } from '@tanstack/react-store'
import { useEffect } from 'react'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ALL_TRADE_FILES,
  originalTradeDataStore,
  selectedTradeFileStore,
  setSelectedTradeFile,
} from '@/lib/stats'

export function FileFilter() {
  const originalTradeData = useStore(originalTradeDataStore)
  const file = useStore(selectedTradeFileStore)
  const allFiles = [
    ALL_TRADE_FILES,
    ...new Set(originalTradeData?.map((t) => t.filename)),
  ]

  useEffect(() => {
    if (!allFiles.includes(file)) {
      setSelectedTradeFile(ALL_TRADE_FILES)
    }
  }, [allFiles, file])

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">File Filter</Label>
      <Select
        value={file}
        onValueChange={(value) => {
          if (value == null) return
          setSelectedTradeFile(value)
        }}
      >
        <SelectTrigger className="min-w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allFiles.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default FileFilter
