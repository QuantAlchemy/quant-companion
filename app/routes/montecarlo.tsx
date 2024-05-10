import { useLoaderData } from '@remix-run/react'
// import { MonteCarloPlot } from '~/components/MonteCarloPlot'
import { MonteCarloPlot } from '~/components/MonteCarloPlot.client'

export function clientLoader() {
  return { message: 'loader' }
}

export default function MonteCarlo() {
  const loader = useLoaderData<typeof clientLoader>()

  return (
    <section>
      <header>
        <h1>Monte Carlo</h1>
      </header>
      <p>{loader.message}</p>
      <MonteCarloPlot />
    </section>
  )
}
