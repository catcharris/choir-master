'use server'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface PartReport {
    part: string;
    total: number;
    present: number;
    late: number;
    absent: number;
    rate: number;
    absentMembers: string[];
    lateMembers: string[];
}

export interface DailyReportData {
    date: string;
    totalMembers: number;
    totalPresent: number;
    totalLate: number; // Added Late
    attendanceRate: number;
    parts: PartReport[];
}

export async function getDailyReport(dateString: string): Promise<DailyReportData> {
    // 1. Determine Date Range
    const targetDateStart = new Date(dateString)
    targetDateStart.setHours(0, 0, 0, 0);

    const targetDateEnd = new Date(dateString)
    targetDateEnd.setHours(23, 59, 59, 999);

    // 2. Fetch All Active Members
    const members = await prisma.member.findMany({
        where: { isActive: true },
        orderBy: { part: 'asc' }
    })

    // 3. Fetch Attendance for that Date
    const attendances = await prisma.attendance.findMany({
        where: {
            date: {
                gte: targetDateStart,
                lte: targetDateEnd
            }
        },
        include: {
            member: true
        }
    })

    // 4. Group by Part
    // We already have members list, so we iterate parts from there or predefined list.
    // Let's use unique parts from members to be dynamic.
    const uniqueParts = Array.from(new Set(members.map(m => m.part))).sort()

    const partsData: PartReport[] = uniqueParts.map(part => {
        const partMembers = members.filter(m => m.part === part)
        const total = partMembers.length

        let presentCount = 0
        let lateCount = 0
        let absentCount = 0
        const absentNames: string[] = []
        const lateNames: string[] = []

        partMembers.forEach(member => {
            const record = attendances.find(a => a.memberId === member.id)
            if (record) {
                if (record.status === 'P') presentCount++
                else if (record.status === 'L') {
                    lateCount++
                    lateNames.push(member.name)
                } else if (record.status === 'A') {
                    absentCount++
                    absentNames.push(member.name)
                }
            } else {
                // No record = Unchecked (Treat as Absent or separate?)
                // Usually for daily report, unchecked means absent or late check.
                // Let's treat as 'Unchecked' but for simple report, maybe count as Absent?
                // User requirement: "Unchecked should be treated as absent for statistics"
                absentCount++
                absentNames.push(member.name)
            }
        })

        // Present includes LATE for rate calculation? Usually yes.
        // Let's count Late as Present for Rate, but display separately.
        const effectivePresent = presentCount + lateCount;
        const rate = total > 0 ? Math.round((effectivePresent / total) * 100) : 0

        return {
            part,
            total,
            present: presentCount,
            late: lateCount,
            absent: absentCount,
            rate,
            absentMembers: absentNames,
            lateMembers: lateNames
        }
    })

    // 5. Aggregate Totals
    const totalMembers = members.length
    const totalPresent = partsData.reduce((sum, p) => sum + p.present, 0)
    const totalLate = partsData.reduce((sum, p) => sum + p.late, 0)
    const effectiveTotalPresent = totalPresent + totalLate
    const overallRate = totalMembers > 0 ? Math.round((effectiveTotalPresent / totalMembers) * 100) : 0

    return {
        date: dateString,
        totalMembers,
        totalPresent, // P only
        totalLate,    // L only
        attendanceRate: overallRate, // (P+L)/Total
        parts: partsData
    }
}
