'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// Fetch all notices
export async function getNotices(limit = 10) {
    return await prisma.notice.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
    })
}

// Create new notice
export async function createNotice(data: {
    title: string;
    content: string;
    category?: string;
    link?: string;
}) {
    if (!data.title || !data.content) {
        throw new Error("Title and Content are required")
    }

    const notice = await prisma.notice.create({
        data: {
            title: data.title,
            content: data.content,
            category: data.category || 'NOTICE',
            link: data.link || null,
        }
    })

    revalidatePath('/')
    revalidatePath('/dashboard')
    return notice
}

// Update notice
export async function updateNotice(id: number, data: {
    title: string;
    content: string;
    category?: string;
    link?: string;
}) {
    if (!id) throw new Error("Notice ID is required")
    if (!data.title || !data.content) {
        throw new Error("Title and Content are required")
    }

    const notice = await prisma.notice.update({
        where: { id },
        data: {
            title: data.title,
            content: data.content,
            category: data.category || 'NOTICE',
            link: data.link || null,
        }
    })

    revalidatePath('/')
    revalidatePath('/dashboard')
    return notice
}

// Delete notice
export async function deleteNotice(id: number) {
    await prisma.notice.delete({
        where: { id }
    })

    revalidatePath('/')
    revalidatePath('/dashboard')
}
