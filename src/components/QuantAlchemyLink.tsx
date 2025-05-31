import { type Component } from 'solid-js'
import { Image, ImageFallback, ImageRoot } from '@/components/ui/image'
import Icon from '@/assets/qaIcon.svg'

export const QuantAlchemyLink: Component = () => {
  return (
    <a
      class="flex items-center gap-3"
      href="https://www.quantalchemy.io/"
      target="_blank"
      rel="noreferrer"
    >
      <ImageRoot class="items-center justify-center">
        <Image
          class="size-3/4 opacity-60"
          src={Icon}
          alt="Quant Alchemy"
        />
        <ImageFallback>QA</ImageFallback>
      </ImageRoot>
    </a>
  )
}

export default QuantAlchemyLink
