'use client'

import { useState, useEffect, useRef } from 'react'
import { format, isToday } from 'date-fns'
import { ko } from 'date-fns/locale'
import Link from 'next/link'
import { Calendar, ChevronLeft, ChevronRight, Cake, UserPlus, Check, X, Settings, Pencil, Shield, ShieldCheck, Phone, BarChart2 } from 'lucide-react'
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
    members: any[]; // Use any or strict Member type if available sharing
    part: string;
    initialDate?: string;
}

export default function AttendanceList({ members: initialMembers, part, initialDate }: AttendanceListProps) {
    const { user, loading } = useAuth()

    // States
    const [members, setMembers] = useState<Member[]>(initialMembers as Member[])

    // Initialize date from server string (YYYY-MM-DD) to ensure consistency
    // We must parse it as LOCAL time components so that 'format' returns the same string.
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        if (initialDate) {
            // initialDate is "YYYY-MM-DD"
            const parts = initialDate.split('-').map(Number)
            return new Date(parts[0], parts[1] - 1, parts[2])
        }
        return new Date()
    })

    const [optimisticStatus, setOptimisticStatus] = useState<Record<number, string | null>>({})

    // Modals
    const [viewingMember, setViewingMember] = useState<{ id: number, name: string } | null>(null)
    const [showAddMember, setShowAddMember] = useState(false)
    const [showBirthday, setShowBirthday] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [isStatsMode, setIsStatsMode] = useState(false)

    // Derived
    const formattedDate = format(selectedDate, 'M월 d일 (EEE)', { locale: ko })
    const dbDateString = format(selectedDate, 'yyyy-MM-dd')
    const isAdmin = user?.role === 'ADMIN'

    // Fetch Data on Date Change
    useEffect(() => {
        const fetchAttendance = async () => {
            if (!user) return

            try {
                // @ts-ignore
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

        // Logic: NULL -> P -> L -> A -> NULL
        let nextStatus: string | null = null
        if (!currentStatus || currentStatus === 'DELETE') nextStatus = 'P'
        else if (currentStatus === 'P') nextStatus = 'L'
        else if (currentStatus === 'L') nextStatus = 'A'
        else nextStatus = null

        setOptimisticStatus(prev => ({ ...prev, [memberId]: nextStatus }))

        try {
            // dbDateString is "YYYY-MM-DD" from client local time selectedDate
            // This is what we want!
            await toggleAttendance(memberId, dbDateString, nextStatus === null ? 'DELETE' : nextStatus)
        } catch (e) {
            console.error("Failed to update attendance", e)
            setOptimisticStatus(prev => {
                const newState = { ...prev }
                // Revert to original status if failed
                if (member.todayStatus) {
                    newState[memberId] = member.todayStatus
                } else {
                    delete newState[memberId]
                }
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
            case 'P': return 'bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]';
            case 'L': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/30';
            case 'A': return 'bg-rose-500/20 text-rose-400 border-rose-500/50 hover:bg-rose-500/30';
            default: return 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700';
        }
    }

    const getStatusContent = (status: string | null | undefined) => {
        switch (status) {
            case 'P': return (
                <div className="flex flex-col items-center">
                    <Check size={20} className="stroke-[3]" />
                    <span className="text-[10px] font-bold mt-0.5">출석</span>
                </div>
            );
            case 'L': return (
                <div className="flex flex-col items-center">
                    <div className="text-lg font-bold">⚠️</div>
                    <span className="text-[10px] font-bold mt-0.5">지각</span>
                </div>
            );
            case 'A': return (
                <div className="flex flex-col items-center">
                    <X size={20} className="stroke-[3]" />
                    <span className="text-[10px] font-bold mt-0.5">결석</span>
                </div>
            );
            default: return (
                <div className="flex flex-col items-center opacity-50">
                    <div className="w-3 h-3 rounded-full border-2 border-slate-500 mb-1" />
                    <span className="text-[10px]">미체크</span>
                </div>
            );
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

    // Calculate Dynamic Present Count
    const totalCount = members.length
    const presentCount = members.filter(m => {
        const status = optimisticStatus[m.id] !== undefined ? optimisticStatus[m.id] : m.todayStatus
        return status === 'P' || status === 'L'
    }).length

    return (
        <div className="max-w-md mx-auto p-4 space-y-6 pb-24">
            {/* Dynamic Top Header (Moved from page.tsx) */}
            <header className="mb-2 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-20 py-4 -mt-4 border-b border-slate-800">
                <Link href="/dashboard" className="text-slate-400 hover:text-white flex items-center gap-2 font-medium px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors">
                    ← 뒤로가기
                </Link>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-yellow-400">
                    {part}
                </h1>
                <div className="w-auto text-right text-xs text-slate-500 font-mono bg-slate-800 px-2 py-1 rounded border border-slate-700">
                    {presentCount} / {totalCount} 명
                </div>
            </header>

            {/* Date Nav (Adjusted z-index slightly lower if needed, but sticky stacking works) */}
            <div className="flex items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg sticky top-[60px] z-10">
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
            <header className="flex items-center justify-between px-1 mb-2">
                <div className="flex flex-col">
                    <h2 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-indigo-400 flex items-center gap-2">
                        <span>{part.replace('Soprano', 'Sop')}</span>
                        <span className="hidden sm:inline">대원 명단</span>
                        <span className="text-sm font-medium text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-700">
                            {members.length}명
                        </span>
                    </h2>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowBirthday(true)}
                        className="p-2 bg-slate-800 text-pink-400 rounded-lg border border-slate-700 hover:bg-slate-700 active:scale-95 transition-all"
                    >
                        <Cake size={18} />
                    </button>
                    {/* Stats Mode Toggle (Hidden for Admin) */}
                    {!isAdmin && (
                        <button
                            onClick={() => setIsStatsMode(!isStatsMode)}
                            className={`
                                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 border
                                ${isStatsMode
                                    ? 'bg-indigo-500 text-white border-indigo-400 shadow-indigo-500/20'
                                    : 'bg-slate-800 text-indigo-300 border-indigo-500/30 hover:bg-slate-700'}
                            `}
                        >
                            <BarChart2 size={14} />
                            <span>개인현황</span>
                        </button>
                    )}
                    {isAdmin && (
                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`
                                flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg shadow-lg active:scale-95 transition-all
                                ${isEditMode
                                    ? 'bg-amber-500 text-white shadow-amber-900/20'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}
                            `}
                        >
                            {isEditMode ? <ShieldCheck size={14} /> : <Settings size={14} />}
                            <span className="hidden xs:inline">{isEditMode ? '수정 ON' : '관리'}</span>
                        </button>
                    )}
                    {isAdmin && (
                        <button
                            onClick={() => setShowAddMember(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg active:scale-95 transition-all whitespace-nowrap"
                        >
                            <UserPlus size={14} />
                            <span className="hidden xs:inline">추가</span>
                            <span className="inline xs:hidden">+</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Edit Mode Notice */}
            {isEditMode && (
                <div className="mx-1 mb-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-center">
                    <p className="text-xs text-amber-200 font-bold flex items-center justify-center gap-2">
                        <Pencil size={12} />
                        대원 이름을 누르면 정보를 수정합니다
                    </p>
                </div>
            )}

            {/* Stats Mode Notice */}
            {isStatsMode && !isEditMode && (
                <div className="mx-1 mb-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-2 text-center">
                    <p className="text-xs text-indigo-200 font-bold flex items-center justify-center gap-2">
                        <BarChart2 size={12} />
                        대원 이름을 누르면 출석 통계를 확인합니다
                    </p>
                </div>
            )}

            {/* List */}
            <div className="grid grid-cols-1 gap-3">
                {members.map((member) => {
                    const status = getRenderStatus(member)
                    const isNew = member.role === 'New'

                    return (
                        <div
                            key={member.id}
                            onClick={() => {
                                if (isEditMode || isStatsMode) {
                                    setViewingMember({ id: member.id, name: member.name });
                                } else {
                                    handleToggle(member.id);
                                }
                            }}
                            className={`
                                flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 cursor-pointer active:scale-[0.98] select-none
                                ${isEditMode
                                    ? 'border-amber-500/30 bg-amber-950/10'
                                    : isStatsMode
                                        ? 'border-indigo-500/30 bg-indigo-950/10'
                                        : status === 'P' ? 'bg-slate-800/80 border-slate-700 shadow-md' : 'bg-slate-900 border-slate-800'}
                            `}
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-inner shrink-0
                                    ${member.role === 'Soloist' ? 'bg-amber-900/50 text-amber-500 border border-amber-500/30' :
                                        member.role === 'PartLeader' ? 'bg-indigo-900/50 text-indigo-400 border border-indigo-500/30' :
                                            'bg-slate-800 text-slate-400'}
                                `}>
                                    {member.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0 flex justify-between items-center gap-2">
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                                            <span className="font-bold text-lg text-slate-200 leading-none">{member.name}</span>
                                            {member.churchTitle && (
                                                <span className="text-xs text-slate-500 font-medium px-1.5 py-0.5 bg-slate-800 rounded whitespace-nowrap">
                                                    {member.churchTitle}
                                                </span>
                                            )}
                                            {/* Admin Edit Button */}
                                            {isAdmin && isEditMode && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setViewingMember({ id: member.id, name: member.name });
                                                    }}
                                                    className="p-1 text-amber-400 hover:bg-amber-900/30 rounded-full transition-colors shrink-0"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 min-w-0">
                                            {isNew && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 whitespace-nowrap">신입</span>}
                                            <span className="text-xs text-slate-500">
                                                {member.role === 'Soloist' && '솔리스트'}
                                                {member.role === 'PartLeader' && '파트장'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Missing Data Indicators (Right Aligned) */}
                                    {isEditMode && (!member.phone || !member.birthDate) && (
                                        <div className="flex flex-col gap-1 shrink-0 items-end ml-1">
                                            {!member.phone && (
                                                <span className="text-[10px] text-rose-400 bg-rose-950/30 px-1.5 py-0.5 rounded border border-rose-500/20 flex items-center gap-1 whitespace-nowrap opacity-80 decoration-rose-500/50">
                                                    <Phone size={10} /> <span className="text-[9px]">미등록</span>
                                                </span>
                                            )}
                                            {!member.birthDate && (
                                                <span className="text-[10px] text-pink-400 bg-pink-950/30 px-1.5 py-0.5 rounded border border-pink-500/20 flex items-center gap-1 whitespace-nowrap opacity-80 decoration-pink-500/50">
                                                    <Cake size={10} /> <span className="text-[9px]">미등록</span>
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                className={`
                                    w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 border-2 ml-4
                                    ${isStatsMode
                                        ? 'bg-indigo-900/40 border-indigo-500/30 text-indigo-300'
                                        : getStatusColor(status)}
                                `}
                            >
                                {isStatsMode ? (
                                    <div className="flex flex-col items-center">
                                        <BarChart2 size={24} />
                                        <span className="text-[9px] font-bold mt-0.5">통계</span>
                                    </div>
                                ) : getStatusContent(status)}
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
                    onClose={() => {
                        setViewingMember(null)
                    }}
                />
            )}

            {showBirthday && (
                <BirthdayModal
                    part={part}
                    onClose={() => setShowBirthday(false)}
                />
            )}
        </div>
    )
}
