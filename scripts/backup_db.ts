import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function main() {
    console.log('Backing up data...')

    const users = await prisma.user.findMany()
    const members = await prisma.member.findMany()
    const attendances = await prisma.attendance.findMany()
    const notices = await prisma.notice.findMany()

    const backupData = {
        users,
        members,
        attendances,
        notices
    }

    fs.writeFileSync('prisma/seed_from_backup.ts', `
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding from backup...')

  // Users
  for (const user of ${JSON.stringify(users)}) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        ...user,
        createdAt: new Date(user.createdAt)
      }
    })
  }

  // Members
  for (const member of ${JSON.stringify(members)}) {
    await prisma.member.upsert({
      where: { id: member.id }, // Assuming IDs are preserved via upsert? 
      // Upsert needs unique constraint. Member id is unique.
      update: {},
      create: {
        ...member,
        createdAt: new Date(member.createdAt),
        updatedAt: new Date(member.updatedAt)
      }
    })
  }

  // Notices
  for (const notice of ${JSON.stringify(notices)}) {
    await prisma.notice.upsert({
      where: { id: notice.id },
      update: {},
      create: {
        ...notice,
        createdAt: new Date(notice.createdAt)
      }
    })
  }

  // Attendance (Many, so createMany if supported or loop)
  // Attendance has ID, but usually linked to Member ID.
  // IDs in backup must match IDs in new DB.
  // SQLite auto-increments started at 1. Postgres also.
  // We should force IDs if possible or just rely on same insertion order?
  // Upsert is safer.
  for (const att of ${JSON.stringify(attendances)}) {
    await prisma.attendance.upsert({
      where: { id: att.id },
      update: {},
      create: {
        ...att,
        date: new Date(att.date),
        checkTime: new Date(att.checkTime)
      }
    })
  }
  
  console.log('Seeding completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
`)

    console.log('Backup created at prisma/seed_from_backup.ts')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
