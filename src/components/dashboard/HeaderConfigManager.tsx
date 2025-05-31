import { createSignal, For, Show, type Component, createEffect } from 'solid-js'
import { Button } from '@/components/ui/button'
import { TextFieldRoot, TextField, TextFieldLabel } from '@/components/ui/textfield'
import {
  type HeaderConfig,
  saveConfig,
  deleteConfig,
  defaultHeaderConfig,
  currentHeaderConfig,
} from '@/config/headerMappings'
import { FileFormatSelect } from '@/components/dashboard/HeaderConfigSelect'

type Props = {
  class?: string
}

export const HeaderConfigManager: Component<Props> = (props) => {
  const [isEditing, setIsEditing] = createSignal(false)
  const [editingConfig, setEditingConfig] = createSignal<HeaderConfig | null>(null)
  const [newConfigName, setNewConfigName] = createSignal('')
  let configNameInput: HTMLInputElement | undefined

  const handleSaveConfig = () => {
    if (!editingConfig()) return

    const config = editingConfig()!
    if (newConfigName()) {
      config.name = newConfigName()
    }

    saveConfig(config)
    setIsEditing(false)
    setEditingConfig(null)
    setNewConfigName('')
  }

  const handleDeleteConfig = (configName: string) => {
    // Don't allow deleting the default config
    if (configName === defaultHeaderConfig.name) return

    deleteConfig(configName)
  }

  const handleEditConfig = (config: HeaderConfig) => {
    // Don't allow editing the default config
    if (config.name === defaultHeaderConfig.name) return

    setEditingConfig({ ...config })
    setIsEditing(true)
  }

  createEffect(() => {
    if (isEditing() && configNameInput) {
      configNameInput.focus()
    }
  })

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isEditing()) {
      setIsEditing(false)
      setEditingConfig(null)
      setNewConfigName('')
    }
  }

  return (
    <div
      class={`${props.class} space-y-4`}
      onKeyDown={handleKeyDown}
    >
      <FileFormatSelect />
      <div class="flex justify-end space-x-2">
        <Button
          variant="ghost"
          onClick={() => {
            const newConfig = {
              name: 'New Config',
              mappings: defaultHeaderConfig.mappings.map((m) => ({ ...m })),
            }
            setEditingConfig(newConfig)
            setIsEditing(true)
          }}
        >
          New Config
        </Button>
        <Button
          variant="ghost"
          onClick={() => handleEditConfig(currentHeaderConfig())}
          disabled={currentHeaderConfig().name === defaultHeaderConfig.name}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          onClick={() => handleDeleteConfig(currentHeaderConfig().name)}
          disabled={currentHeaderConfig().name === defaultHeaderConfig.name}
        >
          Delete
        </Button>
      </div>

      <Show when={isEditing()}>
        <form
          class="space-y-4 p-4 border rounded-md"
          onSubmit={(e) => {
            e.preventDefault()
            handleSaveConfig()
          }}
        >
          <TextFieldRoot>
            <TextField
              ref={configNameInput}
              value={newConfigName() || editingConfig()?.name || ''}
              onChange={(e: Event & { target: HTMLInputElement }) =>
                setNewConfigName(e.target.value)
              }
              placeholder="Configuration Name"
            />
          </TextFieldRoot>

          <div class="space-y-2">
            <For each={editingConfig()?.mappings}>
              {(mapping, index) => (
                <div class="flex items-center space-x-4">
                  <TextFieldRoot class="w-full">
                    {index() === 0 ? (
                      <TextFieldLabel for={`source-header-${mapping.targetHeader}`}>
                        Source Header
                      </TextFieldLabel>
                    ) : null}
                    <TextField
                      id={`source-header-${mapping.targetHeader}`}
                      value={mapping.sourceHeader}
                      onChange={(e: Event & { target: HTMLInputElement }) => {
                        const newMappings = editingConfig()!.mappings.map((m) =>
                          m === mapping ? { ...m, sourceHeader: e.target.value } : m
                        )
                        setEditingConfig({ ...editingConfig()!, mappings: newMappings })
                      }}
                      placeholder="Source Header Pattern"
                    />
                  </TextFieldRoot>
                  <TextFieldRoot class="w-full">
                    {index() === 0 ? (
                      <TextFieldLabel for={`target-header-${mapping.targetHeader}`}>
                        Target Header
                      </TextFieldLabel>
                    ) : null}
                    <TextField
                      id={`target-header-${mapping.targetHeader}`}
                      value={mapping.targetHeader}
                      disabled
                      placeholder="Target Header (Fixed)"
                    />
                  </TextFieldRoot>
                </div>
              )}
            </For>
          </div>

          <div class="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditing(false)
                setEditingConfig(null)
                setNewConfigName('')
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Show>
    </div>
  )
}
