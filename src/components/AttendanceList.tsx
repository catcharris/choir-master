'use client'

import { useState, useEffect, useRef } from 'react'
import { format, isToday } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Check, X, Calendar, ChevronLeft, ChevronRight, UserPlus, Cake } from 'lucide-react'
import { getMemberAttendanceStats, toggleAttendance } from '@/actions/members'
import { useAuth } from '@/contexts/AuthContext'
import AddMemberModal from './AddMemberModal'
import MemberStatsModal from './MemberStatsModal'
import BirthdayModal from './BirthdayModal'

interface Member {
    id: number;
    name: string;
    part: string;
    role: string;
    churchTitle: string;
    phone?: string | null;
    birthDate?: string | null;
    isActive: boolean;
    todayStatus?: string | null;
}

interface AttendanceListProps {
    part: string;
    initialDate?: string;
}

export default function AttendanceList({ part, initialDate }: AttendanceListProps) {
    const { user, loading } = useAuth()

    // States
    const [members, setMembers] = useState<Member[]>([])
    const [selectedDate, setSelectedDate] = useState<Date>(() =>
        initialDate ? new Date(initialDate) : new Date()
    )
    const [optimisticStatus, setOptimisticStatus] = useState<Record<number, string | null>>({})

    // Modals
    const [viewingMember, setViewingMember] = useState<{ id: number, name: string } | null>(null)
    const [showAddMember, setShowAddMember] = useState(false)
    const [showBirthday, setShowBirthday] = useState(false)

    // Derived
    const formattedDate = format(selectedDate, 'M월 d일 (EEE)', { locale: ko })
    const dbDateString = format(selectedDate, 'yyyy-MM-dd')
    const isAdmin = user?.role === 'ADMIN'

    // Fetch Data
    useEffect(() => {
        const fetchAttendance = async () => {
            if (!user) return

            try {
                // @ts-ignore - mismatch in type definition vs runtime
                const data = await getMemberAttendanceStats(part, dbDateString)
                setMembers(data as Member[])
                setOptimisticStatus({})
            } catch (error) {
                console.error('Failed to fetch attendance:', error)
            }
        }

        fetchAttendance()
    }, [part, user, dbDateString])

    // Date Navigation
    const handlePrevDay = () => {
        const newDate = new Date(selectedDate)
        newDate.setDate(selectedDate.getDate() - 1)
        setSelectedDate(newDate)
    }

    const handleNextDay = () => {
        const newDate = new Date(selectedDate)
        newDate.setDate(selectedDate.getDate() + 1)
        setSelectedDate(newDate)
    }

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            setSelectedDate(new Date(e.target.value))
        }
    }

    // Toggle Attendance
    const handleToggle = async (memberId: number) => {
        if (!user) return

        const member = members.find(m => m.id === memberId)
        if (!member) return

        const currentStatus = optimisticStatus[memberId] !== undefined
            ? optimisticStatus[memberId]
            : member.todayStatus

        // Logic: NULL -> P -> A -> NULL
        let nextStatus: string | null = null
        if (!currentStatus || currentStatus === 'DELETE') nextStatus = 'P'
        else if (currentStatus === 'P') nextStatus = 'A'
        else nextStatus = null

        setOptimisticStatus(prev => ({ ...prev, [memberId]: nextStatus }))

        try {
            const apiStatus = nextStatus === null ? 'DELETE' : nextStatus
            await toggleAttendance(memberId, selectedDate, apiStatus)
        } catch (e) {
            console.error("Failed to update attendance", e)
            setOptimisticStatus(prev => {
                const newState = { ...prev }
                delete newState[memberId]
                return newState
            })
            alert("저장에 실패했습니다.")
        }
    }

    // Helpers
    const getRenderStatus = (member: Member) => {
        if (optimisticStatus[member.id] !== undefined) {
            return optimisticStatus[member.id]
        }
        return member.todayStatus;
    }

    const getStatusColor = (status: string | null | undefined) => {
        switch (status) {
            case 'P': return 'bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30';
            case 'A': return 'bg-rose-500/20 text-rose-400 border-rose-500/50 hover:bg-rose-500/30';
            default: return 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700';
        }
    }

    const getStatusIcon = (status: string | null | undefined) => {
        switch (status) {
            case 'P': return <Check size={18} className="stroke-[3]" />;
            case 'A': return <X size={18} className="stroke-[3]" />;
            default: return <div className="w-4 h-4 rounded-full border-2 border-slate-600" />;
        }
    }

    if (loading) return <div className="text-center py-20 text-slate-500">로딩 중...</div>

    if (!user) {
        return (
            <div className="text-center py-20 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="text-amber-500 mb-2 font-bold text-lg">⚠️ 로그인이 필요합니다</div>
                <p className="text-slate-400 mb-4">대원 관리 및 출석 체크를 위해 먼저 로그인해주세요.</p>
            </div>
        )
    }

    return (
        <div className="max-w-md mx-auto p-4 space-y-6 pb-24">
            {/* Date Nav */}
            <div className="flex items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg sticky top-0 z-10">
                <button onClick={handlePrevDay} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 active:scale-95">
                    <ChevronLeft />
                </button>
                <div className="flex flex-col items-center">
                    <div className="relative group">
                        <label className="flex items-center gap-2 text-lg font-bold text-amber-100 cursor-pointer">
                            <Calendar size={18} className="text-amber-500" />
                            {formattedDate}
                        </label>
                        <input
                            type="date"
                            value={dbDateString}
                            onChange={handleDateChange}
                            className="absolute opacity-0 inset-0 cursor-pointer"
                        />
                    </div>
                    {!isToday(selectedDate) && (
                        <button onClick={() => setSelectedDate(new Date())} className="text-xs text-indigo-400 font-bold mt-1">
                            오늘로 이동
                        </button>
                    )}
                </div>
                <button onClick={handleNextDay} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 active:scale-95">
                    <ChevronRight />
                </button>
            </div>

            {/* Header */}
            <header className="flex items-center justify-between px-1">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-indigo-400">
                    {part} 대원 명단
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowBirthday(true)}
                        className="p-2 bg-slate-800 text-pink-400 rounded-lg border border-slate-700 hover:bg-slate-700"
                    >
                        <Cake size={18} />
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setShowAddMember(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg active:scale-95 transition-all"
                        >
                            <UserPlus size={14} />
                            대원 추가
                        </button>
                    )}
                </div>
            </header>

            {/* List */}
            <div className="grid grid-cols-1 gap-3">
                {members.map((member) => {
                    const status = getRenderStatus(member)
                    const isNew = member.role === 'New'

                    return (
                        <div
                            key={member.id}
                            className={`
                                flex items-center justify-between p-4 rounded-2xl border transition-all duration-200
                                ${status === 'P' ? 'bg-slate-800/80 border-slate-700 shadow-md' : 'bg-slate-900 border-slate-800'}
                            `}
                        >
                            <div
                                className="flex items-center gap-4 flex-1 cursor-pointer"
                                onClick={() => isAdmin && setViewingMember({ id: member.id, name: member.name })}
                            >
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-inner
                                    ${member.role === 'Soloist' ? 'bg-amber-900/50 text-amber-500 border border-amber-500/30' :
                                        member.role === 'PartLeader' ? 'bg-indigo-900/50 text-indigo-400 border border-indigo-500/30' :
                                            'bg-slate-800 text-slate-400'}
                                `}>
                                    {member.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg text-slate-200">{member.name}</span>
                                        <span className="text-xs text-slate-500 font-medium px-1.5 py-0.5 bg-slate-800 rounded">
                                            {member.churchTitle}
                                        </span>
                                        {isNew && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">신입</span>}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        {member.role === 'Soloist' && '솔리스트'}
                                        {member.role === 'PartLeader' && '파트장'}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleToggle(member.id)}
                                className={`
                                    w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 border-2
                                    ${getStatusColor(status)}
                                `}
                            >
                                {getStatusIcon(status)}
                            </button>
                        </div>
                    )
                })}

                {members.length === 0 && (
                    <div className="text-center py-10 text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-800 border-dashed">
                        등록된 대원이 없습니다.
                    </div>
                )}
            </div>

            {/* Modals */}
            {showAddMember && (
                <AddMemberModal
                    part={part}
                    onClose={() => setShowAddMember(false)}
                />
            )}

            {viewingMember && (
                <MemberStatsModal
                    memberId={viewingMember.id}
                    memberName={viewingMember.name}
                    onClose={() => setViewingMember(null)}
                />
            )}

            {showBirthday && (
                <BirthdayModal onClose={() => setShowBirthday(false)} />
            )}
        </div>
    )
}
