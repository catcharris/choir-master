import prisma from '@/lib/prisma'
import AttendanceList from '@/components/AttendanceList'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AttendancePage({
    params,
    searchParams
}: {
    params: Promise<{ part: string }>;
    searchParams: Promise<{ date?: string }>;
}) {
    const { part } = await params
    const { date } = await searchParams
    const decodedPart = decodeURIComponent(part)

    // Handling composite parts logic
    let targetParts: string[] = [decodedPart]
    if (decodedPart === 'Soprano B') {
        targetParts = ['Soprano B', 'Soprano B+']
    } else if (decodedPart === 'Alto A') {
        // Just in case, future extensibility
    }

    console.log(`[DEBUG] Fetching members for: "${decodedPart}". Target parts:`, targetParts);

    // Date handling: query param or current server date
    const targetDate = date ? new Date(date) : new Date()
    // Validate date
    if (isNaN(targetDate.getTime())) {
        // Fallback if invalid date
        targetDate.setTime(Date.now())
    }

    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    const members = await prisma.member.findMany({
        where: {
            part: { in: targetParts },
            isActive: true,
        },
        include: {
            attendance: {
                where: {
                    date: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                },
                select: {
                    id: true,
                    status: true
                }
            }
        },
        orderBy: {
            name: 'asc'
        }
    })

    // Sort members: Soloist first
    const sortedMembers = members.sort((a, b) => {
        // Logic: Soloist top, then Regular, New
        const roleOrder: Record<string, number> = { 'Soloist': 1, 'Regular': 2, 'New': 3, 'Resting': 4 };
        const roleA = roleOrder[a.role] || 99;
        const roleB = roleOrder[b.role] || 99;

        if (roleA !== roleB) return roleA - roleB;
        return a.name.localeCompare(b.name); // Then name
    });

    const presentCount = members.filter(m => {
        const status = m.attendance?.[0]?.status
        // DB stores 'P' for Present, 'L' for Late. Both should count as attended.
        return status === 'P' || status === 'L'
    }).length

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 pb-20">
            <header className="mb-6 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur-md z-20 py-4 -mt-4 border-b border-slate-800">
                <Link href="/dashboard" className="text-slate-400 hover:text-white flex items-center gap-2 font-medium px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors">
                    ← 뒤로가기
                </Link>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-yellow-400">
                    {decodedPart}
                </h1>
                <div className="w-auto text-right text-xs text-slate-500 font-mono bg-slate-800 px-2 py-1 rounded border border-slate-700">
                    {presentCount} / {members.length} 명
                </div>
            </header>

            <AttendanceList
                members={sortedMembers}
                part={decodedPart}
                initialDate={targetDate.toISOString()}
            />
        </div>
    )
}
