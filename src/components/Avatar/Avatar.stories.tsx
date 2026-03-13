import type { Meta, StoryObj } from '@storybook/react'
import { Avatar } from './Avatar'

const meta: Meta<typeof Avatar> = {
  title: 'Components/Avatar',
  component: Avatar,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Avatar>

export const MediumInitials: Story = {
  args: { name: 'John Doe', size: 'md' },
}

export const SmallInitials: Story = {
  args: { name: 'Jane Smith', size: 'sm' },
}

export const SingleName: Story = {
  args: { name: 'Alice', size: 'md' },
}

export const WithImage: Story = {
  args: {
    name: 'John Doe',
    size: 'md',
    src: 'https://i.pravatar.cc/150?img=1',
  },
}
