'use server'

import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Status mapping helper
function mapStatus(raw: string): string | null {
    if (!raw) return null;
    const s = raw.trim().toUpperCase();
    if (['출석', 'PRESENT', 'O', '1'].includes(s)) return 'PRESENT';
    if (['지각', 'LATE', 'L'].includes(s)) return 'LATE';
    if (['결석', 'ABSENT', 'X', '0'].includes(s)) return 'ABSENT';
    return null;
}

export async function bulkUploadAttendance(rows: any[]) {
    if (!rows || rows.length === 0) return { success: 0, failed: 0, errors: ["데이터가 없습니다."] }

    let successCount = 0
    let failedCount = 0
    let errorMessages: string[] = []

    for (const row of rows) {
        const name = row['이름'] || row['name']
        const dateStr = row['날짜'] || row['date']
        const statusRaw = row['상태'] || row['status']
        const part = row['파트'] || row['part'] // Optional

        if (!name || !dateStr || !statusRaw) {
            // Probably header or empty row
            continue
        }

        try {
            // 1. Validate Date (Simple YYYY-MM-DD)
            // Use local time noon to avoid TZ shifts
            const dateParts = dateStr.split('-')
            if (dateParts.length !== 3) {
                throw new Error(`날짜 형식 오류 (${dateStr}) - YYYY-MM-DD 형식필요`)
            }
            const year = parseInt(dateParts[0])
            const month = parseInt(dateParts[1]) - 1
            const day = parseInt(dateParts[2])
            const targetDate = new Date(year, month, day, 12, 0, 0) // Noon local time

            if (isNaN(targetDate.getTime())) {
                throw new Error(`유효하지 않은 날짜 (${dateStr})`)
            }

            // 2. Map Status
            const status = mapStatus(statusRaw)
            if (!status) {
                throw new Error(`알 수 없는 상태값: ${statusRaw}`)
            }

            // 3. Find Member
            // Find by name first
            const candidates = await prisma.member.findMany({
                where: { name: name }
            })

            let member = null

            if (candidates.length === 0) {
                throw new Error(`대원을 찾을 수 없음: ${name}`)
            } else if (candidates.length === 1) {
                member = candidates[0]
            } else {
                // Duplicate names found
                if (part) {
                    // Startswith match for flexibility (e.g. "Sop" matches "Soprano A")
                    member = candidates.find(c => c.part.startsWith(part) || c.part === part)
                    if (!member) {
                        throw new Error(`동명이인(${name}) 중 파트(${part}) 일치자 없음. 후보: ${candidates.map(c => c.part).join(', ')}`)
                    }
                } else {
                    throw new Error(`동명이인(${name}) 발생. 파트 정보(Soprano A etc)를 추가해주세요.`)
                }
            }

            // 4. Update/Create Attendance
            // We need a range query to find existing record for that day
            const startOfDay = new Date(year, month, day, 0, 0, 0)
            const endOfDay = new Date(year, month, day, 23, 59, 59)

            const existing = await prisma.attendance.findFirst({
                where: {
                    memberId: member.id,
                    date: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                }
            })

            if (existing) {
                await prisma.attendance.update({
                    where: { id: existing.id },
                    data: { status }
                })
            } else {
                await prisma.attendance.create({
                    data: {
                        memberId: member.id,
                        date: targetDate, // Store noon time
                        status
                    }
                })
            }

            successCount++

        } catch (e: any) {
            failedCount++
            errorMessages.push(`[${name}, ${dateStr}] ${e.message}`)
        }
    }

    return { success: successCount, failed: failedCount, errors: errorMessages }
}
