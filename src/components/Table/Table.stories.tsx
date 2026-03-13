import type { Meta, StoryObj } from '@storybook/react'
import { Table } from './Table'
import { Badge } from '../Badge'

const meta: Meta<typeof Table> = {
  title: 'Components/Table',
  component: Table,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Table>

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  {
    key: 'status',
    label: 'Status',
    render: (value: unknown) => <Badge variant={value as 'active' | 'pending' | 'inactive' | 'overdue'} />,
  },
  { key: 'lastContact', label: 'Last Contact' },
]

const data = [
  { name: 'Alice Johnson', email: 'alice@example.com', status: 'active', lastContact: '2024-01-10' },
  { name: 'Bob Smith', email: 'bob@example.com', status: 'pending', lastContact: '2024-01-08' },
  { name: 'Carol White', email: 'carol@example.com', status: 'inactive', lastContact: '2023-12-20' },
  { name: 'David Brown', email: 'david@example.com', status: 'overdue', lastContact: '2023-11-15' },
]

export const Default: Story = {
  args: { columns, data },
}

export const Empty: Story = {
  args: { columns, data: [] },
}
