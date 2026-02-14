'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import ContainerSelector from '@/components/ContainerSelector'

interface PM2Service {
  name: string
  pm_id: number
  pm2_env: {
    status: string
    pm_uptime: number
  }
  monit: {
    memory: number
    cpu: number
  }
}

interface Container {
  id: string
  vmid: number
  name: string
  hostname: string
  ip: string
}

export default function ServicesPage() {
  const searchParams = useSearchParams()
  const [container, setContainer] = useState<Container | null>(null)
  const [pm2Services, setPm2Services] = useState<PM2Service[]>([])
  const [systemdServices, setSystemdServices] = useState<{name: string; status: string}[]>([])
  const [ports, setPorts] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const containerId = searchParams.get('containerId') || searchParams.get('container')

  const loadServices = useCallback(async () => {
    if (!container) return

    setLoading(true)
    try {
      const res = await fetch(`/api/services?containerId=${container.id}`)
      const data = await res.json()
      setPm2Services(data.pm2 || [])
      setSystemdServices(data.systemd || [])
      setPorts(data.ports || [])
    } catch (error) {
      console.error('Failed to load services:', error)
    }
    setLoading(false)
  }, [container])

  useEffect(() => {
    if (container) {
      loadServices()
    }
  }, [container, loadServices])

  const handleServiceAction = async (service: string, action: string, type: 'pm2' | 'systemd') => {
    if (!container) return

    setActionLoading(`${type}-${service}-${action}`)

    try {
      await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId: container.id, service, action, type }),
      })
      await loadServices()
    } catch (error) {
      console.error('Service action failed:', error)
    }

    setActionLoading(null)
  }

  const formatUptime = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ${hours % 24}h`
    return `${hours}h`
  }

  const formatMemory = (bytes: number) => {
    return `${Math.round(bytes / 1024 / 1024)} MB`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Services</h2>
          <p className="mt-1 text-sm text-gray-600">Manage PM2 and system services</p>
        </div>
        <div className="w-64">
          <ContainerSelector
            selectedId={containerId || container?.id || null}
            onSelect={setContainer}
          />
        </div>
      </div>

      {container && (
        <div className="space-y-6">
          {/* Active Ports */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Ports</h3>
            <div className="flex flex-wrap gap-2">
              {ports.map((port) => (
                <span
                  key={port}
                  className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800"
                >
                  :{port}
                </span>
              ))}
              {ports.length === 0 && (
                <span className="text-sm text-gray-500">No active ports detected</span>
              )}
            </div>
          </div>

          {/* PM2 Services */}
          <div className="rounded-xl bg-white shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">PM2 Processes</h3>
              <button
                onClick={loadServices}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
              </div>
            ) : pm2Services.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {pm2Services.map((service) => (
                  <div key={service.pm_id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`h-3 w-3 rounded-full ${
                        service.pm2_env.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-900">{service.name}</p>
                        <p className="text-xs text-gray-500">
                          ID: {service.pm_id} | CPU: {service.monit.cpu}% | RAM: {formatMemory(service.monit.memory)} | Uptime: {formatUptime(service.pm2_env.pm_uptime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleServiceAction(service.name, 'restart', 'pm2')}
                        disabled={actionLoading === `pm2-${service.name}-restart`}
                        className="rounded bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                      >
                        {actionLoading === `pm2-${service.name}-restart` ? '...' : 'Restart'}
                      </button>
                      <button
                        onClick={() => handleServiceAction(service.name, service.pm2_env.status === 'online' ? 'stop' : 'start', 'pm2')}
                        disabled={actionLoading?.startsWith(`pm2-${service.name}`)}
                        className={`rounded px-3 py-1 text-sm font-medium disabled:opacity-50 ${
                          service.pm2_env.status === 'online'
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {service.pm2_env.status === 'online' ? 'Stop' : 'Start'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-gray-500">
                No PM2 processes running
              </div>
            )}
          </div>

          {/* Systemd Services */}
          <div className="rounded-xl bg-white shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">System Services</h3>
            </div>

            {systemdServices.length > 0 ? (
              <div className="divide-y divide-gray-100 max-h-64 overflow-auto">
                {systemdServices.map((service) => (
                  <div key={service.name} className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-sm text-gray-900">{service.name}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleServiceAction(service.name, 'restart', 'systemd')}
                        disabled={actionLoading === `systemd-${service.name}-restart`}
                        className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                      >
                        Restart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No system services detected
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
