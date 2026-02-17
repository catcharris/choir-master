'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'

const prisma = new PrismaClient()

// Delete all attendance records
export async function resetAttendance(password: string) {
    const adminPassword = process.env.ADMIN_PASSWORD || '0000'

    if (password !== adminPassword) {
        throw new Error("관리자 비밀번호가 일치하지 않습니다.")
    }

    try {
        await prisma.attendance.deleteMany({})

        revalidatePath('/dashboard')
        revalidatePath('/reports')
        revalidatePath('/attendance/[part]')

        return { success: true, message: "모든 출석 데이터가 초기화되었습니다." }
    } catch (error: any) {
        console.error("Reset Error:", error)
        throw new Error("초기화 중 오류가 발생했습니다.")
    }
}

export async function getBackupData() {
    try {
        const members = await prisma.member.findMany({
            orderBy: [
                { part: 'asc' },
                { name: 'asc' }
            ]
        })

        const attendance = await prisma.attendance.findMany({
            orderBy: { date: 'desc' },
            include: {
                member: {
                    select: {
                        name: true,
                        part: true
                    }
                }
            }
        })

        const flatAttendance = attendance.map(a => ({
            date: a.date.toISOString().split('T')[0],
            name: a.member.name,
            part: a.member.part,
            status: a.status,
            checkTime: a.checkTime ? a.checkTime.toISOString() : ''
        }))

        return { members: members, attendance: flatAttendance }
    } catch (error: any) {
        console.error("Backup Error:", error)
        throw new Error("백업 데이터 조회 중 오류가 발생했습니다.")
    }
}
