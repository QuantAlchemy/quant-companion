import { useStore } from '@tanstack/react-store'
import { useEffect, useRef, useState } from 'react'

import FileFormatSelect from '@/components/analytics/HeaderConfigSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  builtInHeaderConfigs,
  currentHeaderConfigStore,
  deleteConfig,
  savedConfigsStore,
  saveConfig,
} from '@/lib/headerMappings'

import type { HeaderConfig } from '@/lib/headerMappings'

const isBuiltInConfig = (configName: string) =>
  builtInHeaderConfigs.some((config) => config.name === configName)

const nextConfigName = () => {
  const names = new Set(savedConfigsStore.state.map((config) => config.name))
  let index = 1
  let name = 'New Config'
  while (names.has(name)) {
    index += 1
    name = `New Config ${index}`
  }
  return name
}

export function HeaderConfigManager({ className }: { className?: string }) {
  const currentHeaderConfig = useStore(currentHeaderConfigStore)
  const [isEditing, setIsEditing] = useState(false)
  const [editingConfig, setEditingConfig] = useState<HeaderConfig | null>(null)
  const [newConfigName, setNewConfigName] = useState('')
  const [hasMounted, setHasMounted] = useState(false)
  const configNameInputRef = useRef<HTMLInputElement>(null)
  const currentConfigIsBuiltIn =
    !hasMounted || isBuiltInConfig(currentHeaderConfig.name)

  const createConfigFromCurrentSelection = (): HeaderConfig => ({
    name: nextConfigName(),
    mappings: currentHeaderConfigStore.state.mappings.map((m) => ({ ...m })),
  })

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (isEditing) configNameInputRef.current?.focus()
  }, [isEditing])

  const stopEditing = () => {
    setIsEditing(false)
    setEditingConfig(null)
    setNewConfigName('')
  }

  const handleSaveConfig = () => {
    if (!editingConfig) return
    const trimmedName = newConfigName.trim()
    if (!trimmedName) return
    const config = { ...editingConfig, name: trimmedName }
    saveConfig(config)
    stopEditing()
  }

  const handleEditConfig = (config: HeaderConfig) => {
    if (isBuiltInConfig(config.name)) return
    setEditingConfig({
      ...config,
      mappings: config.mappings.map((m) => ({ ...m })),
    })
    setNewConfigName(config.name)
    setIsEditing(true)
  }

  return (
    <div
      className={`${className ?? ''} space-y-4`}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && isEditing) stopEditing()
      }}
    >
      <FileFormatSelect />
      <div className="flex justify-end space-x-2">
        <Button
          variant="ghost"
          onClick={() => {
            const config = createConfigFromCurrentSelection()
            setEditingConfig(config)
            setNewConfigName(config.name)
            setIsEditing(true)
          }}
        >
          New Config
        </Button>
        <Button
          variant="ghost"
          onClick={() => handleEditConfig(currentHeaderConfig)}
          disabled={currentConfigIsBuiltIn}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            if (!currentConfigIsBuiltIn) {
              deleteConfig(currentHeaderConfig.name)
            }
          }}
          disabled={currentConfigIsBuiltIn}
        >
          Delete
        </Button>
      </div>

      {isEditing && editingConfig && (
        <form
          className="space-y-4 rounded-md border p-4"
          onSubmit={(e) => {
            e.preventDefault()
            handleSaveConfig()
          }}
        >
          <Input
            ref={configNameInputRef}
            value={newConfigName}
            onChange={(e) => setNewConfigName(e.target.value)}
            placeholder="Configuration Name"
          />

          <div className="space-y-2">
            {editingConfig.mappings.map((mapping, index) => (
              <div
                key={mapping.targetHeader}
                className="flex items-center space-x-4"
              >
                <div className="w-full space-y-1">
                  {index === 0 && (
                    <Label htmlFor={`source-header-${mapping.targetHeader}`}>
                      Source Header
                    </Label>
                  )}
                  <Input
                    id={`source-header-${mapping.targetHeader}`}
                    value={mapping.sourceHeader}
                    onChange={(e) => {
                      const newMappings = editingConfig.mappings.map((m) =>
                        m === mapping
                          ? { ...m, sourceHeader: e.target.value }
                          : m,
                      )
                      setEditingConfig({
                        ...editingConfig,
                        mappings: newMappings,
                      })
                    }}
                    placeholder="Source Header Pattern"
                  />
                </div>
                <div className="w-full space-y-1">
                  {index === 0 && (
                    <Label htmlFor={`target-header-${mapping.targetHeader}`}>
                      Target Header
                    </Label>
                  )}
                  <Input
                    id={`target-header-${mapping.targetHeader}`}
                    value={mapping.targetHeader}
                    disabled
                    placeholder="Target Header (Fixed)"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={stopEditing}>
              Cancel
            </Button>
            <Button type="submit" disabled={!newConfigName.trim()}>
              Save
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

export default HeaderConfigManager
