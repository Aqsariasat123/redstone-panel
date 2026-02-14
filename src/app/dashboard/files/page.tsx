'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import ContainerSelector from '@/components/ContainerSelector'

interface FileItem {
  name: string
  type: 'file' | 'directory' | 'link'
  size: number
  modifiedAt: string
  permissions: string
}

interface Container {
  id: string
  vmid: number
  name: string
  hostname: string
  ip: string
}

export default function FilesPage() {
  const searchParams = useSearchParams()
  const [container, setContainer] = useState<Container | null>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentPath, setCurrentPath] = useState('/var/www')
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [editMode, setEditMode] = useState(false)

  const containerId = searchParams.get('container')

  const loadFiles = useCallback(async (path: string) => {
    if (!container) return

    setLoading(true)
    try {
      const res = await fetch(`/api/files?containerId=${container.id}&path=${encodeURIComponent(path)}`)
      const data = await res.json()
      setFiles(data.files || [])
      setCurrentPath(path)
    } catch (error) {
      console.error('Failed to load files:', error)
    }
    setLoading(false)
  }, [container])

  useEffect(() => {
    if (container) {
      loadFiles(currentPath)
    }
  }, [container, currentPath, loadFiles])

  const navigateTo = (name: string, type: string) => {
    if (type === 'directory') {
      const newPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`
      loadFiles(newPath)
    } else {
      openFile(name)
    }
  }

  const goUp = () => {
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    loadFiles('/' + parts.join('/') || '/')
  }

  const openFile = async (name: string) => {
    if (!container) return

    setSelectedFile(name)
    setLoading(true)

    try {
      const path = `${currentPath}/${name}`
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId: container.id, path, action: 'read' }),
      })
      const data = await res.json()
      setFileContent(data.content || '')
      setEditMode(false)
    } catch (error) {
      console.error('Failed to read file:', error)
    }

    setLoading(false)
  }

  const saveFile = async () => {
    if (!container || !selectedFile) return

    setLoading(true)

    try {
      const path = `${currentPath}/${selectedFile}`
      await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId: container.id, path, content: fileContent, action: 'write' }),
      })
      setEditMode(false)
    } catch (error) {
      console.error('Failed to save file:', error)
    }

    setLoading(false)
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">File Manager</h2>
          <p className="mt-1 text-sm text-gray-600">Browse and edit files on your container</p>
        </div>
        <div className="w-64">
          <ContainerSelector
            selectedId={containerId || container?.id || null}
            onSelect={setContainer}
          />
        </div>
      </div>

      {container && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* File Browser */}
          <div className="rounded-xl bg-white shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 px-4 py-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={goUp}
                  disabled={currentPath === '/'}
                  className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex-1 font-mono text-sm text-gray-600 bg-gray-50 rounded px-3 py-1.5">
                  {currentPath}
                </div>
                <button
                  onClick={() => loadFiles(currentPath)}
                  className="rounded p-1 hover:bg-gray-100"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="max-h-[500px] overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Size</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Perms</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {files.map((file) => (
                      <tr
                        key={file.name}
                        onClick={() => navigateTo(file.name, file.type)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center space-x-2">
                            {file.type === 'directory' ? (
                              <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className="text-sm text-gray-900">{file.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right text-xs text-gray-500">
                          {file.type === 'file' ? formatSize(file.size) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-xs text-gray-500">
                          {file.permissions}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* File Editor */}
          <div className="rounded-xl bg-white shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="font-medium text-gray-900">
                {selectedFile || 'Select a file'}
              </div>
              {selectedFile && (
                <div className="flex space-x-2">
                  {editMode ? (
                    <>
                      <button
                        onClick={saveFile}
                        className="rounded bg-red-500 px-3 py-1 text-sm font-medium text-white hover:bg-red-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="rounded bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditMode(true)}
                      className="rounded bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="p-4">
              {selectedFile ? (
                editMode ? (
                  <textarea
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    className="w-full h-[400px] font-mono text-sm bg-gray-900 text-green-400 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                ) : (
                  <pre className="w-full h-[400px] overflow-auto font-mono text-sm bg-gray-900 text-green-400 p-4 rounded-lg">
                    {fileContent}
                  </pre>
                )
              ) : (
                <div className="flex items-center justify-center h-[400px] text-gray-400">
                  Click on a file to view its contents
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
