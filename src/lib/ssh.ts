import { Client, ConnectConfig, SFTPWrapper } from 'ssh2'

export interface SSHConfig {
  host: string
  port: number
  username: string
  password: string
}

export class SSHClient {
  private config: SSHConfig

  constructor(config: SSHConfig) {
    this.config = config
  }

  async exec(command: string): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve, reject) => {
      const conn = new Client()

      conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            conn.end()
            reject(err)
            return
          }

          let stdout = ''
          let stderr = ''

          stream.on('close', (code: number) => {
            conn.end()
            resolve({ stdout, stderr, code })
          })

          stream.on('data', (data: Buffer) => {
            stdout += data.toString()
          })

          stream.stderr.on('data', (data: Buffer) => {
            stderr += data.toString()
          })
        })
      })

      conn.on('error', (err) => {
        reject(err)
      })

      conn.connect(this.config as ConnectConfig)
    })
  }

  async getSFTP(): Promise<{ sftp: SFTPWrapper; conn: Client }> {
    return new Promise((resolve, reject) => {
      const conn = new Client()

      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) {
            conn.end()
            reject(err)
            return
          }
          resolve({ sftp, conn })
        })
      })

      conn.on('error', (err) => {
        reject(err)
      })

      conn.connect(this.config as ConnectConfig)
    })
  }

  async listDirectory(path: string): Promise<Array<{
    name: string
    type: 'file' | 'directory' | 'link'
    size: number
    modifiedAt: Date
    permissions: string
  }>> {
    const { sftp, conn } = await this.getSFTP()

    return new Promise((resolve, reject) => {
      sftp.readdir(path, (err, list) => {
        conn.end()
        if (err) {
          reject(err)
          return
        }

        const files = list.map((item) => ({
          name: item.filename,
          type: item.attrs.isDirectory() ? 'directory' as const :
                item.attrs.isSymbolicLink() ? 'link' as const : 'file' as const,
          size: item.attrs.size,
          modifiedAt: new Date(item.attrs.mtime * 1000),
          permissions: (item.attrs.mode & 0o777).toString(8).padStart(3, '0'),
        }))

        resolve(files)
      })
    })
  }

  async readFile(path: string): Promise<string> {
    const { sftp, conn } = await this.getSFTP()

    return new Promise((resolve, reject) => {
      let content = ''
      const stream = sftp.createReadStream(path)

      stream.on('data', (chunk: Buffer) => {
        content += chunk.toString()
      })

      stream.on('end', () => {
        conn.end()
        resolve(content)
      })

      stream.on('error', (err) => {
        conn.end()
        reject(err)
      })
    })
  }

  async writeFile(path: string, content: string): Promise<void> {
    const { sftp, conn } = await this.getSFTP()

    return new Promise((resolve, reject) => {
      const stream = sftp.createWriteStream(path)

      stream.on('close', () => {
        conn.end()
        resolve()
      })

      stream.on('error', (err) => {
        conn.end()
        reject(err)
      })

      stream.end(content)
    })
  }

  async deleteFile(path: string): Promise<void> {
    const { sftp, conn } = await this.getSFTP()

    return new Promise((resolve, reject) => {
      sftp.unlink(path, (err) => {
        conn.end()
        if (err) reject(err)
        else resolve()
      })
    })
  }

  async createDirectory(path: string): Promise<void> {
    const { sftp, conn } = await this.getSFTP()

    return new Promise((resolve, reject) => {
      sftp.mkdir(path, (err) => {
        conn.end()
        if (err) reject(err)
        else resolve()
      })
    })
  }
}

export function createSSHClient(config: SSHConfig): SSHClient {
  return new SSHClient(config)
}
