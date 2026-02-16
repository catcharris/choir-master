
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const start = new Date(2026, 1, 1) // Feb 1
    const end = new Date(2026, 2, 0) // Feb 28

    const att = await prisma.attendance.findMany({
        where: {
            date: { gte: start, lte: end }
        }
    })

    console.log('Total Count:', att.length)

    // Status Distribution
    const statusCounts = att.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    console.log('Status Counts:', statusCounts)

    // Date Distribution
    const dates = att.map(a => a.date.toISOString().split('T')[0])
    const dateCounts = dates.reduce((acc, curr) => {
        acc[curr] = (acc[curr] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    console.log('Date Counts:', dateCounts)
}

main()
