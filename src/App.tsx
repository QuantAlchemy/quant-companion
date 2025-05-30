import { Component, ErrorBoundary } from 'solid-js'
import { ColorModeProvider, ColorModeScript } from '@kobalte/core'
import ErrorFallback from '@/components/ErrorFallback'
// import { ThemeToggle } from '@/components/ThemeToggle'
import SplashScreen from '@/components/splashScreen/SplashScreen'
import Logo from '@/components/Logo'
// import Chart from '@/components/charts/DemoChart'
import Dashboard from '@/components/dashboard/Dashboard'
import QuantAlchemyLink from '@/components/QuantAlchemyLink'
import KrownQuantAlchemyLink from './components/KrownQuantAlchemyLink'

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
          <header class="container mt-4 flex justify-between">
            <Logo />
            <div class="flex items-center gap-2">
              <KrownQuantAlchemyLink />
              <QuantAlchemyLink />
            </div>
            {/* <ThemeToggle /> */}
          </header>
          <main class="container py-4">
            {/* <Chart /> */}
            <Dashboard />
          </main>
        </ColorModeProvider>
      </ErrorBoundary>
    </>
  )
}

export default Popup
