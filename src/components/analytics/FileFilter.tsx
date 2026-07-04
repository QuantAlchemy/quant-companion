import { useStore } from '@tanstack/react-store'
import { useState } from 'react'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { originalTradeDataStore, tradeDataStore } from '@/lib/stats'

const ALL_FILES = 'All Files'

export function FileFilter() {
  const originalTradeData = useStore(originalTradeDataStore)
  const allFiles = [ALL_FILES, ...new Set(originalTradeData?.map((t) => t.filename))]
  const [file, setFile] = useState(ALL_FILES)

  const filterData = (selected: string) => {
    if (selected === ALL_FILES) {
      tradeDataStore.setState(() => originalTradeData)
    } else {
      const filteredFiles = originalTradeData?.filter((t) => t.filename === selected)
      tradeDataStore.setState(() => filteredFiles ?? null)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">File Filter</Label>
      <Select
        value={file}
        onValueChange={(value) => {
          setFile(value)
          filterData(value)
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
