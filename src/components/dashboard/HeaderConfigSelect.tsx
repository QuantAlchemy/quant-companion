import { type Component } from 'solid-js'
import { TextFieldLabel, TextFieldRoot } from '@/components/ui/textfield'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { currentHeaderConfig, savedConfigs, setCurrentHeaderConfig } from '@/config/headerMappings'

type Props = {
  class?: string
}

export const FileFormatSelect: Component<Props> = (props) => {
  const configNames = () => savedConfigs().map((c) => c.name)

  return (
    <TextFieldRoot class={props.class}>
      <TextFieldLabel for="data-format">Data Header Config</TextFieldLabel>
      <Select
        id="data-format"
        class="min-w-48"
        defaultValue={currentHeaderConfig()?.name}
        value={currentHeaderConfig()?.name}
        options={configNames()}
        onChange={(value) => {
          const config = savedConfigs().find((c) => c.name === value)
          if (config) {
            setCurrentHeaderConfig(config)
          }
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

export default FileFormatSelect
