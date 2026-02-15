'use client'

import { useEffect, useState } from 'react'
import { getMemberAttendanceStats } from '@/actions/stats'
import { X, Calendar, Sun, Moon, Pencil } from 'lucide-react'
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

                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-700 bg-slate-900 text-slate-100">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        📊 {memberName} <span className="text-sm font-normal text-slate-400">출석 현황</span>
                    </h3>
                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-amber-400 transition-colors"
                                title="정보 수정"
                            >
                                <Pencil size={18} />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body - Scrollable */}
                <div className="p-6 pt-6 space-y-6 overflow-y-auto">
                    {/* Member Profile Info */}
                    {stats?.member && (
                        <div className="bg-slate-700/30 p-4 rounded-xl border border-slate-700 grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-slate-400 block mb-1">직분</span>
                                <span className="text-slate-200 font-medium block">{stats.member.churchTitle || '-'}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-400 block mb-1">역할</span>
                                <span className="text-slate-200 font-medium block">{stats.member.role === 'Regular' ? '정대원' : stats.member.role === 'Soloist' ? '솔리스트' : stats.member.role}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-400 block mb-1">전화번호</span>
                                <span className="text-slate-200 font-medium block text-sm">{stats.member.phone || '-'}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-400 block mb-1">생년월일</span>
                                <span className="text-slate-200 font-medium block">{stats.member.birthDate || '-'}</span>
                            </div>
                        </div>
                    )}

                    {/* Month Selector */}
                    <div className="flex justify-center items-center gap-4 py-2">
                        <button
                            onClick={() => setMonthOffset(prev => prev - 1)}
                            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                        >
                            ◀
                        </button>
                        <span className="text-xl font-bold text-amber-100 min-w-[100px] text-center">
                            {stats?.month || 'Loading...'}
                        </span>
                        <button
                            onClick={() => setMonthOffset(prev => prev + 1)}
                            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                        >
                            ▶
                        </button>
                    </div>

                    {loading ? (
                        <div className="py-12 flex justify-center text-slate-500">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                        </div>
                    ) : (
                        <>
                            {/* Visualization: Calendar Grid + Bars */}
                            <div className="space-y-6">
                                {/* Overall Rate */}
                                <div className="text-center relative">
                                    <div className="text-sm text-slate-400 mb-2">월간 통합 출석률</div>
                                    <div className="relative inline-block">
                                        <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500 relative z-10">
                                            {stats?.totalRate}%
                                        </div>
                                    </div>
                                    <div className="mt-4 h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                                        <div
                                            className="h-full bg-gradient-to-r from-amber-400 to-orange-600 transition-all duration-1000 ease-out"
                                            style={{ width: `${stats?.totalRate}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Counts */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-700/30 p-4 rounded-xl border border-slate-700 text-center">
                                        <div className="text-indigo-400 font-bold mb-1 flex justify-center items-center gap-1"><Moon size={14} />토요일</div>
                                        <div className="text-2xl font-bold text-white">{stats?.stats.sat.attended} <span className="text-sm text-slate-500 font-normal">/ {stats?.stats.sat.total}</span></div>
                                    </div>
                                    <div className="bg-slate-700/30 p-4 rounded-xl border border-slate-700 text-center">
                                        <div className="text-rose-400 font-bold mb-1 flex justify-center items-center gap-1"><Sun size={14} />주일</div>
                                        <div className="text-2xl font-bold text-white">{stats?.stats.sun.attended} <span className="text-sm text-slate-500 font-normal">/ {stats?.stats.sun.total}</span></div>
                                    </div>
                                </div>

                                {/* Calendar Grid */}
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500 mb-3" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                                        <div className="text-rose-500">일</div>
                                        <div>월</div>
                                        <div>화</div>
                                        <div>수</div>
                                        <div>목</div>
                                        <div>금</div>
                                        <div className="text-indigo-400">토</div>
                                    </div>
                                    <CalendarGrid
                                        year={stats ? parseInt(stats.month.split('-')[0]) : 0}
                                        month={stats ? parseInt(stats.month.split('-')[1]) : 0}
                                        attendedDates={stats?.attendedDates || []}
                                    />
                                </div>
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

