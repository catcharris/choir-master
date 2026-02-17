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
