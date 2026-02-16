'use client'

import { useEffect, useState } from 'react'
import { X, Copy, Check, MessageCircle, Loader2 } from 'lucide-react'
import { getBirthdayMembers } from '@/actions/members'

declare global {
    interface Window {
        Kakao: any
    }
}

interface BirthdayListModalProps {
    onClose: () => void
}

interface BirthdayMember {
    id: number
    name: string
    part: string
    birthDate: string | null
    day: string | undefined
}

export default function BirthdayListModal({ onClose }: BirthdayListModalProps) {
    const [loading, setLoading] = useState(true)
    const [members, setMembers] = useState<BirthdayMember[]>([])
    const [months, setMonths] = useState<number[]>([])
    const [copied, setCopied] = useState(false)
    const [kakaoKey, setKakaoKey] = useState('')
    const [isKakaoInitialized, setIsKakaoInitialized] = useState(false)
    const [isSdkLoaded, setIsSdkLoaded] = useState(false)

    useEffect(() => {
        // 1. Load saved key
        const savedKey = localStorage.getItem('kakao_js_key')
        if (savedKey) {
            setKakaoKey(savedKey)
        }

        // 2. Load Kakao SDK
        if (window.Kakao) {
            setIsSdkLoaded(true)
            return
        }

        const script = document.createElement('script')
        script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js'
        script.onload = () => {
            console.log('Kakao SDK loaded')
            setIsSdkLoaded(true)
        }
        document.head.appendChild(script)

        const fetchBirthdays = async () => {
            const today = new Date()
            const currentMonthIndex = today.getMonth() // 0-11

            // Calculate fixed bi-monthly pair (1-2, 3-4, 5-6...)
            const startMonth = Math.floor(currentMonthIndex / 2) * 2 + 1
            const endMonth = startMonth + 1

            setMonths([startMonth, endMonth])

            try {
                const data = await getBirthdayMembers([startMonth, endMonth])
                setMembers(data)
            } catch (error) {
                console.error("Failed to fetch birthdays", error)
            } finally {
                setLoading(false)
            }
        }

        fetchBirthdays()
    }, [])

    const initKakao = () => {
        if (!kakaoKey) {
            alert('API 키를 입력해주세요!')
            return
        }

        if (window.Kakao && !window.Kakao.isInitialized()) {
            try {
                window.Kakao.init(kakaoKey)
                setIsKakaoInitialized(true)
                localStorage.setItem('kakao_js_key', kakaoKey) // Save key
                alert('카카오 SDK 초기화 성공! (키가 저장되었습니다)')
            } catch (e) {
                alert('키가 올바르지 않거나 초기화 실패: ' + e)
            }
        } else if (window.Kakao && window.Kakao.isInitialized()) {
            setIsKakaoInitialized(true)
            localStorage.setItem('kakao_js_key', kakaoKey) // Save key
            alert('이미 초기화되었습니다. (키 저장 완료)')
        } else {
            alert('카카오 SDK가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.')
            console.error('Kakao SDK not found on window object')
        }
    }

    const getMonthMembers = (month: number) => {
        return members.filter(m => {
            if (!m.birthDate) return false
            const mMonth = parseInt(m.birthDate.substring(2, 4))
            return mMonth === month
        })
    }

    const formatForCopy = () => {
        const title = `[🎉 ${months[0]}~${months[1]}월 생일자 파티 명단]`

        let content = `${title}\n\n`

        months.forEach(month => {
            const monthList = getMonthMembers(month)
            content += `📅 ${month}월\n`
            if (monthList.length > 0) {
                monthList.forEach(m => {
                    const dateStr = `${parseInt(m.birthDate!.substring(2, 4))}/${parseInt(m.birthDate!.substring(4, 6))}`
                    content += `- ${m.name} (${m.part}, ${dateStr})\n`
                })
            } else {
                content += `- (대상자 없음)\n`
            }
            content += `\n`
        })

        content += `총 ${members.length}명입니다. 선물 준비 부탁드립니다! 🎁`
        return content
    }

    const handleCopy = async () => {
        const text = formatForCopy()
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy', err)
            alert('복사에 실패했습니다. 텍스트를 직접 드래그해서 복사해주세요.')
        }
    }

    const handleKakaoShare = () => {
        if (!window.Kakao || !window.Kakao.isInitialized()) {
            alert('먼저 API 키를 입력하고 초기화해주세요.')
            return
        }

        // Send default template
        window.Kakao.Share.sendDefault({
            objectType: 'text',
            text: formatForCopy(),
            link: {
                mobileWebUrl: 'https://choir-master.vercel.app',
                webUrl: 'https://choir-master.vercel.app',
            },
            buttonTitle: '앱에서 보기',
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-700 bg-slate-900 text-slate-100">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        🎂 생일자 명단 취합
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <Loader2 className="w-8 h-8 animate-spin mb-2 text-amber-500" />
                            <p>명단을 불러오는 중...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-amber-900/20 border border-amber-900/50 p-4 rounded-lg text-amber-200 text-sm mb-4">
                                <p className="font-bold flex items-center gap-2 mb-1">
                                    <MessageCircle size={16} />
                                    안내
                                </p>
                                이번 달({months[0]}월)과 다음 달({months[1]}월) 생일자를 자동으로 모았습니다. 아래 버튼을 눌러 복사하세요.
                            </div>

                            {/* Kakao Test Section */}
                            <div className="bg-yellow-400/10 border border-yellow-400/30 p-4 rounded-lg">
                                <label className="block text-xs font-bold text-yellow-500 mb-2 flex justify-between">
                                    <span>🟡 카카오 API 키 (브라우저 저장됨)</span>
                                    <span className={isSdkLoaded ? "text-green-400" : "text-red-400"}>
                                        {isSdkLoaded ? "SDK 준비됨" : "SDK 로딩중..."}
                                    </span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={kakaoKey}
                                        onChange={(e) => setKakaoKey(e.target.value)}
                                        placeholder="JavaScript 키를 붙여넣으세요"
                                        className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                                        disabled={isKakaoInitialized}
                                    />
                                    <button
                                        onClick={initKakao}
                                        disabled={isKakaoInitialized}
                                        className="bg-yellow-600 text-white text-xs px-3 py-1 rounded font-bold disabled:opacity-50"
                                    >
                                        {isKakaoInitialized ? '완료' : '등록'}
                                    </button>
                                </div>
                            </div>

                            {months.map(month => {
                                const list = getMonthMembers(month)
                                return (
                                    <div key={month} className="bg-slate-700/30 rounded-xl border border-slate-700 overflow-hidden">
                                        <div className="bg-slate-700/50 px-4 py-2 font-bold text-slate-200 flex justify-between items-center">
                                            <span>📅 {month}월</span>
                                            <span className="text-xs bg-slate-600 px-2 py-0.5 rounded-full text-slate-300">{list.length}명</span>
                                        </div>
                                        <div className="p-4">
                                            {list.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {list.map(member => (
                                                        <li key={member.id} className="flex items-center justify-between text-slate-300 text-sm border-b border-slate-700/50 pb-2 last:border-0 last:pb-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-white">{member.name}</span>
                                                                <span className="text-xs text-slate-500">{member.part}</span>
                                                            </div>
                                                            <div className="text-amber-400 font-mono">
                                                                {parseInt(member.birthDate!.substring(2, 4))}/{parseInt(member.birthDate!.substring(4, 6))}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-slate-500 text-sm italic text-center py-2">생일자가 없습니다.</p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-700 bg-slate-900 flex flex-col gap-3">
                    <button
                        onClick={handleCopy}
                        disabled={loading}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white transition-all
                            ${copied
                                ? 'bg-green-600 hover:bg-green-700 shadow-[0_0_15px_rgba(22,163,74,0.4)]'
                                : 'bg-amber-600 hover:bg-amber-700 shadow-[0_0_15px_rgba(217,119,6,0.2)] hover:scale-[1.02]'
                            }
                        `}
                    >
                        {copied ? (
                            <>
                                <Check size={18} />
                                복사 완료!
                            </>
                        ) : (
                            <>
                                <Copy size={18} />
                                명단 복사하기
                            </>
                        )}
                    </button>

                    {/* Kakao Share Button */}
                    {isKakaoInitialized && (
                        <button
                            onClick={handleKakaoShare}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-slate-900 bg-[#FEE500] hover:bg-[#FDD835] shadow-lg transition-all active:scale-95"
                        >
                            <MessageCircle size={18} className="fill-slate-900" />
                            카카오톡으로 공유하기
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
