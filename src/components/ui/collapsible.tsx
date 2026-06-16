import { cn } from '@/libs/utils'
import type { PolymorphicProps } from '@kobalte/core/polymorphic'
import type { CollapsibleContentProps, CollapsibleRootProps } from '@kobalte/core/collapsible'
import { Collapsible as CollapsiblePrimitive } from '@kobalte/core/collapsible'
import type { ValidComponent } from 'solid-js'
import { splitProps } from 'solid-js'

export const Collapsible = (props: CollapsibleRootProps) => {
  const [local, rest] = splitProps(props, ['class'])

  return (
    <CollapsiblePrimitive
      class={cn('group/collapsible', local.class)}
      {...rest}
    />
  )
}

export const CollapsibleTrigger = CollapsiblePrimitive.Trigger

type collapsibleContentProps<T extends ValidComponent = 'div'> = CollapsibleContentProps<T> & {
  class?: string
}

export const CollapsibleContent = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, collapsibleContentProps<T>>
) => {
  const [local, rest] = splitProps(props as collapsibleContentProps, ['class'])

  return (
    <CollapsiblePrimitive.Content
      class={cn(
        'overflow-hidden data-[closed]:animate-collapsible-up data-[expanded]:animate-collapsible-down',
        local.class
      )}
      {...rest}
    />
  )
}
