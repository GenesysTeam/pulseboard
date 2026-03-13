import type { Meta, StoryObj } from '@storybook/react'
import { EmptyState } from './EmptyState'

const meta: Meta<typeof EmptyState> = {
  title: 'Components/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof EmptyState>

export const Default: Story = {
  args: {
    heading: 'No clients yet',
    description: 'Add your first client to get started.',
    action: { label: 'Add Client', onClick: () => alert('Add Client clicked') },
  },
}

export const WithoutAction: Story = {
  args: {
    heading: 'Nothing here',
    description: 'There is nothing to display at this time.',
  },
}
