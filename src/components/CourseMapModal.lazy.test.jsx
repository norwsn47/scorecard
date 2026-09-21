import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LazyCourseMapModal from './CourseMapModal.lazy.jsx'

describe('LazyCourseMapModal', () => {
  it('renders the map dialog once its chunk has loaded, and passes props through', async () => {
    const onClose = vi.fn()
    render(<LazyCourseMapModal onClose={onClose} />)
    expect(await screen.findByRole('dialog', { name: /Bruntsfield Short Hole Golf Course/ })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
