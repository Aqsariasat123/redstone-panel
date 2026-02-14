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
    const logType = searchParams.get('type') || 'pm2'
    const service = searchParams.get('service')
    const lines = parseInt(searchParams.get('lines') || '100')

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

    let command = ''

    switch (logType) {
      case 'pm2':
        command = service
          ? `pm2 logs ${service} --lines ${lines} --nostream 2>&1`
          : `pm2 logs --lines ${lines} --nostream 2>&1`
        break
      case 'nginx':
        command = `tail -n ${lines} /var/log/nginx/access.log /var/log/nginx/error.log 2>/dev/null || echo "No nginx logs found"`
        break
      case 'system':
        command = `journalctl -n ${lines} --no-pager 2>/dev/null || tail -n ${lines} /var/log/syslog 2>/dev/null || echo "No system logs found"`
        break
      case 'postgresql':
        command = `tail -n ${lines} /var/log/postgresql/*.log 2>/dev/null || echo "No PostgreSQL logs found"`
        break
      default:
        return NextResponse.json({ error: 'Invalid log type' }, { status: 400 })
    }

    const result = await ssh.exec(command)

    return NextResponse.json({
      logs: result.stdout,
      error: result.stderr,
    })
  } catch (error) {
    console.error('Get logs error:', error)
    return NextResponse.json(
      { error: 'Failed to get logs' },
      { status: 500 }
    )
  }
}
