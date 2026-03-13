import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input'

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Input>

const InputWithState = (args: Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'>) => {
  const [value, setValue] = useState('')
  return <Input {...args} value={value} onChange={setValue} />
}

export const Default: Story = {
  render: () => <InputWithState label="Full Name" placeholder="Enter your name" />,
}

export const WithHelperText: Story = {
  render: () => (
    <InputWithState
      label="Email"
      placeholder="you@example.com"
      helperText="We'll never share your email"
    />
  ),
}

export const WithError: Story = {
  render: () => (
    <InputWithState
      label="Email"
      placeholder="you@example.com"
      error="Please enter a valid email address"
    />
  ),
}

export const Disabled: Story = {
  render: () => (
    <Input
      label="Locked Field"
      placeholder="Cannot edit"
      disabled
      value="Locked value"
      onChange={() => {}}
    />
  ),
}
