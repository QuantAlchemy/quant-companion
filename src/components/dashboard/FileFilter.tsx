import { createEffect, createSignal } from 'solid-js'
import { TextFieldLabel, TextFieldRoot } from '@/components/ui/textfield'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { setTradeData, originalTradeData } from '@/libs/stats'

import type { Component } from 'solid-js'

const ALL_FILES = 'All Files'

export const FileFilter: Component = () => {
  const allFiles = () => [ALL_FILES, ...new Set(originalTradeData()?.map((t) => t.filename))]
  const [files, setFiles] = createSignal(allFiles().at(0) ?? '')

  createEffect(() => {
    if (!files()) {
      setFiles(allFiles().at(0)!)
    }
  })

  const filterData = (file: string) => {
    if (file === ALL_FILES) {
      setTradeData(originalTradeData())
    } else {
      const filteredFiles = originalTradeData()?.filter((t) => t.filename === file)
      setTradeData(filteredFiles!)
    }
  }

  return (
    <TextFieldRoot>
      <TextFieldLabel for="file-filter">File Filter</TextFieldLabel>
      <Select
        id="file-filter"
        class="min-w-48"
        defaultValue={allFiles().at(0)}
        value={files()}
        options={allFiles()}
        onChange={(value) => {
          setFiles(value!)
          filterData(value!)
        }}
        itemComponent={(props) => <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>}
      >
        <SelectTrigger>
          <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
    </TextFieldRoot>
  )
}

export default FileFilter
