'use client'

import { useState } from 'react'
import { Megaphone, Music2, Plus } from 'lucide-react'
import NoticeList from './NoticeList'
import AddNoticeModal from './AddNoticeModal'

import { Notice } from '@prisma/client'

import { useAuth } from '@/contexts/AuthContext'

export default function NoticeBoard({ notices, initialExpanded = false }: { notices: Notice[], initialExpanded?: boolean }) {
    const { user } = useAuth()
    const isAdmin = user?.role === 'ADMIN'
    const [showAdd, setShowAdd] = useState(false)
    const [editingNotice, setEditingNotice] = useState<Notice | null>(null)
    const [filter, setFilter] = useState<'ALL' | 'NOTICE' | 'MUSIC'>('ALL')

    const filteredNotices = notices.filter(n => {
        if (filter === 'ALL') return true
        return (n as any).category === filter
    })

    const handleEdit = (notice: Notice) => {
        setEditingNotice(notice)
    }

    const handleClose = () => {
        setShowAdd(false)
        setEditingNotice(null)
    }

    return (
        <div className={`flex flex-col ${initialExpanded ? 'h-full' : 'mb-8'}`}>
            {/* Header / Tabs */}
            <div className="flex-shrink-0 flex items-center justify-between mb-2">
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('ALL')}
                        className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${filter === 'ALL' ? 'bg-slate-700 text-white border-slate-600' : 'text-slate-500 border-transparent hover:bg-slate-800'}`}
                    >
                        전체
                    </button>
                    <button
                        onClick={() => setFilter('NOTICE')}
                        className={`px-3 py-1 text-xs font-bold rounded-full border transition-all flex items-center gap-1 ${filter === 'NOTICE' ? 'bg-amber-900/30 text-amber-500 border-amber-500/30' : 'text-slate-500 border-transparent hover:bg-slate-800'}`}
                    >
                        <Megaphone size={12} />
                        공지
                    </button>
                    <button
                        onClick={() => setFilter('MUSIC')}
                        className={`px-3 py-1 text-xs font-bold rounded-full border transition-all flex items-center gap-1 ${filter === 'MUSIC' ? 'bg-rose-900/30 text-rose-500 border-rose-500/30' : 'text-slate-500 border-transparent hover:bg-slate-800'}`}
                    >
                        <Music2 size={12} />
                        찬양
                    </button>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => setShowAdd(true)}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-900/20 hover:bg-indigo-900/40 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-all"
                    >
                        <Plus size={14} />
                        글쓰기
                    </button>
                )}
            </div>

            {/* List */}
            <div className={`bg-slate-900/50 rounded-2xl border border-slate-800 p-4 ${initialExpanded ? 'flex-1 overflow-y-auto min-h-0' : 'min-h-[100px]'}`}>
                <NoticeList notices={filteredNotices} onEdit={isAdmin ? handleEdit : undefined} />
            </div>

            {/* Modal */}
            {(showAdd || editingNotice) && (
                <AddNoticeModal
                    onClose={handleClose}
                    initialData={editingNotice}
                />
            )}
        </div>
    )
}
