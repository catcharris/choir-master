import AdminMemberView from '@/components/AdminMemberView'
import { getAllMembers } from '@/actions/members'
import { headers } from 'next/headers'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminMemberPage({ searchParams }: { searchParams: { back?: string } }) {
    const members = await getAllMembers()
    const backUrl = searchParams.back || '/dashboard'

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
            <header className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center sticky top-0 z-50 shadow-md">
                <Link href={backUrl} className="text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium">
                    ← 뒤로
                </Link>
                <div className="text-center">
                    <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-yellow-500">
                        대원 관리
                    </h1>
                </div>
                <div className="w-10"></div>
            </header>

            <main className="flex-1">
                <AdminMemberView initialMembers={members} backUrl={backUrl} />
            </main>
        </div>
    )
}
