'use client'

import { useState, useEffect } from 'react'
import { addMember, updateMember } from '@/actions/members'
import { Plus, X, UserPlus, CheckCircle, Edit } from 'lucide-react'

interface AddMemberModalProps {
    onClose: () => void
    part?: string // Pre-fill if opened from a specific part page
    initialData?: {
        id: number
        name: string
        part: string
        churchTitle: string
        role: string
        phone?: string
        birthDate?: string
    }
}

// Map Korean role to DB role internally if needed, but for now user asks for these terms.
// DB 'role' uses English enum-like strings: Regular, Soloist, New, Resting.
// We should DISPLAY Korean but SAVE English to maintain DB consistency.
const PARTS = ['Soprano A', 'Soprano B', 'Soprano B+', 'Alto A', 'Alto B', 'Tenor', 'Bass']
// Role Options for UI
const ROLE_OPTIONS = [
    { label: '정대원', value: 'Regular' },
    { label: '신입대원', value: 'New' },
    { label: '휴식대원', value: 'Resting' },
    { label: '솔리스트', value: 'Soloist' }
]
const TITLES = ['성도', '집사', '안수집사', '권사', '장로']

export default function AddMemberModal({ onClose, part, initialData }: AddMemberModalProps) {
    const [submitting, setSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        part: part || 'Soprano A',
        churchTitle: '성도',
        role: 'Regular',
        phone: '',
        birthDate: ''
    })

    // Initialize form data if editing
    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                part: initialData.part,
                churchTitle: initialData.churchTitle || '성도',
                role: initialData.role,
                phone: initialData.phone || '',
                birthDate: initialData.birthDate || ''
            })
        }
    }, [initialData])

    const isEditing = !!initialData

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            if (isEditing && initialData) {
                await updateMember(initialData.id, formData)
                alert('✏️ 대원 정보가 수정되었습니다!')
            } else {
                await addMember(formData)
                alert('🎉 새 대원이 등록되었습니다!')
            }
            onClose()
        } catch (err: any) {
            alert((isEditing ? '수정 실패: ' : '등록 실패: ') + err.message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-6 pb-4 bg-slate-900 border-b border-slate-700">
                    <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        {isEditing ? <Edit size={20} className="text-amber-500" /> : <UserPlus size={20} className="text-amber-500" />}
                        {isEditing ? '대원 정보 수정' : '새 대원 등록'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 pt-6 space-y-5 overflow-y-auto custom-scrollbar">

                    {/* Name & Part */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">이름 *</label>
                            <input
                                required
                                type="text"
                                placeholder="예: 홍길동"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all font-medium"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">파트 *</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all appearance-none"
                                value={formData.part}
                                onChange={e => setFormData({ ...formData, part: e.target.value })}
                            >
                                {PARTS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Title & Role */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">직분</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all appearance-none"
                                value={formData.churchTitle}
                                onChange={e => setFormData({ ...formData, churchTitle: e.target.value })}
                            >
                                {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-amber-500 mb-1.5 ml-1">역할 (상태)</label>
                            <select
                                className="w-full bg-slate-900 border border-amber-500/30 rounded-xl p-4 text-amber-400 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all appearance-none"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                            >
                                {ROLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">전화번호</label>
                        <input
                            type="tel"
                            placeholder="010-0000-0000"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all font-medium"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>

                    {/* BirthDate */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">생년월일 (6자리)</label>
                        <input
                            type="text"
                            placeholder="예: 950101"
                            maxLength={6}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all font-medium"
                            value={formData.birthDate}
                            onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-amber-900/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-lg"
                        >
                            {submitting ? '저장 중...' : (
                                <>
                                    {isEditing ? <Edit size={20} /> : <CheckCircle size={20} />}
                                    {isEditing ? '수정 완료' : '등록 완료'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
