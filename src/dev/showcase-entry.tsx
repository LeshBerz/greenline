// Standalone entry for the dev showcase: `npm run dev`, then open /src/dev/showcase.html.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Showcase } from './Showcase'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Showcase />
  </StrictMode>,
)
