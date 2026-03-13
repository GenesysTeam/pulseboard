import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './Badge'

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Badge>

export const Active: Story = { args: { variant: 'active' } }
export const Pending: Story = { args: { variant: 'pending' } }
export const Inactive: Story = { args: { variant: 'inactive' } }
export const Overdue: Story = { args: { variant: 'overdue' } }

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
      <Badge variant="active" />
      <Badge variant="pending" />
      <Badge variant="inactive" />
      <Badge variant="overdue" />
    </div>
  ),
}
