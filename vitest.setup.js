// Test harness for component / render tests (BACKLOG #35).
// - jest-dom matchers (toBeInTheDocument, toHaveClass, ...) on vitest's expect
// - unmount every rendered tree after each test so React Testing Library
//   renders don't leak between tests
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom doesn't implement these — stub them so components that call them on
// mount / effect don't blow up in tests.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}

afterEach(() => {
  cleanup()
})
