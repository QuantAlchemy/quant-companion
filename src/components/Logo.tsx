import { type Component } from 'solid-js'
import { Image, ImageFallback, ImageRoot } from '@/components/ui/image'
import Icon from '@/assets/iconWhite.svg'

const link =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5173'
    : 'https://www.quant-companion.quantalchemy.io/'

export const Logo: Component = () => {
  return (
    <a
      class="flex items-center gap-3"
      href={link}
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
