'use client'

import { useEffect, useState } from 'react'
import { getMemberAttendanceStats } from '@/actions/stats'
import { X, Calendar, Sun, Moon, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'
import confetti from 'canvas-confetti'
import AddMemberModal from './AddMemberModal'

interface MemberStatsModalProps {
    memberId: number | null
    memberName: string
    onClose: () => void
}

import { useAuth } from '@/contexts/AuthContext'

export default function MemberStatsModal({ memberId, memberName, onClose }: MemberStatsModalProps) {
    const { user } = useAuth()
    const isAdmin = user?.role === 'ADMIN'
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [monthOffset, setMonthOffset] = useState(0) // 0 = Current Month, -1 = Last Month
    const [isEditing, setIsEditing] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        if (!memberId) return

        const fetchStats = async () => {
            setLoading(true)
            const today = new Date()
            // Adjust date based on offset
            const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)

            try {
                const data = await getMemberAttendanceStats(
                    memberId,
                    targetDate.getFullYear(),
                    targetDate.getMonth() + 1
                )
                setStats(data)
            } catch (e) {
                console.error("Failed to fetch stats", e)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [memberId, monthOffset, refreshKey])

    // Effect for 100% Celebration
    useEffect(() => {
        if (stats?.totalRate === 100 && !loading) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#fbbf24', '#f59e0b', '#d97706'] // Amber/Gold colors
            });
        }
    }, [stats, loading])

    if (!memberId) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">

                {/* Header (Integrated Profile) */}
                <div className="flex justify-between items-start p-5 border-b border-slate-700 bg-slate-900 text-slate-100 min-h-[80px]">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            {memberName}
                            <span className="text-xs font-normal text-slate-500">출석 현황</span>
                        </h3>
                        {stats?.member ? (
                            <div className="flex flex-wrap items-center gap-2 mt-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${stats.member.role === 'PartLeader' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                                    {stats.member.role === 'Regular' ? '정대원' : stats.member.role === 'Soloist' ? '솔리스트' : stats.member.role === 'PartLeader' ? '파트장' : stats.member.role}
                                </span>
                                {stats.member.churchTitle && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                        {stats.member.churchTitle}
                                    </span>
                                )}
                                <div className="text-[10px] text-slate-500 ml-1 flex items-center gap-2">
                                    <span className="flex items-center gap-0.5">📞 {stats.member.phone || '-'}</span>
                                    <span className="w-px h-2 bg-slate-700"></span>
                                    <span className="flex items-center gap-0.5">🎂 {stats.member.birthDate || '-'}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="h-5 w-32 bg-slate-800 rounded mt-1.5 animate-pulse"></div>
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                        {isAdmin && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-amber-400 transition-colors"
                            >
                                <Pencil size={16} />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body - Compact Layout */}
                <div className="p-4 space-y-3 overflow-y-auto">
                    {/* Month Selector (Larger) */}
                    <div className="flex justify-between items-center bg-slate-800/50 rounded-xl p-2 border border-slate-700/50">
                        <button
                            onClick={() => setMonthOffset(prev => prev - 1)}
                            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <span className="font-black text-amber-400 text-xl tracking-wide">
                            {stats?.month || 'Loading...'}
                        </span>
                        <button
                            onClick={() => setMonthOffset(prev => prev + 1)}
                            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="py-12 flex justify-center text-slate-500">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                        </div>
                    ) : (
                        <>
                            {/* Stats Summary Card (Larger) */}
                            <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-5 flex items-center justify-between">
                                {/* Circular Progress */}
                                <div className="flex items-center gap-3">
                                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                                        <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            <path className="text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                            <path className="text-amber-500 drop-shadow-[0_0_4px_rgba(245,158,11,0.6)] transition-all duration-1000 ease-out" strokeDasharray={`${stats?.totalRate || 0}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                        </svg>
                                        <span className="text-sm font-black text-white">{stats?.totalRate}%</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-base font-bold text-slate-200 whitespace-nowrap">통합 출석률</span>
                                        <span className="text-xs text-slate-500 whitespace-nowrap">이번 달 전체</span>
                                    </div>
                                </div>

                                {/* Sat/Sun Mini Stats (Larger) */}
                                <div className="flex gap-2">
                                    <div className="flex flex-col items-center justify-center bg-indigo-950/40 border border-indigo-500/30 rounded-lg px-2 py-2 min-w-[55px]">
                                        <span className="text-[10px] text-indigo-300 mb-1 flex items-center gap-1 font-bold"><Moon size={10} /> 토</span>
                                        <span className="text-lg font-bold text-indigo-100 leading-none">
                                            {stats?.stats.sat.attended}<span className="text-xs text-indigo-500/70 font-normal">/{stats?.stats.sat.total}</span>
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center bg-rose-950/40 border border-rose-500/30 rounded-lg px-2 py-2 min-w-[55px]">
                                        <span className="text-[10px] text-rose-300 mb-1 flex items-center gap-1 font-bold"><Sun size={10} /> 주일</span>
                                        <span className="text-lg font-bold text-rose-100 leading-none">
                                            {stats?.stats.sun.attended}<span className="text-xs text-rose-500/70 font-normal">/{stats?.stats.sun.total}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Calendar Grid */}
                            <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-700/50">
                                <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500 mb-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                                    <div className="text-rose-500/80">일</div>
                                    <div>월</div>
                                    <div>화</div>
                                    <div>수</div>
                                    <div>목</div>
                                    <div>금</div>
                                    <div className="text-indigo-400/80">토</div>
                                </div>
                                <CalendarGrid
                                    year={stats ? parseInt(stats.month.split('-')[0]) : 0}
                                    month={stats ? parseInt(stats.month.split('-')[1]) : 0}
                                    attendedDates={stats?.attendedDates || []}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {isEditing && stats?.member && (
                <AddMemberModal
                    onClose={() => {
                        setIsEditing(false)
                        setRefreshKey(prev => prev + 1)
                    }}
                    part={stats.member.part}
                    initialData={{
                        id: memberId,
                        name: stats.member.name,
                        part: stats.member.part || "Soprano A",
                        churchTitle: stats.member.churchTitle,
                        role: stats.member.role,
                        phone: stats.member.phone,
                        birthDate: stats.member.birthDate
                    }}
                />
            )}
        </div>
    )
}

function CalendarGrid({ year, month, attendedDates }: { year: number, month: number, attendedDates: string[] }) {
    if (!year || !month) return null;

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sun

    const days = [];
    // Pad empty start days
    for (let i = 0; i < startDayOfWeek; i++) {
        days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
    }

    // Render days
    for (let d = 1; d <= daysInMonth; d++) {
        const currentDate = new Date(year, month - 1, d);
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayOfWeek = currentDate.getDay();
        const isAttended = attendedDates.includes(dateStr);

        let bgColor = 'bg-slate-800/30 text-slate-500'; // Default
        let borderColor = 'border-transparent';

        // Styling logic
        if (dayOfWeek === 0) { // Sunday
            if (isAttended) {
                bgColor = 'bg-rose-900/60 text-rose-200 shadow-[0_0_10px_rgba(225,29,72,0.3)]';
                borderColor = 'border-rose-500/50';
            } else {
                bgColor = 'bg-slate-800/30 text-rose-900/50'; // Greyed out sunday
            }
        } else if (dayOfWeek === 6) { // Saturday
            if (isAttended) {
                bgColor = 'bg-indigo-900/60 text-indigo-200 shadow-[0_0_10px_rgba(79,70,229,0.3)]';
                borderColor = 'border-indigo-500/50';
            } else {
                bgColor = 'bg-slate-800/30 text-indigo-900/50';
            }
        } else {
            // Weekdays - usually irrelevant
            bgColor = 'bg-transparent text-slate-700';
        }

        days.push(
            <div
                key={d}
                className={`
                    aspect-square rounded-lg flex items-center justify-center text-sm font-bold border transition-all
                    ${bgColor} ${borderColor}
                `}
            >
                {d}
                {isAttended && (
                    <div className="absolute w-1 h-1 bg-white rounded-full mt-5 opacity-50"></div>
                )}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-7 gap-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {days}
        </div>
    );
}

// End of file

