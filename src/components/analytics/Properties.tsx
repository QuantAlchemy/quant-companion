import { useStore } from '@tanstack/react-store'
import { useEffect, useState } from 'react'
import { FlaskConical } from 'lucide-react'

import FileFilter from '@/components/analytics/FileFilter'
import FileUpload from '@/components/analytics/FileUpload'
import HeaderConfigManager from '@/components/analytics/HeaderConfigManager'
import NumberField from '@/components/NumberField'
import { Button } from '@/components/ui/button'
import { isLocalhostHostname } from '@/lib/environment'
import { initSavedConfigs } from '@/lib/headerMappings'
import {
  originalTradeDataStore,
  processTradeMetrics,
  simulateTradeData,
  startingEquityStore,
  tradeDataStore,
  tradeMetricsStore,
} from '@/lib/stats'

export function Properties() {
  const startingEquity = useStore(startingEquityStore)
  const tradeData = useStore(tradeDataStore)
  const [topTradesCnt, setTopTradesCnt] = useState(0)
  const [bottomTradesCnt, setBottomTradesCnt] = useState(0)
  const [isLocalhost, setIsLocalhost] = useState(false)

  // hydrate saved header configs from localStorage once on the client
  useEffect(() => {
    initSavedConfigs()
    setIsLocalhost(isLocalhostHostname(window.location.hostname))
  }, [])

  // recompute derived metrics whenever the working data set or equity changes
  useEffect(() => {
    if (tradeData) {
      const processedData = processTradeMetrics(tradeData, startingEquity)
      tradeMetricsStore.setState(() => processedData)
    } else {
      tradeMetricsStore.setState(() => null)
    }
  }, [tradeData, startingEquity])

  const removeTopAndBottomTrades = (topCount: number, bottomCount: number) => {
    const data = originalTradeDataStore.state
    if (!data) return

    const topTrades = [...data]
      .sort((a, b) => b.exitProfit - a.exitProfit)
      .slice(0, topCount)
    const bottomTrades = [...data]
      .sort((a, b) => a.exitProfit - b.exitProfit)
      .slice(0, bottomCount)

    const tradesToRemove = new Set([
      ...topTrades.map((trade) => trade.tradeNo),
      ...bottomTrades.map((trade) => trade.tradeNo),
    ])
    tradeDataStore.setState(
      () => data.filter((trade) => !tradesToRemove.has(trade.tradeNo))
    )
  }

  return (
    <div className="space-y-4">
      <NumberField
        className="w-auto"
        label="Starting Equity"
        value={startingEquity}
        onValueChange={(v) => startingEquityStore.setState(() => v)}
      />
      <NumberField
        className="w-auto"
        label="Remove Best Trades"
        min={0}
        value={topTradesCnt}
        onValueChange={(value) => {
          setTopTradesCnt(value)
          removeTopAndBottomTrades(value, bottomTradesCnt)
        }}
      />
      <NumberField
        className="w-auto"
        label="Remove Worst Trades"
        min={0}
        value={bottomTradesCnt}
        onValueChange={(value) => {
          setBottomTradesCnt(value)
          removeTopAndBottomTrades(topTradesCnt, value)
        }}
      />
      <FileFilter />

      <div className="flex flex-wrap justify-between gap-2">
        <FileUpload />
        {isLocalhost && (
          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => {
              const data = simulateTradeData()
              originalTradeDataStore.setState(() => data)
              tradeDataStore.setState(() => data)
            }}
          >
            <FlaskConical className="mr-1.5 h-4 w-4" />
            Demo Data
          </Button>
        )}
      </div>
      <HeaderConfigManager className="mt-2" />
    </div>
  )
}

export default Properties
