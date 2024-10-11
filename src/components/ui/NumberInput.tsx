import { TextField, TextFieldLabel, TextFieldRoot } from '@/components/ui/textfield'

import type { Component } from 'solid-js'

interface NumberInputProps {
  id: string
  label: string
  min?: number
  max?: number
  value?: number
  onInput?: (e: Event) => void
}

export const NumberInput: Component<NumberInputProps> = (props) => {
  return (
    <TextFieldRoot
      class="w-24"
      defaultValue={props.value as unknown as string}
    >
      <TextFieldLabel for={props.id}>{props.label}</TextFieldLabel>
      <TextField
        id={props.id}
        type="number"
        min={props.min}
        max={props.max}
        value={props?.value}
        onInput={(e) => props?.onInput?.(e)}
      />
    </TextFieldRoot>
  )
}

export default NumberInput
