import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { SideNav } from './SideNav'

const meta: Meta<typeof SideNav> = {
  title: 'Components/SideNav',
  component: SideNav,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SideNav>

const items = [
  { label: 'Clients', key: 'clients' },
  { label: 'Settings', key: 'settings' },
]

const SideNavDemo = ({ defaultActive = 'clients' }: { defaultActive?: string }) => {
  const [activeKey, setActiveKey] = useState(defaultActive)
  return (
    <div style={{ height: '400px', display: 'flex' }}>
      <SideNav items={items} activeKey={activeKey} onSelect={setActiveKey} />
    </div>
  )
}

export const Default: Story = {
  render: () => <SideNavDemo />,
}

export const SettingsActive: Story = {
  render: () => <SideNavDemo defaultActive="settings" />,
}
