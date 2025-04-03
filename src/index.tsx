import { render } from 'solid-js/web'
import { inject } from '@vercel/analytics'
import App from './App'
import './index.css'

inject()

render(() => <App />, document.getElementById('app')!)
