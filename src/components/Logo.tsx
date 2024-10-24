import { Image, ImageFallback, ImageRoot } from '@/components/ui/image'
import Icon from '@/assets/iconWhite.svg'

import type { Component } from 'solid-js'

export const Logo: Component = () => {
  return (
    <div class="flex items-center gap-3">
      <ImageRoot>
        <Image
          src={Icon}
          alt="Quant Companion"
        />
        <ImageFallback>HN</ImageFallback>
      </ImageRoot>
      <h1 class="font-normal text-2xl">Quant Companion</h1>
    </div>
  )
}

export default Logo
