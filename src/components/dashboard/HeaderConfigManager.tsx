import { createSignal, For, Show, onMount } from 'solid-js'
import { Button } from '@/components/ui/button'
import { TextFieldRoot, TextField } from '@/components/ui/textfield'
import {
  type HeaderConfig,
  getSavedConfigs,
  saveConfig,
  deleteConfig,
  defaultHeaderConfig,
} from '@/config/headerMappings'

interface Props {
  onConfigSelect: (config: HeaderConfig) => void
  selectedConfig: HeaderConfig
}

export const HeaderConfigManager = (props: Props) => {
  const [configs, setConfigs] = createSignal<HeaderConfig[]>([])
  const [isEditing, setIsEditing] = createSignal(false)
  const [editingConfig, setEditingConfig] = createSignal<HeaderConfig | null>(null)
  const [newConfigName, setNewConfigName] = createSignal('')

  // Initialize configs on mount
  onMount(() => {
    const savedConfigs = getSavedConfigs()
    // Ensure default config is always first
    const defaultConfigExists = savedConfigs.some((c) => c.name === defaultHeaderConfig.name)
    const configsToUse = defaultConfigExists ? savedConfigs : [defaultHeaderConfig, ...savedConfigs]
    setConfigs(configsToUse)
  })

  const handleSaveConfig = () => {
    if (!editingConfig()) return

    const config = editingConfig()!
    if (newConfigName()) {
      config.name = newConfigName()
    }

    saveConfig(config)
    const updatedConfigs = getSavedConfigs()
    // Ensure default config is always first
    const defaultConfigExists = updatedConfigs.some((c) => c.name === defaultHeaderConfig.name)
    const configsToUse = defaultConfigExists
      ? updatedConfigs
      : [defaultHeaderConfig, ...updatedConfigs]
    setConfigs(configsToUse)
    setIsEditing(false)
    setEditingConfig(null)
    setNewConfigName('')
  }

  const handleDeleteConfig = (configName: string) => {
    // Don't allow deleting the default config
    if (configName === defaultHeaderConfig.name) return

    deleteConfig(configName)
    const updatedConfigs = getSavedConfigs()
    // Ensure default config is always first
    const defaultConfigExists = updatedConfigs.some((c) => c.name === defaultHeaderConfig.name)
    const configsToUse = defaultConfigExists
      ? updatedConfigs
      : [defaultHeaderConfig, ...updatedConfigs]
    setConfigs(configsToUse)

    if (props.selectedConfig.name === configName) {
      props.onConfigSelect(defaultHeaderConfig)
    }
  }

  const handleEditConfig = (config: HeaderConfig) => {
    // Don't allow editing the default config
    if (config.name === defaultHeaderConfig.name) return

    setEditingConfig({ ...config })
    setIsEditing(true)
  }

  return (
    <div class="space-y-4">
      <div class="flex items-center space-x-4">
        <select
          class="px-3 py-2 border rounded-md"
          onChange={(e: Event & { target: HTMLSelectElement }) => {
            const config = configs().find((c) => c.name === e.target.value)
            if (config) props.onConfigSelect(config)
          }}
          value={props.selectedConfig.name}
        >
          <For each={configs()}>
            {(config) => <option value={config.name}>{config.name}</option>}
          </For>
        </select>
        <Button
          variant="ghost"
          onClick={() => handleEditConfig(props.selectedConfig)}
          disabled={props.selectedConfig.name === defaultHeaderConfig.name}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          onClick={() => handleDeleteConfig(props.selectedConfig.name)}
          disabled={props.selectedConfig.name === defaultHeaderConfig.name}
        >
          Delete
        </Button>
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
          New
        </Button>
      </div>

      <Show when={isEditing()}>
        <div class="space-y-4 p-4 border rounded-md">
          <TextFieldRoot>
            <TextField
              value={newConfigName() || editingConfig()?.name || ''}
              onChange={(e: Event & { target: HTMLInputElement }) =>
                setNewConfigName(e.target.value)
              }
              placeholder="Configuration Name"
            />
          </TextFieldRoot>

          <div class="space-y-2">
            <For each={editingConfig()?.mappings}>
              {(mapping) => (
                <div class="flex items-center space-x-4">
                  <TextFieldRoot>
                    <TextField
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
                  <TextFieldRoot>
                    <TextField
                      value={mapping.targetHeader}
                      disabled
                      class="bg-gray-50 text-gray-700 cursor-not-allowed"
                      placeholder="Target Header (Fixed)"
                    />
                  </TextFieldRoot>
                  <select
                    class="px-3 py-2 border rounded-md"
                    value={mapping.type}
                    onChange={(e: Event & { target: HTMLSelectElement }) => {
                      const newMappings = editingConfig()!.mappings.map((m) =>
                        m === mapping ? { ...m, type: e.target.value as 'number' | 'string' } : m
                      )
                      setEditingConfig({ ...editingConfig()!, mappings: newMappings })
                    }}
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                  </select>
                </div>
              )}
            </For>
          </div>

          <div class="flex justify-end space-x-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false)
                setEditingConfig(null)
                setNewConfigName('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveConfig}>Save</Button>
          </div>
        </div>
      </Show>
    </div>
  )
}
