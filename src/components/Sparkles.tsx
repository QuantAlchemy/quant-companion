import { createSignal, Show } from 'solid-js'
import { Motion } from 'solid-motionone'
import Particles, { initParticlesEngine } from '@tsparticles/solid'
import { loadSlim } from '@tsparticles/slim'
import { cn } from '@/libs/utils'

import { sparkleOptions } from './sparkleOptions'

import type { Container } from '@tsparticles/engine'

export type ParticlesProps = {
  id?: string
  class?: string
  background?: string
  particleSize?: number
  minSize?: number
  maxSize?: number
  speed?: number
  particleColor?: string
  particleDensity?: number
}

export function Sparkles(props: ParticlesProps) {
  const [opacity, setOpacity] = createSignal(0)

  const init = initParticlesEngine(loadSlim)

  const particlesLoaded = async (container?: Container) => {
    if (container) {
      setOpacity(1)
    }
  }

  const generatedId = crypto.randomUUID()

  return (
    <div class="particles">
      <Motion.div
        animate={{ opacity: opacity() }}
        transition={{ duration: 2 }}
        class={cn('opacity-0', props.class)}
      >
        <Show when={init()}>
          <Particles
            id={props.id || generatedId}
            class={cn('h-full w-full')}
            particlesLoaded={particlesLoaded}
            options={sparkleOptions(props)}
          />
        </Show>
      </Motion.div>
    </div>
  )
}
