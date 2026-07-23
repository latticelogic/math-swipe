/**
 * The real app boot — imported DYNAMICALLY by main.tsx AFTER initI18n() has
 * resolved the active locale catalog. That ordering is what preserves i18n
 * design decision (1): every module-level t() constant across the app
 * evaluates with the right language already active, keeping t() synchronous
 * and referentially stable. Do not import this module statically.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </StrictMode>,
)
