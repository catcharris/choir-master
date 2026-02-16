'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Edit2, Trash2, Check, X, ShieldAlert } from 'lucide-react'
import { deleteMember, updateMember } from '@/actions/members'

interface Member {
    id: number
    name: string
    part: string
    churchTitle: string
    role: string
    isActive: boolean
}

interface AdminMemberViewProps {
    initialMembers: Member[];
    backUrl: string;
}

const PARTS = ['Sop A', 'Sop B', 'Sop B+', 'Alto A', 'Alto B', 'Tenor', 'Bass']

export default function AdminMemberView({ initialMembers, backUrl }: AdminMemberViewProps) {
    const router = useRouter()
    const [members, setMembers] = useState(initialMembers)
    const [searchTerm, setSearchTerm] = useState('')
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editForm, setEditForm] = useState<{ part: string, name: string }>({ part: '', name: '' })
    const [deletingId, setDeletingId] = useState<number | null>(null)

    // Filter members
    const filteredMembers = members.filter(m =>
        m.name.includes(searchTerm) || m.part.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleEditClick = (member: Member) => {
        setEditingId(member.id)
        setEditForm({ part: member.part, name: member.name })
    }

    const handleSave = async (id: number) => {
        try {
            await updateMember(id, {
                part: editForm.part,
                name: editForm.name
            })
            setMembers(prev => prev.map(m => m.id === id ? { ...m, ...editForm } : m))
            setEditingId(null)
            router.refresh()
        } catch (error) {
            alert('수정 실패: ' + error)
        }
    }

    const handleDelete = async (id: number) => {
        try {
            await deleteMember(id)
            setMembers(prev => prev.filter(m => m.id !== id))
            setDeletingId(null)
            alert('삭제되었습니다.')
            router.refresh()
        } catch (error) {
            alert('삭제 실패: ' + error)
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-4 pb-20">
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
                                        <input
                                            value={editForm.name}
                                            onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                            className="bg-slate-700 rounded px-2 py-1 w-full text-slate-100 outline-none focus:ring-1 focus:ring-amber-500"
                                        />
                                    ) : (
                                        <span>{member.name}</span>
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
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold 
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
                                            <span className="text-xs text-rose-400 font-bold hidden sm:inline">삭제?</span>
                                            <button onClick={() => handleDelete(member.id)} className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-500 shadow-lg shadow-rose-900/20 active:scale-95 transition-all">
                                                네
                                            </button>
                                            <button onClick={() => setDeletingId(null)} className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-600 active:scale-95 transition-all">
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

            <div className="mt-6 text-center">
                <button onClick={() => router.push(backUrl)} className="text-slate-500 hover:text-slate-300 text-sm font-medium hover:underline decoration-slate-600 underline-offset-4 transition-all">
                    ← 돌아가기
                </button>
            </div>
        </div>
    )
}
