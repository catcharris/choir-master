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

// 3.5 Completely Delete Member (For cleanup)
export async function deleteMember(id: number) {
    // 1. Delete Attendance First
    await prisma.attendance.deleteMany({
        where: { memberId: id }
    })

    // 2. Delete Member
    await prisma.member.delete({
        where: { id }
    })

    revalidatePath('/dashboard')
    revalidatePath('/attendance/[part]')
    revalidatePath('/reports')
    revalidatePath('/admin/members')
}

// 3.6 Get All Members for Admin
export async function getAllMembers() {
    return await prisma.member.findMany({
        orderBy: [
            { part: 'asc' },
            { name: 'asc' }
        ]
    })
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
    // We parse YYYY-MM-DD and create UTC start/end range

    let year, month, day;
    if (dateString.includes('-')) {
        const parts = dateString.split('-').map(Number);
        year = parts[0];
        month = parts[1] - 1;
        day = parts[2];
    } else {
        // Safe fallback
        const d = new Date(dateString);
        year = d.getFullYear();
        month = d.getMonth();
        day = d.getDate();
    }

    const targetDateStart = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const targetDateEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

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
export async function toggleAttendance(memberId: number, dateInput: string | Date, status: string | null) {
    // We expect dateInput to be "YYYY-MM-DD" string ideally. 
    // If it's a Date object, it might have timezone issues, so we prefer string.

    let year, month, day;

    if (typeof dateInput === 'string') {
        // If format is YYYY-MM-DD
        if (dateInput.includes('-') && dateInput.length >= 10) {
            const parts = dateInput.substring(0, 10).split('-').map(Number);
            year = parts[0];
            month = parts[1] - 1; // JS Month is 0-indexed
            day = parts[2];
        } else {
            // Fallback try parse
            const d = new Date(dateInput);
            year = d.getFullYear();
            month = d.getMonth();
            day = d.getDate();
        }
    } else {
        // Warning: using Date object directly might use server local time or UTC of the object
        // Assuming the Date object is correct for the intended day
        year = dateInput.getFullYear();
        month = dateInput.getMonth();
        day = dateInput.getDate();
    }

    // Construct dates using UTC to avoid any server local time offset
    // 00:00:00 UTC
    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    // 23:59:59 UTC
    const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

    // Save at Noon UTC to be safe
    const saveDate = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));

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
                        date: saveDate,
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
