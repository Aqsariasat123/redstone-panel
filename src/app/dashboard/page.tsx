'use client'

import { useEffect, useState } from 'react'

interface Container {
  id: string
  vmid: number
  name: string
  hostname: string
  ip: string
  services: { id: string; name: string; type: string; port: number }[]
  user: { name: string; email: string }
}

export default function DashboardPage() {
  const [containers, setContainers] = useState<Container[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/containers')
      .then((res) => res.json())
      .then((data) => {
        setContainers(data.containers || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-600">
          Overview of your containers and services
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {containers.map((container) => (
          <div
            key={container.id}
            className="rounded-xl bg-white p-6 shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                  <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{container.name}</h3>
                  <p className="text-xs text-gray-500">VMID: {container.vmid}</p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                Online
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">IP Address</span>
                <span className="font-mono text-gray-900">{container.ip}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Hostname</span>
                <span className="text-gray-900">{container.hostname}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Services</span>
                <span className="text-gray-900">{container.services.length} active</span>
              </div>
            </div>

            <div className="mt-4 flex space-x-2">
              <a
                href={`/dashboard/files?container=${container.id}`}
                className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Files
              </a>
              <a
                href={`/dashboard/services?container=${container.id}`}
                className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Services
              </a>
              <a
                href={`/dashboard/logs?container=${container.id}`}
                className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Logs
              </a>
            </div>
          </div>
        ))}
      </div>

      {containers.length === 0 && (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-200">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No containers</h3>
          <p className="mt-2 text-sm text-gray-500">
            You don&apos;t have any containers assigned yet.
          </p>
        </div>
      )}
    </div>
  )
}
