'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import NoticeBoard from '@/components/NoticeBoard'
import DashboardHeader from '@/components/DashboardHeader'

interface DashboardContentProps {
    notices: any[]
}

const PARTS = [
    { name: "Soprano A", color: "bg-amber-500", icon: "🎵" },
    { name: "Soprano B", color: "bg-amber-600", icon: "🎵" },
    { name: "Soprano B+", color: "bg-orange-500", icon: "🎵" },
    { name: "Alto A", color: "bg-rose-500", icon: "🎼" },
    { name: "Alto B", color: "bg-rose-600", icon: "🎼" },
    { name: "Tenor", color: "bg-sky-500", icon: "🎹" },
    { name: "Bass", color: "bg-indigo-600", icon: "🎻" },
]

// Admin sees combined list
const ADMIN_PARTS = [
    { name: "Soprano A", color: "bg-amber-500", icon: "🎵", label: "Sop A" },
    { name: "Soprano B", color: "bg-orange-600", icon: "🎵", label: "Sop B & B+" },
    { name: "Alto A", color: "bg-rose-500", icon: "🎼", label: "Alto A" },
    { name: "Alto B", color: "bg-rose-600", icon: "🎼", label: "Alto B" },
    { name: "Tenor", color: "bg-sky-500", icon: "🎹", label: "Tenor" },
    { name: "Bass", color: "bg-indigo-600", icon: "🎻", label: "Bass" },
]

export default function DashboardContent({ notices }: DashboardContentProps) {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        if (!loading && !user) {
            router.push('/')
        }
    }, [loading, user, router])

    if (!mounted || loading) return <div className="min-h-screen bg-slate-900 text-white p-6 flex justify-center items-center">로딩중...</div>
    if (!user) return null // Will redirect

    const isAdmin = user.role === 'ADMIN'
    const visibleParts = isAdmin ? ADMIN_PARTS : PARTS.filter(p => p.name === user.part).map(p => ({ ...p, label: p.name }))

    return (
        <div className={`min-h-screen bg-slate-900 text-white ${!isAdmin ? 'h-[100dvh] flex flex-col px-3 pt-2 overflow-hidden' : 'p-3 pb-32 md:p-6 md:pb-24'}`}>
            <div className="flex-shrink-0 mb-2">
                <DashboardHeader />
            </div>

            <div className={`gap-2 max-w-lg mx-auto w-full flex flex-col ${!isAdmin ? 'flex-1 min-h-0 pb-2' : ''}`}>
                {/* Part Links Area */}
                <div className={`${!isAdmin ? 'flex-shrink-0 order-1 mb-2' : 'order-2 mb-2'}`}>
                    {!isAdmin && (
                        <h2 className="text-lg font-bold text-slate-300 mb-2 px-1 flex items-center gap-2">
                            <span>👋 안녕하세요, {user?.part} 파트장님!</span>
                        </h2>
                    )}
                    {isAdmin && (
                        <div className="flex items-center justify-between mb-2 px-1 mt-2">
                            <h2 className="text-lg font-bold text-slate-300">
                                출석부 (파트 선택)
                            </h2>
                            <Link
                                href="/admin/members"
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-amber-500 rounded-lg border border-amber-500/30 text-xs font-bold hover:bg-slate-700 transition-all shadow-sm"
                            >
                                <span className="text-base">👥</span>
                                <span>대원 관리</span>
                            </Link>
                        </div>
                    )}

                    <div className={`grid gap-3 ${isAdmin ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
                        {visibleParts.map((p) => (
                            <Link
                                key={p.name}
                                href={`/attendance/${p.name}`}
                                className={`
                                    group relative overflow-hidden rounded-xl bg-slate-800 text-left transition-all 
                                    hover:bg-slate-750 hover:shadow-lg hover:shadow-amber-500/10 active:scale-[0.98] border border-slate-700/50 block
                                    ${isAdmin ? 'p-3 flex items-center justify-between' : 'p-4 border-amber-500/30 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-between'}
                                `}
                            >
                                <div className="flex items-center gap-2.5 z-10 relative overflow-hidden flex-1">
                                    <div className={`h-8 w-8 rounded-full ${p.color}/20 flex items-center justify-center shrink-0`}>
                                        <span className="text-xs">{p.icon}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className={`font-bold text-slate-100 truncate ${isAdmin ? 'text-xs' : 'text-lg text-amber-100'}`}>
                                            {p.label}
                                        </h3>
                                        {!isAdmin && <span className="text-xs text-slate-400">출석체크 바로가기</span>}
                                    </div>
                                </div>

                                {isAdmin && (
                                    <span className="text-xs text-slate-500 group-hover:text-amber-400 transition-colors shrink-0">
                                        이동
                                    </span>
                                )}
                                {!isAdmin && <span className="text-slate-500 text-lg">→</span>}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Notice Section */}
                <div className={`${!isAdmin ? 'flex-1 min-h-0 order-2' : 'order-1 h-96'}`}>
                    <NoticeBoard notices={notices} initialExpanded={true} />
                </div>
            </div>

            <footer className={`${!isAdmin ? 'hidden' : 'fixed bottom-0 left-0 right-0 p-4 bg-slate-900/80 backdrop-blur-md border-t border-slate-800 text-center text-xs text-slate-500 z-10'}`}>
                Choir Master v2.1
            </footer>
        </div>
    )
}
