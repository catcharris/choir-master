'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function toggleAttendance(memberId: number, date: Date, status: string, checkerId?: number) {
    // Check if an attendance record exists for this member on this date
    // (No change here yet)o define "date" boundaries. Usually start of day to end of day.
    // Or simply lookup by date string YYYY-MM-DD if we store it as DateTime but treat as date.

    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const existing = await prisma.attendance.findFirst({
        where: {
            memberId: memberId,
            date: {
                gte: startOfDay,
                lte: endOfDay,
            }
        }
    })

    if (existing) {
        if (status === 'DELETE') {
            await prisma.attendance.delete({
                where: { id: existing.id }
            })
        } else {
            await prisma.attendance.update({
                where: { id: existing.id },
                data: { status, checkTime: new Date() }
            })
        }
    } else {
        if (status !== 'DELETE') {
            await prisma.attendance.create({
                data: {
                    memberId,
                    date: startOfDay, // Normalize to start of day for the record date
                    status,
                    checkTime: new Date(),
                    checkerId,
                }
            })
        }
    }

    revalidatePath('/attendance/[part]')
}

export async function getAttendanceStats(part: string, date: Date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const members = await prisma.member.findMany({
        where: { part, isActive: true }
    })

    const attendance = await prisma.attendance.findMany({
        where: {
            member: { part },
            date: { gte: startOfDay, lte: endOfDay },
            status: 'PRESENT'
        }
    })

    return {
        total: members.length,
        present: attendance.length,
        rate: members.length > 0 ? (attendance.length / members.length) * 100 : 0
    }
}
