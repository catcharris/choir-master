'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Edit2, Trash2, Check, X, ShieldAlert, FileSpreadsheet, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import { deleteMember, updateMember } from '@/actions/members'
import BirthdayListModal from './BirthdayListModal'
import BulkMemberUpdate from './BulkMemberUpdate'

interface Member {
    id: number
    name: string
    part: string
    churchTitle: string
    role: string
    isActive: boolean
    birthDate?: string | null
}

interface AdminMemberViewProps {
    initialMembers: Member[];
    backUrl: string;
}

const PARTS = ['Sop A', 'Sop B', 'Sop B+', 'Alto A', 'Alto B', 'Tenor', 'Bass']

export default function AdminMemberView({ initialMembers, backUrl }: AdminMemberViewProps) {
    const router = useRouter()
    const [members, setMembers] = useState(initialMembers)
    const [showBirthdayModal, setShowBirthdayModal] = useState(false)
    const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editForm, setEditForm] = useState<{ part: string, name: string, churchTitle: string }>({ part: '', name: '', churchTitle: '' })
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [password, setPassword] = useState('')

    // Filter members
    const filteredMembers = members.filter(m =>
        m.name.includes(searchTerm) || m.part.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleEditClick = (member: Member) => {
        setEditingId(member.id)
        setEditForm({ part: member.part, name: member.name, churchTitle: member.churchTitle || '' })
    }

    const handleSave = async (id: number) => {
        try {
            await updateMember(id, {
                part: editForm.part,
                name: editForm.name,
                churchTitle: editForm.churchTitle
            })
            setMembers(prev => prev.map(m => m.id === id ? { ...m, ...editForm } : m))
            setEditingId(null)
            router.refresh()
        } catch (error) {
            alert('수정 실패: ' + error)
        }
    }

    const handleDelete = async (id: number) => {
        if (!password) {
            alert('관리자 비밀번호를 입력해주세요.')
            return
        }

        try {
            await deleteMember(id, password)
            setMembers(prev => prev.filter(m => m.id !== id))
            setDeletingId(null)
            setPassword('') // Clear password
            alert('삭제되었습니다.')
            router.refresh()
        } catch (error: any) {
            alert('삭제 실패: ' + (error.message || error))
        }
    }

    const handleDownloadList = () => {
        const sortedMembers = [...members].sort((a, b) => a.part.localeCompare(b.part) || a.name.localeCompare(b.name))

        const wsData = [
            ['파트', '이름', '상태', '직분', '생년월일', '교회직분'],
            ...sortedMembers.map(m => [
                m.part,
                m.name,
                m.role === 'Regular' ? '정대원' : m.role === 'New' ? '신입' : m.role === 'Resting' ? '휴식' : m.role,
                m.churchTitle || '',
                (m as any).birthDate || '', // Assuming birthDate is in Member type but not interface here? Check interface.
                m.churchTitle || ''
            ])
        ]

        const ws = XLSX.utils.aoa_to_sheet(wsData)
        ws['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 10 }]

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "전체대원명단")
        XLSX.writeFile(wb, `갈보리찬양대_대원명단_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    return (
        <div className="max-w-4xl mx-auto p-4 pb-20">
            {/* Header Actions */}
            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={() => router.push(backUrl)}
                    className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                    ← 돌아가기
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={handleDownloadList}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-900/20 transition-all active:scale-95"
                    >
                        <FileSpreadsheet size={16} />
                        명단 엑셀 다운
                    </button>
                    <button
                        onClick={() => setShowBulkUpdateModal(true)}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Upload size={16} />
                        정보 일괄 등록
                    </button>
                    <button
                        onClick={() => setShowBirthdayModal(true)}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-amber-900/20 transition-all active:scale-95"
                    >
                        🎂 생일자 명단
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="이름 또는 파트 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                />
            </div>

            {/* Member List */}
            <div className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-800 text-slate-400 text-xs uppercase">
                        <tr>
                            <th className="p-4 w-1/3">이름</th>
                            <th className="p-4 w-1/3">파트</th>
                            <th className="p-4 w-1/3 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {filteredMembers.map(member => (
                            <tr key={member.id} className="hover:bg-slate-800/30 transition-colors">
                                {/* Name Column */}
                                <td className="p-4 font-medium text-slate-200">
                                    {editingId === member.id ? (
                                        <div className="flex flex-col gap-1">
                                            <input
                                                value={editForm.name}
                                                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                                className="bg-slate-700 rounded px-2 py-1 w-full text-slate-100 outline-none focus:ring-1 focus:ring-amber-500"
                                                placeholder="이름"
                                            />
                                            <input
                                                value={editForm.churchTitle}
                                                onChange={e => setEditForm(prev => ({ ...prev, churchTitle: e.target.value }))}
                                                className="bg-slate-700 rounded px-2 py-1 w-full text-xs text-slate-300 outline-none focus:ring-1 focus:ring-amber-500"
                                                placeholder="직분 (선택)"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            <span className="whitespace-nowrap font-bold text-base">{member.name}</span>
                                            {member.churchTitle && (
                                                <span className="text-xs text-slate-500 whitespace-nowrap">{member.churchTitle}</span>
                                            )}
                                        </div>
                                    )}
                                </td>

                                {/* Part Column */}
                                <td className="p-4 text-slate-300">
                                    {editingId === member.id ? (
                                        <select
                                            value={editForm.part}
                                            onChange={e => setEditForm(prev => ({ ...prev, part: e.target.value }))}
                                            className="bg-slate-700 rounded px-2 py-1 w-full text-sm text-slate-100 outline-none focus:ring-1 focus:ring-amber-500"
                                        >
                                            {PARTS.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap
                                            ${member.part.includes('Sop') ? 'bg-pink-900/40 text-pink-300' :
                                                member.part.includes('Alto') ? 'bg-purple-900/40 text-purple-300' :
                                                    member.part === 'Tenor' ? 'bg-blue-900/40 text-blue-300' :
                                                        member.part === 'Bass' ? 'bg-indigo-900/40 text-indigo-300' : 'bg-slate-700 text-slate-300'}`
                                        }>
                                            {member.part}
                                        </span>
                                    )}
                                </td>

                                {/* Actions Column */}
                                <td className="p-4 flex gap-2 justify-end items-center">
                                    {editingId === member.id ? (
                                        <>
                                            <button onClick={() => handleSave(member.id)} className="p-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors">
                                                <Check size={16} />
                                            </button>
                                            <button onClick={() => setEditingId(null)} className="p-2 bg-slate-700/50 text-slate-400 rounded-lg hover:bg-slate-700 transition-colors">
                                                <X size={16} />
                                            </button>
                                        </>
                                    ) : deletingId === member.id ? (
                                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-rose-500 transition-colors"
                                                placeholder="비번(0000)"
                                                autoFocus
                                                onKeyDown={e => e.key === 'Enter' && handleDelete(member.id)}
                                            />
                                            <button onClick={() => handleDelete(member.id)} className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-500 shadow-lg shadow-rose-900/20 active:scale-95 transition-all">
                                                삭제
                                            </button>
                                            <button onClick={() => { setDeletingId(null); setPassword('') }} className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-600 active:scale-95 transition-all">
                                                취소
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button onClick={() => handleEditClick(member)} className="p-2 hover:bg-slate-700 text-slate-400 hover:text-amber-400 rounded-lg transition-colors active:scale-95">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => setDeletingId(member.id)} className="p-2 hover:bg-rose-900/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors active:scale-95">
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}

                        {filteredMembers.length === 0 && (
                            <tr>
                                <td colSpan={3} className="p-8 text-center text-slate-500 italic">
                                    검색 결과가 없습니다.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            {showBirthdayModal && (
                <BirthdayListModal onClose={() => setShowBirthdayModal(false)} />
            )}
            {showBulkUpdateModal && (
                <BulkMemberUpdate onClose={() => {
                    setShowBulkUpdateModal(false)
                    router.refresh()
                }} />
            )}

            {/* Danger Zone */}
            <div className="mt-12 pt-8 border-t border-slate-800">
                <h3 className="text-rose-500 font-bold mb-4 flex items-center gap-2">
                    <ShieldAlert size={20} />
                    시스템 초기화 (Danger Zone)
                </h3>
                <div className="bg-rose-900/10 border border-rose-900/30 rounded-xl p-6">
                    <p className="text-rose-200 text-sm mb-4">
                        모든 출석 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.<br />
                        새로운 학기나 연도가 시작될 때 초기화 용도로 사용하세요.
                    </p>
                    <div className="flex items-center gap-2">
                        <input
                            type="password"
                            placeholder="관리자 비밀번호"
                            className="bg-slate-900 border border-rose-900/50 rounded px-3 py-2 text-white outline-none focus:border-rose-500 w-40 text-sm"
                            id="reset-password"
                        />
                        <button
                            onClick={async () => {
                                const pwdInput = document.getElementById('reset-password') as HTMLInputElement
                                const pwd = pwdInput.value
                                if (!pwd) return alert('비밀번호를 입력하세요.')

                                if (confirm('정말 모든 출석 데이터를 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.')) {
                                    try {
                                        const { resetAttendance } = await import('@/actions/system')
                                        await resetAttendance(pwd)
                                        alert('초기화되었습니다.')
                                        window.location.reload()
                                    } catch (e: any) {
                                        alert(e.message)
                                    }
                                }
                            }}
                            className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-rose-900/20 active:scale-95 transition-all"
                        >
                            모든 출석 기록 삭제
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
