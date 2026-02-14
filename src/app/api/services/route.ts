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

    if (!containerId) {
      return NextResponse.json({ error: 'Container ID required' }, { status: 400 })
    }

    const container = await prisma.container.findFirst({
      where: {
        id: containerId,
        ...(user.role !== 'ADMIN' ? { userId: user.id } : {}),
      },
      include: { services: true },
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

    // Get PM2 status
    const pm2Result = await ssh.exec('pm2 jlist 2>/dev/null || echo "[]"')
    let pm2Services = []
    try {
      pm2Services = JSON.parse(pm2Result.stdout)
    } catch {
      pm2Services = []
    }

    // Get systemd services status
    const systemdResult = await ssh.exec('systemctl list-units --type=service --state=running --no-pager --no-legend | head -20')
    const systemdServices = systemdResult.stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const parts = line.trim().split(/\s+/)
        return {
          name: parts[0]?.replace('.service', ''),
          status: 'running',
        }
      })

    // Get ports in use
    const portsResult = await ssh.exec('ss -tlnp 2>/dev/null | grep LISTEN')
    const ports = portsResult.stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/:(\d+)\s/)
        return match ? parseInt(match[1]) : null
      })
      .filter(Boolean)

    return NextResponse.json({
      pm2: pm2Services,
      systemd: systemdServices,
      ports: [...new Set(ports)],
      dbServices: container.services,
    })
  } catch (error) {
    console.error('Get services error:', error)
    return NextResponse.json(
      { error: 'Failed to get services' },
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

    const { containerId, service, action, type } = await request.json()

    if (!containerId || !service || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    let command = ''

    if (type === 'pm2') {
      switch (action) {
        case 'start':
          command = `pm2 start ${service}`
          break
        case 'stop':
          command = `pm2 stop ${service}`
          break
        case 'restart':
          command = `pm2 restart ${service}`
          break
        case 'delete':
          command = `pm2 delete ${service}`
          break
        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
      }
    } else if (type === 'systemd') {
      switch (action) {
        case 'start':
          command = `sudo systemctl start ${service}`
          break
        case 'stop':
          command = `sudo systemctl stop ${service}`
          break
        case 'restart':
          command = `sudo systemctl restart ${service}`
          break
        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'Invalid service type' }, { status: 400 })
    }

    const result = await ssh.exec(command)

    return NextResponse.json({
      success: result.code === 0,
      output: result.stdout,
      error: result.stderr,
    })
  } catch (error) {
    console.error('Service action error:', error)
    return NextResponse.json(
      { error: 'Service action failed' },
      { status: 500 }
    )
  }
}
