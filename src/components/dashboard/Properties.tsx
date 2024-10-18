import { createEffect, createSignal } from 'solid-js'
import { Button } from '@/components/ui/button'
import { TextField, TextFieldLabel, TextFieldRoot } from '@/components/ui/textfield'
import { NumberInput } from '@/components/ui/NumberInput'
import { FileUpload } from '@/components/ui/FileUpload'
import {
  originalTradeData,
  processTradeMetrics,
  simulateTradeData,
  setOriginalTradeData,
  setStartingEquity,
  setTradeData,
  setTradeMetrics,
  startingEquity,
  tradeData,
} from '@/libs/stats'

import type { Component } from 'solid-js'

export const Properties: Component = () => {
  const [topTradesCnt, setTopTradesCnt] = createSignal(0)
  const [bottomTradesCnt, setBottomTradesCnt] = createSignal(0)

  createEffect(() => {
    const data = tradeData()

    if (data) {
      const processedData = processTradeMetrics(data, startingEquity())
      setTradeMetrics(() => processedData)
    }
  })

  const removeTopTrades = () => {
    const data = originalTradeData()
    if (data) {
      const sortedData = data
        .slice()
        .sort((a, b) => b.exitProfit - a.exitProfit)
        .slice(topTradesCnt())
      setTradeData(() => sortedData)
    }
  }

  const removeBottomTrades = () => {
    const data = originalTradeData()
    if (data) {
      const sortedData = data
        .slice()
        .sort((a, b) => a.exitProfit - b.exitProfit)
        .slice(bottomTradesCnt())
      setTradeData(() => sortedData)
    }
  }

  return (
    <>
      <TextFieldRoot>
        <TextFieldLabel
          for="startingEquity"
          class="mt-4"
        >
          Starting Equity
        </TextFieldLabel>
        <TextField
          id="startingEquity"
          type="number"
          value={startingEquity()}
          onInput={(e) => setStartingEquity(Number((e.target as HTMLInputElement).value))}
          class="mt-2"
        />
      </TextFieldRoot>
      <NumberInput
        class="w-auto"
        id="removeTopTrades"
        label="Remove Best Trades"
        min={0}
        value={topTradesCnt()}
        onInput={(e) => {
          setTopTradesCnt(Number((e.target as HTMLInputElement).value))
          removeTopTrades()
        }}
      />
      <NumberInput
        class="w-auto"
        id="removeBottomTrades"
        label="Remove Worst Trades"
        min={0}
        value={bottomTradesCnt()}
        onInput={(e) => {
          setBottomTradesCnt(Number((e.target as HTMLInputElement).value))
          removeBottomTrades()
        }}
      />
      <div class="flex flex-wrap gap-2 justify-between">
        <FileUpload />
        <Button
          class="mt-4"
          variant="default"
          onClick={() => {}}
        >
          Read Page Data
        </Button>
      </div>

      {import.meta.env.VITE_USER_NODE_ENV === 'development' ? (
        <Button
          class="mt-4"
          variant="secondary"
          onClick={() => {
            const data = simulateTradeData()
            const processedData = processTradeMetrics(data, startingEquity())
            setTradeMetrics(() => processedData)
            setOriginalTradeData(() => data)
          }}
        >
          Simulate Data
        </Button>
      ) : null}
    </>
  )
}

export default Properties
