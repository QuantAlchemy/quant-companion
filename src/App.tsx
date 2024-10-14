import { Component } from 'solid-js'
import { ColorModeProvider, ColorModeScript } from '@kobalte/core'
// import { ThemeToggle } from '@/components/ThemeToggle'
import SplashScreen from '@/components/splashScreen/SplashScreen'
// import Chart from '@/components/charts/DemoChart'
import Dashboard from '@/components/dashboard/Dashboard'

const Popup: Component = () => {
  return (
    <>
      <ColorModeScript />
      <ColorModeProvider>
        <SplashScreen />
        {/* <header class="flex justify-end">
          <ThemeToggle />
        </header> */}
        <main class="container">
          {/* <Chart /> */}
          <Dashboard />
        </main>
      </ColorModeProvider>
    </>
  )
}

export default Popup
