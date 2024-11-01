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
  value?: number | (() => number)
  onInput?: (value: number) => void
}

export const NumberInput: Component<NumberInputProps> = (props) => {
  const value = () => {
    const val = typeof props.value === 'function' ? props.value() : props.value
    return val?.toString()
  }

  const clampValue = (value: number): number => {
    let clampedValue = value
    if (props.min !== undefined) {
      clampedValue = Math.max(props.min, clampedValue)
    }
    if (props.max !== undefined) {
      clampedValue = Math.min(props.max, clampedValue)
    }
    return clampedValue
  }

  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    const val = Number(target.value)
    const clamped = clampValue(val)
    props.onInput?.(clamped) // Update external signal
  }

  return (
    <TextFieldRoot class={props.class ?? 'w-24'}>
      <TextFieldLabel for={props.id}>{props.label}</TextFieldLabel>
      <TextField
        id={props.id}
        type="number"
        min={props.min}
        max={props.max}
        value={value()}
        onInput={handleInput}
      />
      <TextFieldDescription>{props.info}</TextFieldDescription>
    </TextFieldRoot>
  )
}

export default NumberInput
