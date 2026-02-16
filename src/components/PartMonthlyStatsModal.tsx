'use client'

import { useEffect, useState } from 'react'
import { getPartMonthlyStats } from '@/actions/stats'
import { X, ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react'
import { format } from 'date-fns'

interface PartMonthlyStatsModalProps {
    part: string
    onClose: () => void
}

export default function PartMonthlyStatsModal({ part, onClose }: PartMonthlyStatsModalProps) {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [monthOffset, setMonthOffset] = useState(0)

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true)
            const today = new Date()
            const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)

            try {
                const data = await getPartMonthlyStats(
                    part,
                    targetDate.getFullYear(),
                    targetDate.getMonth() + 1
                )
                setStats(data)
            } catch (e) {
                console.error("Failed to fetch part stats", e)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [part, monthOffset])

    const today = new Date()
    const currentViewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-4xl bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-700 bg-slate-900 text-slate-100 shrink-0">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <CalendarCheck className="text-amber-500" size={24} />
                        <span>{part}</span>
                        <span className="text-sm font-normal text-slate-400 hidden sm:inline">월간 대원별 출석 현황</span>
                        <span className="text-sm font-normal text-slate-400 sm:hidden">출석 현황</span>
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Controls */}
                <div className="flex justify-center items-center gap-6 py-4 bg-slate-800/50 border-b border-slate-700/50 shrink-0">
                    <button
                        onClick={() => setMonthOffset(prev => prev - 1)}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors active:scale-95"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-xl font-bold text-amber-100 min-w-[140px] text-center tracking-tight">
                        {format(currentViewDate, 'yyyy년 MM월')}
                    </span>
                    <button
                        onClick={() => setMonthOffset(prev => prev + 1)}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors active:scale-95"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                {/* Content - Scrollable Table */}
                <div className="flex-1 overflow-auto bg-slate-900/30 w-full relative">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 border-4 border-slate-700 border-t-amber-500 rounded-full animate-spin"></div>
                        </div>
                    ) : stats ? (
                        <div className="min-w-max p-4">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr>
                                        <th className="sticky left-0 top-0 z-20 bg-slate-800 p-3 text-left font-bold text-slate-300 border-b border-slate-600 min-w-[100px] shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                                            이름
                                        </th>
                                        <th className="sticky top-0 z-10 bg-slate-800 p-3 text-center font-bold text-amber-400 border-b border-slate-600 min-w-[60px]">
                                            (%)
                                        </th>
                                        {stats.serviceDays.map((day: string) => {
                                            const d = new Date(day)
                                            const isSun = d.getDay() === 0
                                            return (
                                                <th key={day} className="sticky top-0 z-10 bg-slate-800 p-2 text-center font-medium border-b border-slate-600 min-w-[40px]">
                                                    <div className={isSun ? 'text-rose-400' : 'text-indigo-400'}>
                                                        {format(d, 'M/d')}
                                                    </div>
                                                    <div className={`text-[10px] ${isSun ? 'text-rose-500/70' : 'text-indigo-500/70'}`}>
                                                        {format(d, 'EEE')}
                                                    </div>
                                                </th>
                                            )
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.members.map((member: any) => (
                                        <tr key={member.id} className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors group">
                                            <td className="sticky left-0 z-10 bg-slate-900 group-hover:bg-slate-800 p-3 font-bold text-slate-200 border-r border-slate-700/50 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                                                {member.name}
                                                {member.role === 'Soloist' && <span className="ml-1 text-[10px] text-amber-500 bg-amber-900/30 px-1 rounded">S</span>}
                                            </td>
                                            <td className="p-2 text-center">
                                                <span className={`font-bold ${member.rate >= 80 ? 'text-green-400' :
                                                    member.rate >= 50 ? 'text-yellow-400' : 'text-rose-400'
                                                    }`}>
                                                    {member.rate}%
                                                </span>
                                            </td>
                                            {stats.serviceDays.map((day: string) => {
                                                const status = member.attendanceMap[day]
                                                let content = <span className="text-slate-700">-</span>

                                                if (status === 'PRESENT' || status === 'P') {
                                                    content = <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto text-xs">O</div>
                                                } else if (status === 'LATE' || status === 'L') {
                                                    content = <div className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center mx-auto text-xs">△</div>
                                                } else if (status === 'ABSENT' || status === 'A') {
                                                    content = <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto text-xs">X</div>
                                                }

                                                return (
                                                    <td key={day} className="p-2 text-center border-l border-slate-800">
                                                        {content}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                    {stats.members.length === 0 && (
                                        <tr>
                                            <td colSpan={stats.serviceDays.length + 2} className="p-8 text-center text-slate-500">
                                                데이터가 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-10 text-center text-slate-500">데이터를 불러오는 중입니다...</div>
                    )}
                </div>

                {/* Footer Legend */}
                <div className="p-3 bg-slate-900/80 border-t border-slate-800 text-xs text-slate-400 flex justify-center gap-4 shrink-0">
                    <div className="flex items-center gap-1"><span className="text-green-500">O</span> 출석</div>
                    <div className="flex items-center gap-1"><span className="text-yellow-500">△</span> 지각</div>
                    <div className="flex items-center gap-1"><span className="text-rose-500">X</span> 결석</div>
                </div>
            </div>
        </div>
    )
}
