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
