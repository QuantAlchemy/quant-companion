import { Sparkles } from '../ui/Sparkles'
import icon from '@/assets/iconWhite.svg'

export function SparklesPreview() {
  return (
    <div class="h-dvh w-full bg-black flex flex-col items-center justify-center overflow-hidden rounded-md">
      {/* <div class="h-dvh w-full bg-brand-primaryBackground flex flex-col items-center justify-center overflow-hidden rounded-md"> */}
      {/* <h1 class="md:text-7xl text-3xl lg:text-9xl font-bold text-center text-white relative z-20">
        Quant Alchemy
      </h1> */}

      <img
        src={icon}
        class="h-3/12 w-3/12"
        alt="Quant Alchemy logo"
      />
      <div class="w-[40rem] h-40 relative">
        {/* Gradients */}
        {/* <div class="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-[2px] w-3/4 blur-sm" />
        <div class="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-px w-3/4" />
        <div class="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 blur-sm" />
        <div class="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px w-1/4" /> */}

        {/* <div class="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-brand-secondary to-transparent h-[2px] w-3/4 blur-sm" />
        <div class="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-brand-secondary to-transparent h-px w-3/4" />
        <div class="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-brand-primary to-transparent h-[5px] w-1/4 blur-sm" />
        <div class="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-brand-primary to-transparent h-px w-1/4" /> */}

        <div class="absolute inset-x-10 top-0 bg-gradient-to-r from-transparent via-brand-secondary to-transparent h-[2px] w-10/12 blur-sm" />
        <div class="absolute inset-x-10 top-0 bg-gradient-to-r from-transparent via-brand-secondary to-transparent h-px w-10/12" />
        <div class="absolute inset-x-40 top-0 bg-gradient-to-r from-transparent via-brand-primary to-transparent h-[5px] w-1/2 blur-sm" />
        <div class="absolute inset-x-40 top-0 bg-gradient-to-r from-transparent via-brand-primary to-transparent h-px w-1/2" />

        {/* Core component */}
        <Sparkles
          background="transparent"
          minSize={0.4}
          maxSize={1}
          particleDensity={1200}
          class="w-full h-full"
          // particleColor="#FFFFFF"
          // particleColor='#5AA3F2'
          // particleColor='#552EF0'
          particleColor="#B48CFF"
          // particleColor='#5279FF'
        />

        {/* Radial Gradient to prevent sharp edges */}
        <div class="absolute inset-0 w-full h-full bg-black [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]" />
        {/* <div class="absolute inset-0 w-full h-full bg-brand-primaryBackground [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]" /> */}
      </div>
    </div>
  )
}
