import { Sparkles } from '@/components/effects/Sparkles'
// import { getHSLColor } from '@/libs/theme'
import icon from '@/assets/iconWhite.svg'

// use a slightly light color for the particles
const particleColor = 'hsl(261, 100%, 87%)'

export function SparklesLogo() {
  return (
    // <div class="h-dvh w-full bg-black flex flex-col items-center justify-center overflow-hidden rounded-md">
    <div class="h-dvh w-full bg-background flex flex-col items-center justify-center overflow-hidden rounded-md">
      {/* <h1 class="md:text-7xl text-3xl lg:text-9xl font-bold text-center text-white relative z-20">
        Quant Companion
      </h1> */}

      <img
        src={icon}
        class="h-3/12 w-3/12"
        alt="Quant Companion logo"
      />
      <div class="w-[40rem] h-40 relative">
        {/* Gradients */}
        <div class="absolute inset-x-10 top-0 bg-gradient-to-r from-transparent via-secondary to-transparent h-[2px] w-10/12 blur-sm" />
        <div class="absolute inset-x-10 top-0 bg-gradient-to-r from-transparent via-secondary to-transparent h-px w-10/12" />
        <div class="absolute inset-x-40 top-0 bg-gradient-to-r from-transparent via-primary to-transparent h-[5px] w-1/2 blur-sm" />
        <div class="absolute inset-x-40 top-0 bg-gradient-to-r from-transparent via-primary to-transparent h-px w-1/2" />

        {/* Core component */}
        <Sparkles
          background="transparent"
          minSize={0.4}
          maxSize={1}
          particleDensity={1200}
          class="w-full h-full"
          // particleColor={getHSLColor('--secondary', { useCommaSeparatedHSL: true })}
          particleColor={particleColor}
        />

        {/* Radial Gradient to prevent sharp edges */}
        {/* <div class="absolute inset-0 w-full h-full bg-black [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]" /> */}
        <div class="absolute inset-0 w-full h-full bg-background [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]" />
      </div>
    </div>
  )
}

export default SparklesLogo
