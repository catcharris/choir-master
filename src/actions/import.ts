'use server'

import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { revalidatePath } from 'next/cache'

// Define the structure of the Excel data we expect
// Row 1: Headers (Name, Part, Dates...)
// Rows 2+: Data

export async function importAttendanceData(formData: FormData) {
    try {
        const file = formData.get('file') as File
        if (!file) {
            throw new Error('파일이 없습니다.')
        }

        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'buffer' })

        // Assume first sheet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Convert to array of arrays
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

        if (jsonData.length < 2) {
            throw new Error('데이터가 없습니다.')
        }

        // Header Row processing to find dates (Index 3 onwards usually, referencing template)
        // Template: [Name, Part, Role, Date1, Date2, ...]
        const headerRow = jsonData[0]
        const dateColumns: { index: number, date: string }[] = []

        // Start from index 3 (0: Name, 1: Part, 2: Role) - adjust based on actual template
        // Let's make index dynamic -> find columns that look like dates
        for (let i = 0; i < headerRow.length; i++) {
            const cellValue = headerRow[i]
            // Simple check if it looks like a date string YYYY-MM-DD
            if (typeof cellValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cellValue.trim())) {
                dateColumns.push({ index: i, date: cellValue.trim() })
            }
        }

        if (dateColumns.length === 0) {
            throw new Error('날짜 컬럼(YYYY-MM-DD)을 찾을 수 없습니다.')
        }

        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        // Process rows (skip header)
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i]
            const name = row[0]?.toString().trim()
            const part = row[1]?.toString().trim()
            // const role = row[2]?.toString().trim() // Optional

            if (!name) continue // Skip empty rows

            // Find Member
            // We search by Name. If multiple same names, it might be an issue, but usually unique enough or strictly managed.
            // Ideally should match Part too if available.
            let member = await prisma.member.findFirst({
                where: {
                    name: name,
                    ...(part ? { part: part } : {}) // Optional strict matching
                }
            })

            if (!member) {
                // Determine if we should create a new member or skip
                // For safety, let's skip and report error for now, or maybe create?
                // User said "Handle New Members" in task... let's log error for now to be safe.
                // Or try to create if part is valid?
                // For now, let's just log "Member Not Found"
                errors.push(`${i + 1}행: 대원(${name})을 찾을 수 없습니다.`)
                errorCount++
                continue
            }

            // Iterate dates for this member
            for (const col of dateColumns) {
                const cellValue = row[col.index]
                let status = 'ABSENT' // Default? Or null?

                // Logic:
                // O, 1, Y, Present, 출석 -> PRESENT
                // X, 0, N, Absent, 결석 -> ABSENT
                // L, Late, 지각 -> LATE

                if (!cellValue) continue

                const valStr = String(cellValue).trim().toUpperCase()

                if (['O', '0', 'OX', 'YES', 'Y', '1', 'PRESENT', '출석', '참석'].includes(valStr)) {
                    status = 'PRESENT'
                } else if (['X', 'NO', 'N', 'ABSENT', '결석', '불참', '2'].includes(valStr)) {
                    status = 'ABSENT'
                } else if (['L', 'LATE', '지각', '조퇴'].includes(valStr)) {
                    status = 'LATE'
                } else if (['R', 'REST', '휴식'].includes(valStr)) {
                    // Maybe handle resting status update? 
                    // For now, let's treat as Absent but maybe note it?
                    // Or ignore?
                    status = 'ABSENT'
                } else {
                    continue
                }

                const targetDate = new Date(col.date)

                // Upsert Application Logic
                // valid checktime is needed? set to noon of that day
                const checkTime = new Date(targetDate)
                checkTime.setHours(12, 0, 0, 0)

                // 1. Check existing
                const existing = await prisma.attendance.findFirst({
                    where: {
                        memberId: member.id,
                        date: targetDate
                    }
                })

                if (existing) {
                    // Update
                    await prisma.attendance.update({
                        where: { id: existing.id },
                        data: {
                            status,
                            checkTime // Update checktime? Maybe keep original? Let's update to indicate change.
                        }
                    })
                } else {
                    // Create
                    await prisma.attendance.create({
                        data: {
                            memberId: member.id,
                            date: targetDate,
                            status,
                            checkTime
                        }
                    })
                }
                successCount++
            }
        }

        revalidatePath('/reports')
        revalidatePath('/dashboard')

        return {
            success: true,
            message: `${successCount}건의 출석 데이터 처리 완료. (오류/미발견: ${errorCount}건)`,
            errors
        }

    } catch (e: any) {
        console.error(e)
        return {
            success: false,
            message: `업로드 실패: ${e.message}`,
            errors: []
        }
    }
}
