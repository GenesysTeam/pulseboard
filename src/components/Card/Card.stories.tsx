import type { Meta, StoryObj } from '@storybook/react'
import { Card } from './Card'

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  args: {
    children: (
      <div>
        <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-neutral-900)' }}>
          This is a card component. It provides a padded, elevated container for content.
        </p>
      </div>
    ),
  },
}

export const WithContent: Story = {
  render: () => (
    <Card>
      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-neutral-900)', marginBottom: 'var(--space-2)' }}>
        Card Title
      </h3>
      <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-neutral-600)' }}>
        Card body content goes here.
      </p>
    </Card>
  ),
}
