import { type Component } from 'solid-js'
import { Image, ImageFallback, ImageRoot } from '@/components/ui/image'
import Icon from '@/assets/kqaIcon.svg'

export const KrownQuantAlchemyLink: Component = () => {
  return (
    <a
      class="flex items-center gap-3"
      href="https://www.krown.quantalchemy.io/courses"
      target="_blank"
      rel="noreferrer"
    >
      <ImageRoot class="h-10 w-10 rounded-none items-center justify-center">
        <Image
          class="size-3/4 opacity-60"
          src={Icon}
          alt="Krown Quant Alchemy"
        />
        <ImageFallback>KQA</ImageFallback>
      </ImageRoot>
    </a>
  )
}

export default KrownQuantAlchemyLink
