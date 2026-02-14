'use client'

import { useEffect, useState } from 'react'

interface Container {
  id: string
  vmid: number
  name: string
  hostname: string
  ip: string
}

interface ContainerSelectorProps {
  selectedId: string | null
  onSelect: (container: Container | null) => void
}

export default function ContainerSelector({ selectedId, onSelect }: ContainerSelectorProps) {
  const [containers, setContainers] = useState<Container[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/containers')
      .then((res) => res.json())
      .then((data) => {
        setContainers(data.containers || [])
        setLoading(false)
        // Auto-select first container if none selected
        if (!selectedId && data.containers?.length > 0) {
          onSelect(data.containers[0])
        }
      })
      .catch(() => setLoading(false))
  }, [selectedId, onSelect])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (containers.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No containers available
      </div>
    )
  }

  return (
    <select
      value={selectedId || ''}
      onChange={(e) => {
        const container = containers.find((c) => c.id === e.target.value)
        onSelect(container || null)
      }}
      className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
    >
      <option value="">Select a container...</option>
      {containers.map((container) => (
        <option key={container.id} value={container.id}>
          {container.name} (VMID: {container.vmid}) - {container.ip}
        </option>
      ))}
    </select>
  )
}
