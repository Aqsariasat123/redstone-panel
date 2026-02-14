import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
})

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('Redstone@2026', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@byredstone.com' },
    update: {},
    create: {
      email: 'admin@byredstone.com',
      password: adminPassword,
      name: 'Admin',
      role: 'ADMIN',
    },
  })

  console.log('Admin user created:', admin.email)

  // Create Muraselon client
  const clientPassword = await bcrypt.hash('Muraselon@2026', 12)

  const muraselon = await prisma.user.upsert({
    where: { email: 'muraselon@byredstone.com' },
    update: {},
    create: {
      email: 'muraselon@byredstone.com',
      password: clientPassword,
      name: 'Muraselon',
      role: 'CLIENT',
    },
  })

  console.log('Muraselon user created:', muraselon.email)

  // Create container for Muraselon
  const container = await prisma.container.upsert({
    where: { vmid: 109 },
    update: {},
    create: {
      vmid: 109,
      name: 'Muraselon',
      hostname: 'muraselon',
      ip: '10.10.10.243',
      sshPort: 22,
      sshUser: 'redstone',
      sshPassword: 'Redstone@2026',
      dbName: 'muraselon',
      dbUser: 'muraselon',
      dbPassword: 'Muraselon@2026',
      userId: muraselon.id,
    },
  })

  console.log('Muraselon container created:', container.name)

  // Create SME client
  const smePassword = await bcrypt.hash('SME@2026', 12)

  const sme = await prisma.user.upsert({
    where: { email: 'sme@byredstone.com' },
    update: {},
    create: {
      email: 'sme@byredstone.com',
      password: smePassword,
      name: 'SME Portal',
      role: 'CLIENT',
    },
  })

  console.log('SME user created:', sme.email)

  // Create container for SME
  await prisma.container.upsert({
    where: { vmid: 106 },
    update: {},
    create: {
      vmid: 106,
      name: 'SME Portal',
      hostname: 'sme-portal',
      ip: '10.10.10.241',
      sshPort: 22,
      sshUser: 'root',
      sshPassword: 'Redstone@2026',
      dbName: 'sme',
      dbUser: 'sme',
      dbPassword: 'SME@2026',
      userId: sme.id,
    },
  })

  // Create Marketplace client
  const marketPassword = await bcrypt.hash('Market@2026', 12)

  const marketplace = await prisma.user.upsert({
    where: { email: 'marketplace@byredstone.com' },
    update: {},
    create: {
      email: 'marketplace@byredstone.com',
      password: marketPassword,
      name: 'Marketplace',
      role: 'CLIENT',
    },
  })

  console.log('Marketplace user created:', marketplace.email)

  // Create container for Marketplace
  await prisma.container.upsert({
    where: { vmid: 107 },
    update: {},
    create: {
      vmid: 107,
      name: 'Marketplace',
      hostname: 'marketplace',
      ip: '10.10.10.242',
      sshPort: 22,
      sshUser: 'root',
      sshPassword: 'Redstone@2026',
      dbName: 'marketplace',
      dbUser: 'marketplace',
      dbPassword: 'Market@2026',
      userId: marketplace.id,
    },
  })

  // Add services for Muraselon
  await prisma.service.createMany({
    data: [
      { name: 'muraselon-api', type: 'PM2', port: 8000, containerId: container.id },
      { name: 'muraselon-website', type: 'PM2', port: 3000, containerId: container.id },
      { name: 'muraselon-cms', type: 'PM2', port: 3001, containerId: container.id },
    ],
    skipDuplicates: true,
  })

  console.log('Services created')
  console.log('\n--- Login Credentials ---')
  console.log('Admin: admin@byredstone.com / Redstone@2026')
  console.log('Muraselon: muraselon@byredstone.com / Muraselon@2026')
  console.log('SME: sme@byredstone.com / SME@2026')
  console.log('Marketplace: marketplace@byredstone.com / Market@2026')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
