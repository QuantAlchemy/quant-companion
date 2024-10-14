import {
  TextField,
  TextFieldLabel,
  TextFieldDescription,
  TextFieldRoot,
} from '@/components/ui/textfield'

import type { Component } from 'solid-js'
import type { JSX } from 'solid-js/jsx-runtime'

interface NumberInputProps {
  id: string
  label: JSX.Element
  info?: JSX.Element
  class?: string
  min?: number
  max?: number
  value?: number
  onInput?: (e: Event) => void
}

export const NumberInput: Component<NumberInputProps> = (props) => {
  return (
    <TextFieldRoot
      class={props.class ?? 'w-24'}
      defaultValue={props.value as unknown as string}
    >
      <TextFieldLabel for={props.id}>{props.label}</TextFieldLabel>
      <TextField
        id={props.id}
        type="number"
        min={props.min}
        max={props.max}
        value={props.value}
        onInput={(e) => props.onInput?.(e)}
      />
      <TextFieldDescription>{props.info}</TextFieldDescription>
    </TextFieldRoot>
  )
}

export default NumberInput
