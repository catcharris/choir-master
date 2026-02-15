'use client'

import { useState, useEffect } from 'react'
import { createNotice, updateNotice } from '@/actions/notices'
import { X, Send, Music2, Megaphone, Pencil } from 'lucide-react'

import { Notice } from '@prisma/client'

interface AddNoticeModalProps {
    onClose: () => void
    initialData?: Notice | null
}

export default function AddNoticeModal({ onClose, initialData }: AddNoticeModalProps) {
    const [title, setTitle] = useState(initialData?.title || '')
    const [content, setContent] = useState(initialData?.content || '')
    const [category, setCategory] = useState<'NOTICE' | 'MUSIC'>((initialData?.category as 'NOTICE' | 'MUSIC') || 'NOTICE')
    const [link, setLink] = useState(initialData?.link || '')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title)
            setContent(initialData.content)
            setCategory((initialData.category as 'NOTICE' | 'MUSIC') || 'NOTICE')
            setLink(initialData.link || '')
        }
    }, [initialData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !content.trim()) return

        setLoading(true)
        try {
            if (initialData) {
                await updateNotice(initialData.id, {
                    title,
                    content,
                    category,
                    link: link.trim() || undefined
                })
                alert('📢 공지가 수정되었습니다!')
            } else {
                await createNotice({
                    title,
                    content,
                    category,
                    link: link.trim() || undefined
                })
                alert('📢 공지가 등록되었습니다!')
            }
            onClose()
        } catch (e: any) {
            console.error(e)
            alert(`작업 실패: ${e.message || '알 수 없는 오류'}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex justify-between items-center p-6 pb-4 bg-slate-900 border-b border-slate-700">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            {initialData ? '공지 수정하기' : '새로운 소식 작성'}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            {category === 'NOTICE' ? '찬양대원들에게 알릴 공지사항을 작성해요.' : '이번 주 찬양곡 링크와 정보를 공유해요.'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 pt-6 space-y-5">

                    {/* Category Switch */}
                    <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-700/50 rounded-xl border border-slate-600/50">
                        <button
                            type="button"
                            onClick={() => setCategory('NOTICE')}
                            className={`py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 ${category === 'NOTICE'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-600/50'
                                }`}
                        >
                            <Megaphone size={16} />
                            일반 공지
                        </button>
                        <button
                            type="button"
                            onClick={() => setCategory('MUSIC')}
                            className={`py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 ${category === 'MUSIC'
                                ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-600/50'
                                }`}
                        >
                            <Music2 size={16} />
                            찬양곡
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">TITLE</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
                                placeholder={category === 'MUSIC' ? "예: 02/18 주일 찬양 - 주의 은혜라" : "공지 제목을 입력해주세요"}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">CONTENT</label>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                                placeholder="내용을 상세히 입력해주세요..."
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">LINK (OPTIONAL)</label>
                            <input
                                type="url"
                                value={link}
                                onChange={e => setLink(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-indigo-200 placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                                placeholder="https://youtube.com/..."
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg mt-2"
                    >
                        {loading ? '저장 중...' : (
                            <>
                                {initialData ? <Pencil size={18} /> : <Send size={18} />}
                                {initialData ? '수정 완료' : '등록 완료'}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
