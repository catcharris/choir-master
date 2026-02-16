'use client'

import { useState } from 'react'
import { Megaphone, Music2, Calendar, Link as LinkIcon, ChevronDown, ChevronUp, Pencil, Copy } from 'lucide-react'
import { format } from 'date-fns'

import { Notice } from '@prisma/client'

interface NoticeListProps {
    notices: Notice[]
    onEdit?: (notice: Notice) => void
}

export default function NoticeList({ notices, onEdit }: NoticeListProps) {
    const [expandedIds, setExpandedIds] = useState<number[]>([])

    const toggleExpand = (id: number) => {
        setExpandedIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        )
    }

    const handleCopy = (e: React.MouseEvent, notice: Notice) => {
        e.stopPropagation()
        let text = `[${notice.title}]\n\n${notice.content}`
        if ((notice as any).link) {
            text += `\n\n📌 링크: ${(notice as any).link}`
        }

        navigator.clipboard.writeText(text).then(() => {
            alert("공지가 복사되었습니다. 📋\n카톡방에 붙여넣기 하세요.")
        }).catch(err => {
            console.error('Failed to copy:', err)
            alert("복사에 실패했습니다.")
        })
    }

    if (!notices || notices.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500 text-sm">
                등록된 공지가 없습니다.
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {notices.map((notice) => {
                const isExpanded = expandedIds.includes(notice.id)
                const isMusic = (notice as any).category === 'MUSIC'

                return (
                    <div key={notice.id} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700/50 transition-all hover:border-slate-600">
                        <button
                            onClick={() => toggleExpand(notice.id)}
                            className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-slate-700/30"
                        >
                            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isMusic ? 'bg-rose-900/30 text-rose-500' : 'bg-amber-900/30 text-amber-500'}`}>
                                {isMusic ? <Music2 size={20} /> : <Megaphone size={20} />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-200 truncate pr-2">
                                    {notice.title}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                    <Calendar size={10} />
                                    {format(new Date(notice.createdAt), 'yyyy.MM.dd')}
                                </div>
                            </div>

                            <div className="text-slate-500">
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </button>

                        {isExpanded && (
                            <div className="p-4 pt-0 border-t border-slate-700/50 bg-slate-800/50">
                                <div className="mt-4 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed break-words">
                                    {notice.content}
                                </div>

                                {(notice as any).link && (
                                    <a
                                        href={(notice as any).link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-4 flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-900/20 p-3 rounded-lg border border-indigo-500/20 transition-all hover:bg-indigo-900/30 group"
                                    >
                                        <LinkIcon size={14} className="group-hover:rotate-45 transition-transform" />
                                        <span className="truncate">{(notice as any).link}</span>
                                    </a>
                                )}

                                {/* Actions Footer */}
                                {/* Actions Footer - Visible to ALL */}
                                <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-end gap-2">
                                    <button
                                        onClick={(e) => handleCopy(e, notice)}
                                        className="flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 bg-amber-900/20 hover:bg-amber-900/30 px-3 py-1.5 rounded-lg transition-all border border-amber-500/20 shadow-sm"
                                    >
                                        <Copy size={12} />
                                        공지 복사
                                    </button>

                                    {onEdit && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onEdit(notice)
                                            }}
                                            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-all"
                                        >
                                            <Pencil size={12} />
                                            수정
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
