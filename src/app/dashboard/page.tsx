'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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

  const totalServices = containers.reduce((acc, c) => acc + c.services.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-600">
          Overview of your hosting infrastructure
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-100">Total Containers</p>
              <p className="mt-1 text-3xl font-bold">{containers.length}</p>
            </div>
            <div className="rounded-full bg-white/20 p-3">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-100">Online</p>
              <p className="mt-1 text-3xl font-bold">{containers.length}</p>
            </div>
            <div className="rounded-full bg-white/20 p-3">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100">Services</p>
              <p className="mt-1 text-3xl font-bold">{totalServices}</p>
            </div>
            <div className="rounded-full bg-white/20 p-3">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-100">Databases</p>
              <p className="mt-1 text-3xl font-bold">{containers.length}</p>
            </div>
            <div className="rounded-full bg-white/20 p-3">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Containers Grid */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Containers</h3>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {containers.map((container) => (
            <div
              key={container.id}
              className="rounded-xl bg-white p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{container.name}</h3>
                    <p className="text-xs text-gray-500">VMID: {container.vmid}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                  Online
                </span>
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <span className="text-sm text-gray-600">IP Address</span>
                  </div>
                  <span className="font-mono text-sm font-medium text-gray-900">{container.ip}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-600">Hostname</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{container.hostname}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    <span className="text-sm text-gray-600">Services</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{container.services.length} configured</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <Link
                  href={`/dashboard/files?containerId=${container.id}`}
                  className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  <svg className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="text-xs font-medium">Files</span>
                </Link>
                <Link
                  href={`/dashboard/database?containerId=${container.id}`}
                  className="flex flex-col items-center justify-center p-3 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                >
                  <svg className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  <span className="text-xs font-medium">Database</span>
                </Link>
                <Link
                  href={`/dashboard/services?containerId=${container.id}`}
                  className="flex flex-col items-center justify-center p-3 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                >
                  <svg className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                  </svg>
                  <span className="text-xs font-medium">Services</span>
                </Link>
                <Link
                  href={`/dashboard/logs?containerId=${container.id}`}
                  className="flex flex-col items-center justify-center p-3 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                >
                  <svg className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-xs font-medium">Logs</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {containers.length === 0 && (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-200">
          <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No containers assigned</h3>
          <p className="mt-2 text-sm text-gray-500">
            Contact your administrator to get access to containers.
          </p>
        </div>
      )}
    </div>
  )
}
