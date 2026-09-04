import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/** Browser-only MSW worker. Only ever imported from client code — see `components/demo-mode-provider.tsx`. */
export const worker = setupWorker(...handlers)
