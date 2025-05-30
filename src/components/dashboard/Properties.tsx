import { createEffect, createSignal, type Component } from 'solid-js'
import { Button } from '@/components/ui/button'
import { NumberInput } from '@/components/ui/NumberInput'
import { FileUpload } from '@/components/dashboard/FileUpload'
import { FileFilter } from '@/components/dashboard/FileFilter'
import { HeaderConfigManager } from '@/components/dashboard/HeaderConfigManager'
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

  const removeTopTrades = (data = originalTradeData()) => {
    if (data) {
      // Find the top k trades to remove
      const topTradesCount = topTradesCnt()
      const topTrades = [...data]
        .sort((a, b) => b.exitProfit - a.exitProfit) // Sort in descending order to find the highest exitProfit trades
        .slice(0, topTradesCount)

      const tradesToRemove = new Set(topTrades.map((trade) => trade.tradeNo))
      const filteredData = data.filter((trade) => !tradesToRemove.has(trade.tradeNo))
      return filteredData
    }
  }

  const removeBottomTrades = (data = originalTradeData()) => {
    if (data) {
      // Find the bottom k trades to remove
      const bottomTradesCount = bottomTradesCnt()
      const bottomTrades = [...data]
        .sort((a, b) => a.exitProfit - b.exitProfit) // Sort in ascending order to find the lowest exitProfit trades
        .slice(0, bottomTradesCount)

      const tradesToRemove = new Set(bottomTrades.map((trade) => trade.tradeNo))
      const filteredData = data.filter((trade) => !tradesToRemove.has(trade.tradeNo))
      return filteredData
    }
  }

  const removeTopAndBottomTrades = () => {
    const data = originalTradeData()
    const filteredData = removeBottomTrades(removeTopTrades(data))
    setTradeData(() => filteredData ?? null)
  }

  return (
    <>
      <NumberInput
        class="w-auto"
        id="startingEquity"
        label="Starting Equity"
        value={startingEquity}
        onInput={setStartingEquity}
      />
      <NumberInput
        class="w-auto"
        id="removeTopTrades"
        label="Remove Best Trades"
        min={0}
        value={topTradesCnt}
        onInput={(value) => {
          setTopTradesCnt(value)
          removeTopAndBottomTrades()
        }}
      />
      <NumberInput
        class="w-auto"
        id="removeBottomTrades"
        label="Remove Worst Trades"
        min={0}
        value={bottomTradesCnt}
        onInput={(value) => {
          setBottomTradesCnt(value)
          removeTopAndBottomTrades()
        }}
      />
      <FileFilter />

      <div class="flex flex-wrap gap-2 justify-between">
        <FileUpload />
        {import.meta.env.VITE_USER_EXTENSION === 'true' ? (
          <Button
            class="mt-4"
            variant="default"
            onClick={() => {}}
          >
            Read Page Data
          </Button>
        ) : null}
      </div>
      <HeaderConfigManager class="mt-2" />

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
