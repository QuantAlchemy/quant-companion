import { Component, ErrorBoundary } from 'solid-js'
import { ColorModeProvider, ColorModeScript } from '@kobalte/core'
import ErrorFallback from '@/components/ErrorFallback'
// import { ThemeToggle } from '@/components/ThemeToggle'
import SplashScreen from '@/components/splashScreen/SplashScreen'
// import Chart from '@/components/charts/DemoChart'
import Dashboard from '@/components/dashboard/Dashboard'

const Popup: Component = () => {
  return (
    <>
      <ErrorBoundary
        fallback={(err) => {
          console.log('fallback', err)
          return <ErrorFallback error={err} />
        }}
      >
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
      </ErrorBoundary>
    </>
  )
}

export default Popup
