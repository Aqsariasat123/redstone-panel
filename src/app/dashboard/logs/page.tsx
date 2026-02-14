'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import ContainerSelector from '@/components/ContainerSelector'

interface Container {
  id: string
  vmid: number
  name: string
  hostname: string
  ip: string
}

const logTypes = [
  { id: 'pm2', name: 'PM2 Logs' },
  { id: 'nginx', name: 'Nginx Logs' },
  { id: 'system', name: 'System Logs' },
  { id: 'postgresql', name: 'PostgreSQL Logs' },
]

export default function LogsPage() {
  const searchParams = useSearchParams()
  const [container, setContainer] = useState<Container | null>(null)
  const [logType, setLogType] = useState('pm2')
  const [logs, setLogs] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const containerId = searchParams.get('containerId') || searchParams.get('container')

  const loadLogs = useCallback(async () => {
    if (!container) return

    setLoading(true)

    try {
      const res = await fetch(`/api/logs?containerId=${container.id}&type=${logType}&lines=200`)
      const data = await res.json()
      setLogs(data.logs || data.error || 'No logs available')
    } catch (error) {
      setLogs('Failed to load logs')
      console.error(error)
    }

    setLoading(false)
  }, [container, logType])

  useEffect(() => {
    if (container) {
      loadLogs()
    }
  }, [container, logType, loadLogs])

  useEffect(() => {
    if (!autoRefresh || !container) return

    const interval = setInterval(loadLogs, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh, container, loadLogs])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Log Viewer</h2>
          <p className="mt-1 text-sm text-gray-600">View application and system logs</p>
        </div>
        <div className="w-64">
          <ContainerSelector
            selectedId={containerId || container?.id || null}
            onSelect={setContainer}
          />
        </div>
      </div>

      {container && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {logTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setLogType(type.id)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    logType === type.id
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.name}
                </button>
              ))}
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-red-500 focus:ring-red-500"
                />
                <span className="text-gray-700">Auto-refresh (5s)</span>
              </label>
              <button
                onClick={loadLogs}
                disabled={loading}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Log Output */}
          <div className="rounded-xl bg-gray-900 shadow-lg">
            <div className="border-b border-gray-700 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-sm text-gray-400 ml-2">
                  {container.name} - {logTypes.find(t => t.id === logType)?.name}
                </span>
              </div>
              {autoRefresh && (
                <span className="text-xs text-green-400 flex items-center">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse mr-2"></span>
                  Live
                </span>
              )}
            </div>
            <div className="p-4 h-[600px] overflow-auto">
              {loading && !logs ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
                </div>
              ) : (
                <pre className="font-mono text-sm text-green-400 whitespace-pre-wrap">
                  {logs.split('\n').map((line, i) => {
                    // Color code different log levels
                    let className = 'text-green-400'
                    if (line.toLowerCase().includes('error')) className = 'text-red-400'
                    else if (line.toLowerCase().includes('warn')) className = 'text-yellow-400'
                    else if (line.toLowerCase().includes('info')) className = 'text-blue-400'

                    return (
                      <div key={i} className={className}>
                        {line}
                      </div>
                    )
                  })}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
