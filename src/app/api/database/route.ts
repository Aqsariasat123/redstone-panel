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
    const action = searchParams.get('action') || 'tables'
    const table = searchParams.get('table')

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

    if (!container.dbName || !container.dbUser || !container.dbPassword) {
      return NextResponse.json({ error: 'Database not configured for this container' }, { status: 400 })
    }

    const ssh = createSSHClient({
      host: container.ip,
      port: container.sshPort,
      username: container.sshUser,
      password: container.sshPassword,
    })

    const dbEnv = `PGPASSWORD='${container.dbPassword}'`
    const psql = `psql -U ${container.dbUser} -d ${container.dbName} -t -A`

    let command = ''

    switch (action) {
      case 'tables':
        command = `${dbEnv} ${psql} -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"`
        break
      case 'schema':
        if (!table) {
          return NextResponse.json({ error: 'Table name required' }, { status: 400 })
        }
        command = `${dbEnv} ${psql} -c "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position"`
        break
      case 'data':
        if (!table) {
          return NextResponse.json({ error: 'Table name required' }, { status: 400 })
        }
        command = `${dbEnv} ${psql} -c "SELECT * FROM \\"${table}\\" LIMIT 100" --csv`
        break
      case 'count':
        if (!table) {
          return NextResponse.json({ error: 'Table name required' }, { status: 400 })
        }
        command = `${dbEnv} ${psql} -c "SELECT COUNT(*) FROM \\"${table}\\""`
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const result = await ssh.exec(command)

    if (result.code !== 0) {
      return NextResponse.json({ error: result.stderr || 'Query failed' }, { status: 500 })
    }

    return NextResponse.json({
      data: result.stdout.trim(),
      action,
    })
  } catch (error) {
    console.error('Database query error:', error)
    return NextResponse.json(
      { error: 'Database query failed' },
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

    const { containerId, query } = await request.json()

    if (!containerId || !query) {
      return NextResponse.json({ error: 'Container ID and query required' }, { status: 400 })
    }

    // Safety check - only allow SELECT queries for non-admins
    const queryUpper = query.trim().toUpperCase()
    if (user.role !== 'ADMIN' && !queryUpper.startsWith('SELECT')) {
      return NextResponse.json({ error: 'Only SELECT queries allowed' }, { status: 403 })
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

    if (!container.dbName || !container.dbUser || !container.dbPassword) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 400 })
    }

    const ssh = createSSHClient({
      host: container.ip,
      port: container.sshPort,
      username: container.sshUser,
      password: container.sshPassword,
    })

    const command = `PGPASSWORD='${container.dbPassword}' psql -U ${container.dbUser} -d ${container.dbName} -c "${query.replace(/"/g, '\\"')}" --csv`

    const result = await ssh.exec(command)

    return NextResponse.json({
      data: result.stdout,
      error: result.stderr,
      success: result.code === 0,
    })
  } catch (error) {
    console.error('Execute query error:', error)
    return NextResponse.json(
      { error: 'Query execution failed' },
      { status: 500 }
    )
  }
}
