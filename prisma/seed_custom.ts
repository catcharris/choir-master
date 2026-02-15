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

    // Parse CSV
    const records: any[] = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    })

    console.log(`📜 Found ${records.length} records in CSV.`)

    for (const record of records) {
        // Mapping
        // CSV Headers: member_id,파트,이름,직분,상태
        const koreanPart = record['파트']
        const name = record['이름']
        const churchTitle = record['직분'] || '성도' // Default if missing
        const statusRaw = record['상태'] || '정대원' // Default if missing

        // Optional Phone & BirthDate
        const phone = record['전화번호'] || record['phone'] || null
        const birthDate = record['생년월일'] || record['생일'] || record['birth'] || null

        const part = PartMapping[koreanPart] || koreanPart // Fallback

        // Role Logic
        let role = 'Regular'
        let isActive = true

        if (statusRaw && statusRaw.includes('솔리스트')) {
            role = 'Soloist'
        } else if (statusRaw && statusRaw.includes('휴식')) {
            role = 'Resting'
        } else if (statusRaw && (statusRaw.includes('제적') || statusRaw.includes('탈퇴') || statusRaw.includes('소천'))) {
            isActive = false
        } else if (statusRaw && (statusRaw.includes('신입') || statusRaw === 'New')) {
            role = 'New'
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
                phone,
                birthDate,
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
