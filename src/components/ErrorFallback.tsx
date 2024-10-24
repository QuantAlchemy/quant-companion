import { Component, createSignal } from 'solid-js'

interface ErrorFallbackProps {
  error: Error
}

export const ErrorFallback: Component<ErrorFallbackProps> = (props) => {
  const [showDetails, setShowDetails] = createSignal(false)

  // console.log(props.error, JSON.stringify(props.error, null, 2))
  console.log(props)

  return (
    <div class="flex flex-col items-center justify-center min-h-screen text-center p-8">
      <h1 class="text-5xl font-bold mb-4">Oops! Something went wrong 💥</h1>
      <p class="text-xl mb-6">
        It seems our app took a wrong turn. Don't worry though, we're on it! In the meantime, you
        can{' '}
        <button
          onClick={() => window.location.reload()}
          class="underline text-blue-400 hover:text-blue-600 transition-colors"
        >
          refresh the page
        </button>{' '}
        or{' '}
        <button
          class="underline text-blue-400 hover:text-blue-600 transition-colors"
          onClick={() => setShowDetails(!showDetails())}
        >
          show more details
        </button>
        .
      </p>

      {showDetails() && (
        <div class="bg-gray-900 p-4 rounded-lg shadow-lg text-left w-full max-w-md mt-4">
          <p class="text-sm text-gray-400">
            Here are some more details on the error. Please contact support if the issue persists!
          </p>
          <pre class="bg-gray-700 p-3 rounded-lg mt-2 text-xs overflow-x-auto">
            {props.error?.message}
          </pre>
          <pre class="bg-gray-700 p-3 rounded-lg mt-2 text-xs overflow-x-auto">
            {props.error?.stack}
          </pre>
        </div>
      )}

      <div class="mt-6">
        <img
          // src="https://media.giphy.com/media/JPb2StToDnCnYFMUG7/giphy.gif"
          // src="https://media.giphy.com/media/26ufnwz3wDUli7GU0/giphy.gif"
          src="https://media.giphy.com/media/QMHoU66sBXqqLqYvGO/giphy.gif"
          alt="Something went wrong"
          class="rounded-lg shadow-lg"
        />
      </div>
    </div>
  )
}

export default ErrorFallback
