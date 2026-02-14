import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createSSHClient } from '@/lib/ssh'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const containerId = searchParams.get('containerId')
    const path = searchParams.get('path') || '/'

    if (!containerId) {
      return NextResponse.json({ error: 'Container ID required' }, { status: 400 })
    }

    const container = await prisma.container.findFirst({
      where: {
        id: containerId,
        ...(user.role !== 'ADMIN' ? { userId: user.id } : {}),
      },
    })

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 })
    }

    const ssh = createSSHClient({
      host: container.ip,
      port: container.sshPort,
      username: container.sshUser,
      password: container.sshPassword,
    })

    const files = await ssh.listDirectory(path)

    return NextResponse.json({ files, path })
  } catch (error) {
    console.error('List files error:', error)
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { containerId, path, content, action } = await request.json()

    if (!containerId || !path) {
      return NextResponse.json({ error: 'Container ID and path required' }, { status: 400 })
    }

    const container = await prisma.container.findFirst({
      where: {
        id: containerId,
        ...(user.role !== 'ADMIN' ? { userId: user.id } : {}),
      },
    })

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 })
    }

    const ssh = createSSHClient({
      host: container.ip,
      port: container.sshPort,
      username: container.sshUser,
      password: container.sshPassword,
    })

    if (action === 'read') {
      const fileContent = await ssh.readFile(path)
      return NextResponse.json({ content: fileContent })
    }

    if (action === 'write') {
      await ssh.writeFile(path, content)
      return NextResponse.json({ success: true })
    }

    if (action === 'delete') {
      await ssh.deleteFile(path)
      return NextResponse.json({ success: true })
    }

    if (action === 'mkdir') {
      await ssh.createDirectory(path)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('File operation error:', error)
    return NextResponse.json(
      { error: 'File operation failed' },
      { status: 500 }
    )
  }
}
