import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Modal } from './Modal'
import { Button } from '../Button'
import { Input } from '../Input'

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Modal>

const ModalDemo = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Add Client"
        primaryAction={{ label: 'Add Client', onClick: () => setIsOpen(false) }}
        secondaryAction={{ label: 'Cancel', onClick: () => setIsOpen(false) }}
      >
        <Input label="Name" placeholder="Client name" value={name} onChange={setName} />
        <Input label="Email" placeholder="client@example.com" value={email} onChange={setEmail} />
      </Modal>
    </>
  )
}

export const Default: Story = {
  render: () => <ModalDemo />,
}
