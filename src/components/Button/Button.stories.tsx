import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md'] },
    disabled: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: { variant: 'primary', size: 'md', children: 'Primary Button' },
}

export const Secondary: Story = {
  args: { variant: 'secondary', size: 'md', children: 'Secondary Button' },
}

export const Ghost: Story = {
  args: { variant: 'ghost', size: 'md', children: 'Ghost Button' },
}

export const SmallPrimary: Story = {
  args: { variant: 'primary', size: 'sm', children: 'Small Primary' },
}

export const SmallSecondary: Story = {
  args: { variant: 'secondary', size: 'sm', children: 'Small Secondary' },
}

export const SmallGhost: Story = {
  args: { variant: 'ghost', size: 'sm', children: 'Small Ghost' },
}

export const Disabled: Story = {
  args: { variant: 'primary', size: 'md', children: 'Disabled', disabled: true },
}

export const DisabledSecondary: Story = {
  args: { variant: 'secondary', size: 'md', children: 'Disabled', disabled: true },
}

export const DisabledGhost: Story = {
  args: { variant: 'ghost', size: 'md', children: 'Disabled', disabled: true },
}
