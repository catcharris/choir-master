'use client'

import { useState, useEffect } from 'react'
import { getBirthdayMembers } from '@/actions/members'
import { X, Copy, Check, Cake, Printer } from 'lucide-react'

interface BirthdayModalProps {
    onClose: () => void
    part?: string // Optional: if provided, filters by part
}

export default function BirthdayModal({ onClose, part }: BirthdayModalProps) {
    const [loading, setLoading] = useState(true)
    const [members, setMembers] = useState<any[]>([])
    const [partyMonth, setPartyMonth] = useState<number>(0)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const fetchBirthdays = async () => {
            const today = new Date()
            const currentMonth = today.getMonth() + 1 // 1-12

            // Calculate "Party Month" (Next Even Month)
            // If Jan(1) -> Feb(2). If Feb(2) -> Feb(2).
            // Logic: Math.ceil(currentMonth / 2) * 2
            let targetPartyMonth = Math.ceil(currentMonth / 2) * 2

            // If we are in Dec(12), target is 12. List is Nov+Dec.
            // What if we are late Dec and want to see Next Feb? 
            // Usually the list is needed for "this period's party".
            // Let's stick to Current 2-month block.

            setPartyMonth(targetPartyMonth)

            const targetMonths = [targetPartyMonth - 1, targetPartyMonth]

            try {
                const data = await getBirthdayMembers(targetMonths, part)
                setMembers(data)
            } catch (e) {
                console.error("Failed to fetch birthdays", e)
            } finally {
                setLoading(false)
            }
        }

        fetchBirthdays()
    }, [part])

    const handleCopy = () => {
        if (members.length === 0) return

        const title = `🎂 ${partyMonth}월 생일파티 명단 (${partyMonth - 1}월, ${partyMonth}월 생일자)`;

        // Group by Part? User didn't specify, but lists are usually better by Part.
        // Or just sorted list. The action returns sorted by Date (MMDD).
        // Let's copy as list.

        const list = members.map(m => {
            const dateStr = `${m.birthDate.substring(2, 4)}.${m.birthDate.substring(4, 6)}`
            return `- ${m.name} (${m.part}, ${dateStr})`;
        }).join('\n');

        const text = `${title}\n\n${list}\n\n총 ${members.length}명`;

        navigator.clipboard.writeText(text).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-700 bg-slate-900/50">
                    <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <Cake className="text-pink-500" size={24} />
                        생일자 명단
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    <div className="bg-pink-900/20 border border-pink-500/30 rounded-xl p-4 text-center">
                        <h4 className="text-pink-200 font-bold text-lg mb-1">
                            🎉 {partyMonth}월 생일파티 (예정)
                        </h4>
                        <p className="text-pink-400/80 text-sm">
                            대상: {partyMonth - 1}월, {partyMonth}월 생일자
                        </p>
                    </div>

                    {loading ? (
                        <div className="py-8 flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                        </div>
                    ) : members.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            해당 기간 생일자가 없습니다.
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {members.map(member => (
                                <li key={member.id} className="flex items-center justify-between bg-slate-700/30 p-3 rounded-lg border border-slate-700/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-300">
                                            {member.part.substring(0, 1)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-200">{member.name}</div>
                                            <div className="text-xs text-slate-400">{member.part}</div>
                                        </div>
                                    </div>
                                    <div className="text-pink-400 font-bold bg-pink-950/30 px-2 py-1 rounded text-sm border border-pink-500/20">
                                        {member.birthDate.substring(2, 4)}.{member.birthDate.substring(4, 6)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700 bg-slate-900/50 flex gap-2">
                    <button
                        onClick={handleCopy}
                        disabled={loading || members.length === 0}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow transition-all active:scale-[0.98] flex justify-center items-center gap-2"
                    >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                        {copied ? '복사 완료!' : '명단 복사하기'}
                    </button>
                </div>
            </div>
        </div>
    )
}
