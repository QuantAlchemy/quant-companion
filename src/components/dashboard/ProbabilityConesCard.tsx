import { createSignal } from 'solid-js'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TextFieldLabel, TextFieldRoot } from '@/components/ui/textfield'
import { NumberInput } from '@/components/ui/NumberInput'
import ProbabilityConesChart, { ConeType } from '@/components/charts/ProbabilityCones'

import type { Component } from 'solid-js'
import type { TradeMetrics } from '@/libs/stats'

interface CardProps {
  data: TradeMetrics | null
}

interface ConeTypeSelectProps {
  value?: ConeType
  onChange?: (value: ConeType) => void
}

const ConeTypeSelect: Component<ConeTypeSelectProps> = (props) => {
  const getConeType = (coneType: ConeType) => {
    switch (coneType) {
      case ConeType.Linear:
        return 'Linear'
      case ConeType.Exponential:
        return 'Exponential'
      default:
        return 'Exponential'
    }
  }

  return (
    <TextFieldRoot class="w-32">
      <TextFieldLabel for="coneType">Cone Type</TextFieldLabel>
      <Select
        defaultValue={props.value ?? ConeType.Exponential}
        value={props.value}
        onChange={(value) => props?.onChange?.(value as ConeType)}
        options={[ConeType.Exponential, ConeType.Linear]}
        itemComponent={(props) => (
          <SelectItem item={props.item}>{getConeType(props.item.rawValue)}</SelectItem>
        )}
      >
        <SelectTrigger>
          <SelectValue<string>>
            {(state) => getConeType(state.selectedOption() as unknown as ConeType)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
    </TextFieldRoot>
  )
}

export const ProbabilityConesCard: Component<CardProps> = (props) => {
  const [stdDevA, setStdDevA] = createSignal(1)
  const [stdDevB, setStdDevB] = createSignal(2)
  const [coneSize, setConeSize] = createSignal(100)
  const [coneType, setConeType] = createSignal(ConeType.Exponential)
  const [coneStartPercentage, setConeStartPercentage] = createSignal(90)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Probability Cones</CardTitle>
        <div class="flex flex-row justify-end gap-2">
          <NumberInput
            id="stdDevA"
            label="Std Dev A"
            min={1}
            value={stdDevA()}
            onInput={(e) => setStdDevA(Number((e.target as HTMLInputElement).value))}
          />
          <NumberInput
            id="stdDevB"
            label="Std Dev B"
            min={1}
            value={stdDevB()}
            onInput={(e) => setStdDevB(Number((e.target as HTMLInputElement).value))}
          />
          <NumberInput
            id="coneSize"
            label="Cone Size"
            min={1}
            value={coneSize()}
            onInput={(e) => setConeSize(Number((e.target as HTMLInputElement).value))}
          />
          <NumberInput
            id="coneStartPercentage"
            label="Cone Start %"
            min={2}
            max={100}
            value={coneStartPercentage()}
            onInput={(e) => setConeStartPercentage(Number((e.target as HTMLInputElement).value))}
          />
          <ConeTypeSelect
            value={coneType()}
            onChange={(value) => setConeType(value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <ProbabilityConesChart
          data={props.data}
          coneLength={coneSize()}
          coneType={coneType()}
          coneStartPercentage={coneStartPercentage()}
          stdDevA={stdDevA()}
          stdDevB={stdDevB()}
        />
      </CardContent>
    </Card>
  )
}

export default ProbabilityConesCard
