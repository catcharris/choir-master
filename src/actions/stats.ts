'use server'

import { PrismaClient } from '@prisma/client'
import { format, getDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'

const prisma = new PrismaClient()

// ... (existing imports)

// Fetch Soloist Stats (Specifically Saturday Counts for Payroll)
export async function getSoloistStats(year: number, month: number) {
    const start = startOfMonth(new Date(year, month - 1))
    const end = endOfMonth(new Date(year, month - 1))

    const soloists = await prisma.member.findMany({
        where: { role: 'Soloist', isActive: true },
        orderBy: { part: 'asc' }
    })

    const stats = await Promise.all(soloists.map(async (s) => {
        const attendance = await prisma.attendance.findMany({
            where: {
                memberId: s.id,
                date: { gte: start, lte: end },
                status: { in: ['PRESENT', 'LATE'] }
            }
        })

        // Count Saturdays
        const saturdayCount = attendance.filter(a => getDay(new Date(a.date)) === 6).length
        const sundayCount = attendance.filter(a => getDay(new Date(a.date)) === 0).length

        return {
            id: s.id,
            name: s.name,
            part: s.part,
            saturdayCount, // Crucial for pay
            sundayCount,
            total: saturdayCount + sundayCount
        }
    }))

    return stats
}

// Fetch Yearly Overview (Trend)
export async function getYearlyReport(year: number, part?: string) {
    const months = Array.from({ length: 12 }, (_, i) => i + 1)

    // This might be heavy if done naively. Optimized query would be better but Prisma groupBy is fine.
    // For now, let's iterate months. 

    const monthlyStats = await Promise.all(months.map(async (m) => {
        const start = startOfMonth(new Date(year, m - 1))
        const end = endOfMonth(new Date(year, m - 1))

        // Count total attendance ticks
        const whereClause: any = {
            date: { gte: start, lte: end },
            status: { in: ['PRESENT', 'LATE'] }
        }

        if (part) {
            whereClause.member = { part: part }
        }

        const attendances = await prisma.attendance.count({
            where: whereClause
        })

        // Denominator approximation (Active Members * Service Days)
        // This is tricky because members change.
        // Let's use current active members as approximation for trend line?
        // Or just show "Total Attendance Count" which is absolute.
        // Rate is better.

        // Simple logic: Get rough rate
        // We can reuse getMonthlyReport logic but simplified
        return {
            month: m,
            count: attendances
        }
    }))

    return monthlyStats
}

// ... (keep existing getMonthlyReport)
export async function getMemberAttendanceStats(memberId: number, year: number, month: number) {
    // 0. Fetch Member Info
    const member = await prisma.member.findUnique({
        where: { id: memberId }
    })

    if (!member) throw new Error("Member not found")

    // 1. Calculate Date Range for the given month
    // Note: Month input is 0-indexed (0=Jan) like JS Date? 
    // Let's assume input is 1-indexed for user-friendliness, but convert to JS Date (0-indexed).
    // Actually, `date-fns` usually wants Date objects.
    const start = startOfMonth(new Date(year, month - 1))
    const end = endOfMonth(new Date(year, month - 1))

    // 2. Fetch Attendance Records for this month
    const attendance = await prisma.attendance.findMany({
        where: {
            memberId: memberId,
            date: {
                gte: start,
                lte: end
            }
        }
    })

    // 3. Count Total Possible Days (Sat & Sun only)
    const allDays = eachDayOfInterval({ start, end })
    const saturdays = allDays.filter(day => getDay(day) === 6)
    const sundays = allDays.filter(day => getDay(day) === 0)

    const possibleSat = saturdays.length
    const possibleSun = sundays.length

    // 4. Calculate Attendance Counts
    const attendedSat = attendance.filter(a => {
        const d = new Date(a.date)
        return getDay(d) === 6 && (a.status === 'PRESENT' || a.status === 'LATE')
    }).length

    const attendedSun = attendance.filter(a => {
        const d = new Date(a.date)
        return getDay(d) === 0 && (a.status === 'PRESENT' || a.status === 'LATE')
    }).length

    const totalAttended = attendedSat + attendedSun
    const totalPossible = possibleSat + possibleSun

    return {
        member: {
            name: member.name,
            part: member.part,
            role: member.role,
            churchTitle: member.churchTitle,
            phone: member.phone,
            birthDate: member.birthDate
        },
        month: `${year}-${month}`,
        totalRate: totalPossible > 0 ? Math.round((totalAttended / totalPossible) * 100) : 0,
        satRate: possibleSat > 0 ? Math.round((attendedSat / possibleSat) * 100) : 0,
        sunRate: possibleSun > 0 ? Math.round((attendedSun / possibleSun) * 100) : 0,
        stats: {
            sat: { attended: attendedSat, total: possibleSat },
            sun: { attended: attendedSun, total: possibleSun }
        },
        attendedDates: attendance // Return raw records or simplified
            .filter(a => a.status === 'PRESENT' || a.status === 'LATE')
            .map(a => format(new Date(a.date), 'yyyy-MM-dd'))
    }
}

// Fetch Executive Monthly Report (All Parts)
export async function getMonthlyReport(year: number, month: number) {
    const start = startOfMonth(new Date(year, month - 1))
    const end = endOfMonth(new Date(year, month - 1))

    // 1. Get All Active Members
    const members = await prisma.member.findMany({
        where: { isActive: true }
    })

    // 2. Get All Withdrawn Members within this month (approximately) or just all inactive for report?
    // User wants "Withdrawn List". Usually means recent ones. But let's fetch all inactive and filter by updatedAt if needed for precise monthly reports.
    // For now, let's list all recently inactive or just use existing logic.
    // To match user request "Withdrawn/Expelled Stats", let's keep list logic.
    const withdrawnMembers = await prisma.member.findMany({
        where: { isActive: false }
    })

    // 3. Get All Attendance for the month
    const totalAttendance = await prisma.attendance.findMany({
        where: {
            date: { gte: start, lte: end },
            status: { in: ['PRESENT', 'LATE', 'P', 'L'] }
        },
        include: { member: true }
    })

    const allDays = eachDayOfInterval({ start, end })
    const saturdays = allDays.filter(d => getDay(d) === 6)
    const sundays = allDays.filter(d => getDay(d) === 0)
    const satCount = saturdays.length
    const sunCount = sundays.length

    // 4. Calculate Stats by Part
    const parts = ['Soprano A', 'Soprano B', 'Soprano B+', 'Alto A', 'Alto B', 'Tenor', 'Bass']
    const partStats = parts.map(part => {
        const partMembers = members.filter(m => m.part === part)
        const totalMembers = partMembers.length // Registered

        const activeSingers = partMembers.filter(m => m.role !== 'Resting')
        const restingSingers = partMembers.filter(m => m.role === 'Resting')
        const newSingers = partMembers.filter(m => m.role === 'New') // New members are usually active too

        // Statistics
        const partAttendance = totalAttendance.filter(a => a.member.part === part)

        // Split Sat/Sun
        const attendSat = partAttendance.filter(a => getDay(new Date(a.date)) === 6).length
        const attendSun = partAttendance.filter(a => getDay(new Date(a.date)) === 0).length

        // Denominators (Active Members * Days)
        // Note: New members join mid-month, but for simple stats we use current active count.
        const effectiveActiveCount = activeSingers.length

        const slotsSat = effectiveActiveCount * satCount
        const slotsSun = effectiveActiveCount * sunCount
        const totalSlots = slotsSat + slotsSun
        const attendCount = attendSat + attendSun

        return {
            part,
            totalMembers,
            activeMembers: effectiveActiveCount,
            restingMembers: restingSingers.length,
            newMembers: newSingers.length,
            attendCount,
            attendSat,
            attendSun,
            rate: totalSlots > 0 ? Math.round((attendCount / totalSlots) * 100) : 0,
            rateSat: slotsSat > 0 ? Math.round((attendSat / slotsSat) * 100) : 0,
            rateSun: slotsSun > 0 ? Math.round((attendSun / slotsSun) * 100) : 0
        }
    })

    // 5. Overall Stats
    const totalActiveMembers = partStats.reduce((acc, p) => acc + p.activeMembers, 0)
    const totalRestingMembers = partStats.reduce((acc, p) => acc + p.restingMembers, 0)
    const totalNewMembers = partStats.reduce((acc, p) => acc + p.newMembers, 0)
    const totalRegistered = partStats.reduce((acc, p) => acc + p.totalMembers, 0)
    const totalAttendCount = partStats.reduce((acc, p) => acc + p.attendCount, 0)

    // Weighted Average Rates
    // Sum of all numerators / Sum of all denominators is more accurate than average of averages
    const totalSlotsSat = partStats.reduce((acc, p) => acc + (p.activeMembers * satCount), 0)
    const totalSlotsSun = partStats.reduce((acc, p) => acc + (p.activeMembers * sunCount), 0)
    const totalAttendSat = partStats.reduce((acc, p) => acc + p.attendSat, 0)
    const totalAttendSun = partStats.reduce((acc, p) => acc + p.attendSun, 0)

    const overallRate = (totalSlotsSat + totalSlotsSun) > 0
        ? Math.round((totalAttendCount / (totalSlotsSat + totalSlotsSun)) * 100)
        : 0

    const overallRateSat = totalSlotsSat > 0
        ? Math.round((totalAttendSat / totalSlotsSat) * 100)
        : 0

    const overallRateSun = totalSlotsSun > 0
        ? Math.round((totalAttendSun / totalSlotsSun) * 100)
        : 0

    return {
        overall: {
            totalRegistered,
            totalActive: totalActiveMembers,
            totalResting: totalRestingMembers,
            totalNew: totalNewMembers,
            rate: overallRate,
            rateSat: overallRateSat,
            rateSun: overallRateSun
        },
        byPart: partStats,
        withdrawnList: withdrawnMembers.map(m => ({ name: m.name, part: m.part, date: m.updatedAt })),
        restingList: members.filter(m => m.role === 'Resting').map(m => ({ name: m.name, part: m.part })),
        newMemberList: members.filter(m => m.role === 'New').map(m => ({ name: m.name, part: m.part }))
    }
}
// Fetch Monthly Stats for a Specific Part (for Part Leaders)
export async function getPartMonthlyStats(part: string, year: number, month: number) {
    const start = startOfMonth(new Date(year, month - 1))
    const end = endOfMonth(new Date(year, month - 1))

    // Handle "Soprano B" case (includes "Soprano B+")
    let parts = [part]
    if (part === 'Soprano B') {
        parts.push('Soprano B+')
    }

    const members = await prisma.member.findMany({
        where: {
            part: { in: parts },
            isActive: true
        },
        orderBy: { name: 'asc' }
    })

    // Fetch all attendance for these members in this range
    const attendance = await prisma.attendance.findMany({
        where: {
            memberId: { in: members.map(m => m.id) },
            date: { gte: start, lte: end }
        }
    })

    // Calculate Service Days (Sat & Sun)
    const allDays = eachDayOfInterval({ start, end })
    const serviceDays = allDays
        .filter(d => getDay(d) === 0 || getDay(d) === 6)
        .map(d => format(d, 'yyyy-MM-dd'))

    // Map to structure
    const stats = members.map(member => {
        const records = attendance.filter(a => a.memberId === member.id)

        // Create a map of date -> status
        const attendanceMap: Record<string, string> = {}
        records.forEach(r => {
            const dateStr = format(new Date(r.date), 'yyyy-MM-dd')
            attendanceMap[dateStr] = r.status
        })

        const attendedCount = records.filter(a => ['PRESENT', 'LATE', 'P', 'L'].includes(a.status)).length
        const rate = serviceDays.length > 0 ? Math.round((attendedCount / serviceDays.length) * 100) : 0

        return {
            id: member.id,
            name: member.name,
            role: member.role,
            attendanceMap, // { '2026-02-01': 'PRESENT', ... }
            attendedCount,
            rate
        }
    })

    return {
        part,
        year,
        month,
        serviceDays,
        members: stats
    }
}
