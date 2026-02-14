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

export default function DatabasePage() {
  const searchParams = useSearchParams()
  const [container, setContainer] = useState<Container | null>(null)
  const [tables, setTables] = useState<string[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [tableData, setTableData] = useState<string>('')
  const [tableSchema, setTableSchema] = useState<string>('')
  const [rowCount, setRowCount] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [queryResult, setQueryResult] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const containerId = searchParams.get('container')

  const loadTables = useCallback(async () => {
    if (!container) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/database?containerId=${container.id}&action=tables`)
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        return
      }

      const tableList = data.data.split('\n').filter(Boolean)
      setTables(tableList)
    } catch (err) {
      setError('Failed to load tables')
      console.error(err)
    }

    setLoading(false)
  }, [container])

  useEffect(() => {
    if (container) {
      loadTables()
    }
  }, [container, loadTables])

  const selectTable = async (table: string) => {
    if (!container) return

    setSelectedTable(table)
    setLoading(true)

    try {
      // Load schema
      const schemaRes = await fetch(`/api/database?containerId=${container.id}&action=schema&table=${table}`)
      const schemaData = await schemaRes.json()
      setTableSchema(schemaData.data || '')

      // Load count
      const countRes = await fetch(`/api/database?containerId=${container.id}&action=count&table=${table}`)
      const countData = await countRes.json()
      setRowCount(parseInt(countData.data) || 0)

      // Load data
      const dataRes = await fetch(`/api/database?containerId=${container.id}&action=data&table=${table}`)
      const dataResult = await dataRes.json()
      setTableData(dataResult.data || '')
    } catch (err) {
      console.error('Failed to load table data:', err)
    }

    setLoading(false)
  }

  const executeQuery = async () => {
    if (!container || !query.trim()) return

    setLoading(true)
    setQueryResult('')

    try {
      const res = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId: container.id, query }),
      })
      const data = await res.json()
      setQueryResult(data.success ? data.data : `Error: ${data.error}`)
    } catch (err) {
      setQueryResult('Query execution failed')
      console.error(err)
    }

    setLoading(false)
  }

  const parseCSV = (csv: string) => {
    const lines = csv.split('\n').filter(Boolean)
    if (lines.length === 0) return { headers: [], rows: [] }

    const headers = lines[0].split(',')
    const rows = lines.slice(1).map(line => line.split(','))

    return { headers, rows }
  }

  const { headers, rows } = parseCSV(tableData)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Database Manager</h2>
          <p className="mt-1 text-sm text-gray-600">View and query PostgreSQL database</p>
        </div>
        <div className="w-64">
          <ContainerSelector
            selectedId={containerId || container?.id || null}
            onSelect={setContainer}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {container && !error && (
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Tables List */}
          <div className="lg:col-span-1">
            <div className="rounded-xl bg-white shadow-sm border border-gray-200">
              <div className="border-b border-gray-200 px-4 py-3">
                <h3 className="font-medium text-gray-900">Tables</h3>
              </div>
              <div className="max-h-[400px] overflow-auto">
                {tables.map((table) => (
                  <button
                    key={table}
                    onClick={() => selectTable(table)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                      selectedTable === table ? 'bg-red-50 text-red-700' : 'text-gray-700'
                    }`}
                  >
                    {table}
                  </button>
                ))}
                {tables.length === 0 && !loading && (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    No tables found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table Data & Query */}
          <div className="lg:col-span-3 space-y-6">
            {/* Table Info */}
            {selectedTable && (
              <div className="rounded-xl bg-white shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{selectedTable}</h3>
                    <p className="text-xs text-gray-500">{rowCount !== null ? `${rowCount} rows` : ''}</p>
                  </div>
                  <button
                    onClick={() => selectTable(selectedTable)}
                    className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
                  >
                    Refresh
                  </button>
                </div>

                {/* Schema */}
                {tableSchema && (
                  <div className="border-b border-gray-200 px-4 py-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Schema</p>
                    <div className="flex flex-wrap gap-2">
                      {tableSchema.split('\n').filter(Boolean).map((col, i) => {
                        const [name, type] = col.split('|')
                        return (
                          <span key={i} className="inline-flex items-center rounded bg-gray-100 px-2 py-1 text-xs">
                            <span className="font-medium text-gray-900">{name}</span>
                            <span className="ml-1 text-gray-500">{type}</span>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Data Table */}
                <div className="overflow-auto max-h-[300px]">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
                    </div>
                  ) : headers.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {headers.map((header, i) => (
                            <th key={i} className="px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rows.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {row.map((cell, j) => (
                              <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      No data
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Query Editor */}
            <div className="rounded-xl bg-white shadow-sm border border-gray-200">
              <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <h3 className="font-medium text-gray-900">SQL Query</h3>
                <button
                  onClick={executeQuery}
                  disabled={loading || !query.trim()}
                  className="rounded bg-red-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  Execute
                </button>
              </div>
              <div className="p-4">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="SELECT * FROM users LIMIT 10"
                  className="w-full h-24 font-mono text-sm bg-gray-900 text-green-400 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              {queryResult && (
                <div className="border-t border-gray-200 p-4">
                  <pre className="w-full max-h-[200px] overflow-auto font-mono text-xs bg-gray-50 p-3 rounded-lg">
                    {queryResult}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
