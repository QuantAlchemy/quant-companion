import { Component, createSignal } from 'solid-js'
import { ColorModeProvider, ColorModeScript } from '@kobalte/core'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import SplashScreen from '@/components/splashScreen/SplashScreen'
import Chart from '@/components/charts/DemoChart'
import Equity from '@/components/charts/Equity'

import { processData, simulateTradingViewData } from '@/libs/stats'

const trades = simulateTradingViewData()
const data = processData(trades)

const Popup: Component = () => {
  const [count, setCount] = createSignal(0)

  return (
    <>
      <ColorModeScript />
      <ColorModeProvider>
        <SplashScreen />
        <main class="container">
          <h1>SolidJS Web Extension</h1>
          <p>Count: {count()}</p>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setCount((c) => c + 1)}
          >
            Increment
          </button>
          <Button onClick={() => setCount((c) => c - 1)}>Decrement</Button>

          <p style={{ 'font-family': "'Inter Variable', sans-serif" }}>
            This should be in Inter Variable
          </p>
          <p style={{ 'font-family': "'IBM Plex Sans'" }}>This should be in IBM Plex</p>
          <Chart />
          <Equity data={data} />
        </main>
      </ColorModeProvider>
    </>
  )
}

export default Popup
