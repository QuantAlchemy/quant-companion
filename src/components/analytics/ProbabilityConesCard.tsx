import { useState } from 'react'

import ProbabilityConesChart, {
  ConeType,
} from '@/components/analytics/charts/ProbabilityCones'
import NumberField from '@/components/NumberField'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { TradeMetrics } from '@/lib/stats'

interface CardProps {
  data: TradeMetrics | null
}

const CONE_TYPE_LABELS: Record<string, string> = {
  [String(ConeType.Exponential)]: 'Exponential',
  [String(ConeType.Linear)]: 'Linear',
}

export function ProbabilityConesCard({ data }: CardProps) {
  const [stdDevA, setStdDevA] = useState(1)
  const [stdDevB, setStdDevB] = useState(2)
  const [coneSize, setConeSize] = useState(100)
  const [coneType, setConeType] = useState(ConeType.Exponential)
  const [coneStartPercentage, setConeStartPercentage] = useState(90)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Probability Cones</CardTitle>
        <div className="flex flex-row flex-wrap justify-end gap-2 pt-2">
          <NumberField label="Std Dev A" min={1} value={stdDevA} onValueChange={setStdDevA} />
          <NumberField label="Std Dev B" min={1} value={stdDevB} onValueChange={setStdDevB} />
          <NumberField label="Cone Size" min={1} value={coneSize} onValueChange={setConeSize} />
          <NumberField
            label="Cone Start %"
            min={2}
            max={100}
            value={coneStartPercentage}
            onValueChange={setConeStartPercentage}
          />
          <div className="flex w-32 flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Cone Type</Label>
            <Select
              value={String(coneType)}
              onValueChange={(value) => setConeType(Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[ConeType.Exponential, ConeType.Linear].map((type) => (
                  <SelectItem key={type} value={String(type)}>
                    {CONE_TYPE_LABELS[String(type)]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ProbabilityConesChart
          data={data}
          coneLength={coneSize}
          coneType={coneType}
          coneStartPercentage={coneStartPercentage}
          stdDevA={stdDevA}
          stdDevB={stdDevB}
        />
      </CardContent>
    </Card>
  )
}

export default ProbabilityConesCard
