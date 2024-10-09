import { createSignal, createEffect, onCleanup, JSX } from 'solid-js'
import { SparklesLogo } from '@/components/splashScreen/SparklesLogo'

interface SplashScreenProps {
  duration?: number
  backgroundColor?: string
  children?: JSX.Element
}

const SplashScreen = (props: SplashScreenProps) => {
  const [isVisible, setIsVisible] = createSignal(true)
  const [shouldRender, setShouldRender] = createSignal(true)

  createEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, props.duration || 3000) // Default duration is 3 seconds

    onCleanup(() => clearTimeout(timer))
  })

  createEffect(() => {
    if (!isVisible()) {
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 500) // Match this to the transition duration

      onCleanup(() => clearTimeout(timer))
    }
  })

  return (
    <>
      {shouldRender() && (
        <div
          class={`
            fixed top-0 left-0 w-full h-full
            flex justify-center items-center
            transition-opacity duration-500 ease-out
            ${isVisible() ? 'opacity-100' : 'opacity-0'}
            ${props.backgroundColor || 'bg-black'}
            z-50
          `}
        >
          {props.children || <SparklesLogo />}
        </div>
      )}
    </>
  )
}

export default SplashScreen
