'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'

const prisma = new PrismaClient()

// Server Action for Member Management

// 1. Add New Member
export async function addMember(data: {
    name: string;
    part: string;
    churchTitle: string;
    role: string;
    phone?: string;
    birthDate?: string;
}) {
    // Basic validation
    if (!data.name || !data.part) {
        throw new Error("Name and Part are required")
    }

    const member = await prisma.member.create({
        data: {
            name: data.name,
            part: data.part,
            churchTitle: data.churchTitle || '성도',
            role: data.role || 'New',
            phone: data.phone || null,
            birthDate: data.birthDate || null,
            isActive: true
        }
    })

    revalidatePath('/dashboard')
    revalidatePath('/attendance/[part]')
    revalidatePath('/reports')
    return member
}

// 2. Update Member Info
export async function updateMember(id: number, data: {
    name?: string;
    part?: string;
    churchTitle?: string;
    role?: string;
    phone?: string;
    birthDate?: string;
    isActive?: boolean;
}) {
    const member = await prisma.member.update({
        where: { id },
        data: {
            ...data
        }
    })

    revalidatePath('/dashboard')
    revalidatePath('/attendance/[part]')
    revalidatePath('/reports')
    return member
}

// 3. Deactivate/Delete Member (Soft Delete preferred for history)
export async function deactivateMember(id: number, reason: string = 'WITHDRAWN') {
    // reason could be stored if we had a history table, but for now just toggle isActive
    // Maybe set role to 'Withdrawn'?
    // User requested "제적처리로 탈퇴된 명단 처리까지 매달 통계로 볼 수 있게".
    // This implies we need to track *when* they left.
    // The `updatedAt` field will track this change. 

    // But simply setting isActive=false might not be enough context.
    // Let's rely on updatedAt for the report month check.

    await prisma.member.update({
        where: { id },
        data: {
            isActive: false,
            // Maybe append reason to notes if existed?
        }
    })

    revalidatePath('/reports')
}
// 4. Get Birthday Members
export async function getBirthdayMembers(targetMonths: number[]) {
    // targetMonths: array of 1-indexed months (e.g. [1, 2] for Jan, Feb)

    // Fetch all active members
    const members = await prisma.member.findMany({
        where: { isActive: true },
        orderBy: { part: 'asc' } // or name
    }) as any[]

    // Filter by birthDate (YYMMDD)
    const birthdayList = members.filter(m => {
        if (!m.birthDate || m.birthDate.length !== 6) return false;
        const monthStr = m.birthDate.substring(2, 4);
        const month = parseInt(monthStr, 10);
        return targetMonths.includes(month);
    })

    // Sort by Month then Day
    birthdayList.sort((a, b) => {
        const dateA = a.birthDate?.substring(2, 6) || '9999';
        const dateB = b.birthDate?.substring(2, 6) || '9999';
        return dateA.localeCompare(dateB);
    })

    return birthdayList.map(m => ({
        id: m.id,
        name: m.name,
        part: m.part,
        birthDate: m.birthDate,
        day: m.birthDate?.substring(4, 6) // DD
    }));
}

// --- Attendance Actions ---

// 5. Get Attendance for a Part on specific Date
// Returns: List of members with their status for the given date (default: today)
export async function getMemberAttendanceStats(part: string, dateString: string) {
    // 1. Get Part Members (Active)
    const members = await prisma.member.findMany({
        where: {
            part: part,
            isActive: true
        },
        orderBy: { name: 'asc' }
    })

    // 2. Get Attendance Records for that Date
    // dateString format: "YYYY-MM-DD"
    // We need to match precise date or range depending on DB storage.
    // Assuming DB stores DateTime.
    const targetDateStart = new Date(dateString)
    targetDateStart.setHours(0, 0, 0, 0);

    const targetDateEnd = new Date(dateString)
    targetDateEnd.setHours(23, 59, 59, 999);

    const attendances = await prisma.attendance.findMany({
        where: {
            date: {
                gte: targetDateStart,
                lte: targetDateEnd
            },
            member: {
                part: part
            }
        }
    })

    // 3. Merge Data
    return members.map(m => {
        const todayRecord = attendances.find(a => a.memberId === m.id)
        return {
            ...m,
            todayStatus: todayRecord ? todayRecord.status : null // P, A, or null
        }
    })
}

// 6. Toggle Attendance
export async function toggleAttendance(memberId: number, dateObj: Date, status: string | null) {
    // status: 'P', 'A', 'L', or 'DELETE' (to remove record)

    // Safety check date
    const targetDate = new Date(dateObj)
    // Normalize time to noon to avoid timezone shift issues on day boundary
    targetDate.setHours(12, 0, 0, 0);

    // We want to upsert based on (memberId, date).
    // Prisma composite key is usually ID. But here we might check existence first.

    // Calculate Search Range for "That Day"
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Check existing record
    const existing = await prisma.attendance.findFirst({
        where: {
            memberId: memberId,
            date: {
                gte: startOfDay,
                lte: endOfDay
            }
        }
    })

    if (status === 'DELETE') {
        if (existing) {
            await prisma.attendance.delete({
                where: { id: existing.id }
            })
        }
    } else {
        if (existing) {
            await prisma.attendance.update({
                where: { id: existing.id },
                data: {
                    status: status!,
                    checkTime: new Date() // Update check time on modification
                }
            })
        } else {
            if (status) {
                await prisma.attendance.create({
                    data: {
                        memberId: memberId,
                        date: targetDate,
                        status: status!,
                        checkTime: new Date()
                    }
                })
            }
        }
    }

    revalidatePath('/attendance/[part]')
    revalidatePath('/reports')
}
