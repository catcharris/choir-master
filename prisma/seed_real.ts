import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()

const PartMapping: Record<string, string> = {
    '소프라노A': 'Soprano A',
    '소프라노B': 'Soprano B',
    '소프라노B+': 'Soprano B+',
    '알토A': 'Alto A',
    '알토B': 'Alto B',
    '테너': 'Tenor',
    '베이스': 'Bass'
}

async function main() {
    console.log("🌱 Seeding Real Data from CSV...")

    // 1. Clean up existing data
    await prisma.attendance.deleteMany()
    await prisma.member.deleteMany()
    await prisma.user.deleteMany()

    console.log("🧹 Cleared existing data.")

    // 2. Create System Users
    const users = [
        { username: 'admin', password: '123', role: 'ADMIN', name: 'General Manager' },
        { username: 'clerk', password: '123', role: 'CLERK', name: 'Secretary' },

        { username: 'sopranoA', password: '123', role: 'LEADER', part: 'Soprano A', name: 'Soprano A Leader' },
        { username: 'sopranoB', password: '123', role: 'LEADER', part: 'Soprano B', name: 'Soprano B Leader' },
        { username: 'altoA', password: '123', role: 'LEADER', part: 'Alto A', name: 'Alto A Leader' },
        { username: 'altoB', password: '123', role: 'LEADER', part: 'Alto B', name: 'Alto B Leader' },
        { username: 'tenor', password: '123', role: 'LEADER', part: 'Tenor', name: 'Tenor Leader' },
        { username: 'bass', password: '123', role: 'LEADER', part: 'Bass', name: 'Bass Leader' },
    ]

    for (const user of users) {
        await prisma.user.create({
            data: {
                username: user.username,
                password: user.password,
                role: user.role,
                name: user.name,
                part: user.part
            }
        })
    }
    console.log("👤 Created system users.")

    // 3. Parse CSV and Create Members
    const csvPath = path.join(process.cwd(), 'choir_members.csv')
    const fileContent = fs.readFileSync(csvPath, 'utf-8')

    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true
    })

    console.log(`📜 Found ${records.length} records in CSV.`)

    for (const record of records) {
        // Mapping
        // CSV Headers: member_id,파트,이름,직분,상태
        const koreanPart = record['파트']
        const name = record['이름']
        const churchTitle = record['직분'] || '성도'
        const statusRaw = record['상태'] || ''

        const part = PartMapping[koreanPart] || koreanPart // Fallback

        // Role Logic
        let role = 'Regular'
        let isActive = true

        if (statusRaw.includes('솔리스트')) {
            role = 'Soloist'
        } else if (statusRaw.includes('휴식')) {
            role = 'Resting'
            // isActive = false // Keep active true for now to show in lists as per user request? 
            // User: "매월 휴식대원현환" -> implies we track them.
            // If isActive is false, they might be hidden from attendance lists entirely depending on query.
            // My code: `where: { isActive: true }` in attendance list.
            // So if I set false, they disappear.
            // User wanted "Managing members... marking them as Resting".
            // ReportsView separates them.
            // Let's set isActive = true but role = Resting so they show up in lists but can be filtered?
            // Actually, in `getMonthlyReport`:
            // `const activeSingers = partMembers.filter(m => m.role !== 'Resting')`
            // `const restingSingers = partMembers.filter(m => m.role === 'Resting')`
            // So if I set isActive=true, they are loaded.
            // If I set isActive=false, they are NOT loaded in `members` query in report (line 66 actions/stats.ts: `where: { isActive: true }`).
            // WAIT. `getMonthlyReport` queries `members` with `where: { isActive: true }`.
            // If I mark them inactive, they won't appear in "Resting List" of the report.
            // So I must set isActive = true for 'Resting' members, but their Role makes them 'Resting'.
            // Only 'Left/Withdrawn' members should be isActive = false.
        } else if (statusRaw.includes('제적') || statusRaw.includes('탈퇴')) {
            isActive = false
        }

        if (!part) {
            console.warn(`⚠️ Skipping member ${name}: Unknown part ${koreanPart}`)
            continue
        }

        await prisma.member.create({
            data: {
                name,
                part,
                role,
                churchTitle,
                isActive
            }
        })
    }

    console.log("✅ Members seeded successfully!")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
