'use client'

import { useState } from 'react'
import { toggleAttendance } from '@/app/actions'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { UserPlus, Cake } from 'lucide-react'
import MemberStatsModal from './MemberStatsModal'
import AddMemberModal from './AddMemberModal'
import BirthdayModal from './BirthdayModal'

interface Member {
    id: number;
    name: string;
    role: string;
    photoUrl: string | null;
    attendance?: { status: string; id: number }[];
}

interface AttendanceListProps {
    members: Member[];
    part: string;
    initialDate: string; // ISO string
}

import { useAuth } from '@/contexts/AuthContext'

export default function AttendanceList({ members, part, initialDate }: AttendanceListProps) {
    const { user, loading } = useAuth()
    const isAdmin = user?.role === 'ADMIN'
    const [date, setDate] = useState(new Date(initialDate))
    const [optimisticStatus, setOptimisticStatus] = useState<Record<number, string>>({})
    const [viewingMember, setViewingMember] = useState<{ id: number, name: string } | null>(null)
    const [showAddMember, setShowAddMember] = useState(false)
    const [showBirthday, setShowBirthday] = useState(false)

    // Helper: Toggle status cyclic (Present -> Late -> Absent -> None)
    const cycleStatus = (current: string | undefined) => {
        switch (current) {
            case 'PRESENT': return 'LATE';
            case 'LATE': return 'ABSENT';
            case 'ABSENT': return 'DELETE';
            default: return 'PRESENT';
        }
    }

    // Check if it's a service day (Sat/Sun)
    const dayOfWeek = date.getDay()
    const isServiceDay = dayOfWeek === 0 || dayOfWeek === 6

    const handleToggle = async (memberId: number) => {
        if (!user) return

        if (!isServiceDay) {
            alert("출석 체크는 토요일(연습)과 주일(예배)에만 가능합니다.")
            return
        }

        // Determine current status (optimistic or truth)
        let currentStatus: string | undefined = optimisticStatus[memberId];

        if (currentStatus === undefined) {
            const member = members.find(m => m.id === memberId);
            currentStatus = member?.attendance?.[0]?.status;
        }

        const newStatus = cycleStatus(currentStatus);

        // Optimistic Update
        const optimisticVal = newStatus === 'DELETE' ? '' : newStatus
        setOptimisticStatus(prev => ({ ...prev, [memberId]: optimisticVal }))

        try {
            if (newStatus === 'DELETE') {
                await toggleAttendance(memberId, date, 'DELETE')
            } else {
                await toggleAttendance(memberId, date, newStatus as string)
            }
        } catch (e) {
            console.error("Failed to update attendance", e)
            setOptimisticStatus(prev => {
                const newState = { ...prev }
                delete newState[memberId]
                return newState
            })
            alert("출석 체크 실패. 다시 시도해주세요.")
        }
    }

    const getStatus = (member: Member) => {
        if (optimisticStatus[member.id] !== undefined) {
            return optimisticStatus[member.id] || undefined
        }
        return member.attendance?.[0]?.status;
    }

    // Helper for status colors
    const getStatusColor = (status: string | undefined) => {
        switch (status) {
            case 'PRESENT': return 'bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30';
            case 'LATE': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/30';
            case 'ABSENT': return 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30';
            default: return 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700';
        }
    }

    if (loading) {
        return <div className="text-center py-20 text-slate-500">잠시만 기다려주세요...</div>
    }

    if (!user) {
        return (
            <div className="text-center py-20 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="text-amber-500 mb-2 font-bold text-lg">⚠️ 로그인이 필요합니다</div>
                <p className="text-slate-400 mb-4">대원 관리 및 출석 체크를 위해 먼저 로그인해주세요.</p>
                <div className="text-sm text-slate-500">상단 헤더의 설정/로그인 버튼을 이용하세요.</div>
            </div>
        )
    }

    if (!isAdmin && user.part !== part) {
        return (
            <div className="text-center py-20 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="text-rose-500 mb-2 font-bold text-lg">⛔ 접근 권한이 없습니다</div>
                <p className="text-slate-400">본인의 파트만 관리할 수 있습니다.</p>
                <div className="text-sm text-slate-500 mt-2">현재 로그인: {user.part} 파트장</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header Controls */}
            <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
                <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-amber-100 flex items-center gap-2">
                        📅 {format(date, 'yyyy.MM.dd')}
                    </h2>
                    <span className="text-xs text-slate-500">
                        {isServiceDay ? '터치하여 상태 변경' : '평일은 조회만 가능 (출석체크 불가)'}
                    </span>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowBirthday(true)}
                        className="flex items-center justify-center bg-pink-600 hover:bg-pink-500 text-white p-2 rounded-lg font-bold shadow transition-all active:scale-95"
                        title="생일자 명단"
                    >
                        <Cake size={20} />
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setShowAddMember(true)}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white p-2 sm:px-4 sm:py-2 rounded-lg font-bold shadow transition-all active:scale-95 text-sm"
                            title="대원 추가"
                        >
                            <UserPlus size={16} />
                            <span className="hidden sm:inline">대원 추가</span>
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="grid gap-3">
                {members.map(member => {
                    const status = getStatus(member);
                    // Check if optimistically deleted status is empty string
                    const isChecked = !!status;

                    return (
                        <div
                            key={member.id}
                            className={`
                                flex items-center justify-between rounded-xl overflow-hidden border transition-all duration-200
                                ${isChecked ? 'bg-slate-800/60 border-slate-600 shadow-md' : 'bg-slate-800/30 border-slate-700/50'}
                                ${!isServiceDay ? 'opacity-80' : ''}
                            `}
                        >
                            {/* Member Info Area - Click to view details */}
                            <div
                                onClick={() => setViewingMember({ id: member.id, name: member.name })}
                                className="flex-1 flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-700/30 transition-colors"
                            >
                                {/* Initial Avatar */}
                                <div className={`
                                    h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg shadow-inner
                                    ${member.role === 'Soloist' ? 'bg-amber-900/40 text-amber-500 border border-amber-500/30' :
                                        member.role === 'New' ? 'bg-green-900/40 text-green-400 border border-green-500/30' :
                                            'bg-slate-700 text-slate-400 border border-slate-600'}
                                `}>
                                    {member.name[0]}
                                </div>

                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg text-slate-100">{member.name}</h3>
                                        <div className="flex gap-1">
                                            {member.role === 'PART_LEADER' && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">파트장</span>}
                                            {member.role === 'CLERK' && <span className="text-[10px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded border border-green-500/30">서기</span>}
                                            {member.role === 'Soloist' && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">솔리스트</span>}
                                            {member.role === 'New' && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">신입</span>}
                                            {member.part === 'Soprano B+' && <span className="text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded border border-orange-500/30">B+</span>}
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-500">터치하여 상세정보</span>
                                </div>
                            </div>

                            {/* Attendance Toggle Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (member.role === 'Resting') {
                                        alert("휴식 대원은 출석 체크를 할 수 없습니다.");
                                        return;
                                    }
                                    handleToggle(member.id);
                                }}
                                disabled={!isServiceDay || member.role === 'Resting'}
                                className={`
                                    w-24 h-full min-h-[88px] flex flex-col items-center justify-center gap-1 font-bold text-sm transition-all
                                    ${member.role === 'Resting' ? 'bg-slate-900 text-slate-600 border-l border-slate-700 cursor-not-allowed' : getStatusColor(status)}
                                    ${!isServiceDay && member.role !== 'Resting' ? 'cursor-not-allowed opacity-50 grayscale bg-slate-800 border-l border-slate-700 text-slate-600' : 'border-l'}
                                `}
                            >
                                <span className="text-lg">
                                    {member.role === 'Resting' ? '💤' :
                                        !isServiceDay ? '🔒' :
                                            (status === 'PRESENT' ? '✅' : status === 'LATE' ? '⚠️' : status === 'ABSENT' ? '❌' : '⬜')}
                                </span>
                                <span>
                                    {member.role === 'Resting' ? '휴식' :
                                        !isServiceDay ? '마감' :
                                            (status === 'PRESENT' ? '출석' : status === 'LATE' ? '지각' : status === 'ABSENT' ? '결석' : '미체크')}
                                </span>
                            </button>
                        </div>
                    )
                })}

                {members.length === 0 && (
                    <div className="text-center py-12 text-slate-500 bg-slate-800/20 rounded-xl border border-slate-700/30 border-dashed">
                        등록된 대원이 없습니다. <br /> '대원 추가' 버튼을 눌러 등록해주세요.
                    </div>
                )}
            </div>

            {/* Modals */}
            {viewingMember && (
                <MemberStatsModal
                    memberId={viewingMember.id}
                    memberName={viewingMember.name}
                    onClose={() => setViewingMember(null)}
                />
            )}

            {showAddMember && (
                <AddMemberModal
                    onClose={() => setShowAddMember(false)}
                    part={part}
                />
            )}

            {showBirthday && (
                <BirthdayModal
                    onClose={() => setShowBirthday(false)}
                />
            )}
        </div>
    )
}
