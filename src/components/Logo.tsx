import { Image, ImageFallback, ImageRoot } from '@/components/ui/image'
import Icon from '@/assets/iconWhite.svg'

import type { Component } from 'solid-js'

export const Logo: Component = () => {
  return (
    <a
      class="flex items-center gap-3"
      href="https://www.quantalchemy.io/"
      target="_blank"
    >
      <ImageRoot>
        <Image
          src={Icon}
          alt="Quant Companion"
        />
        <ImageFallback>QC</ImageFallback>
      </ImageRoot>
      <h1 class="font-normal text-2xl">Quant Companion</h1>
    </a>
  )
}

export default Logo
