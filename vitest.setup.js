// Test harness for component / render tests (BACKLOG #35).
// - jest-dom matchers (toBeInTheDocument, toHaveClass, ...) on vitest's expect
// - unmount every rendered tree after each test so React Testing Library
//   renders don't leak between tests
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
