'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useReactToPrint } from 'react-to-print'
import * as XLSX from 'xlsx'
import { Download, ChevronLeft, ChevronRight, FileSpreadsheet, Trophy, Calendar, Search, Printer, Users } from 'lucide-react'
import { getSoloistStats, getYearlyReport, WeeklyStat } from '@/actions/stats'
import { getDailyReport, DailyReportData } from '@/actions/reports'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import MemberStatsModal from './MemberStatsModal'
import { ReportTemplate } from './ReportTemplate'
import { useAuth } from '@/contexts/AuthContext'
import AttendanceImportModal from './AttendanceImportModal'

interface ReportData {
    overall: {
        totalRegistered: number;
        totalActive: number;
        totalResting: number;
        totalNew: number;
        rate: number;
        rateSat: number;
        rateSun: number;
    };
    byPart: {
        part: string;
        totalMembers: number;
        activeMembers: number;
        restingMembers: number;
        newMembers: number;
        attendCount: number;
        attendSat: number;
        attendSun: number;
        rate: number;
        rateSat: number;
        rateSun: number;
    }[];
    withdrawnList: { name: string; part: string; date: Date }[];
    restingList: { name: string; part: string }[];
    newMemberList: { name: string; part: string }[];
}

export interface WeeklyReportData {
    registeredRow: WeeklyStat;
    weeklyRows: WeeklyStat[];
    monthlyStats: WeeklyStat[];
}

interface ReportsViewProps {
    data: ReportData;
    weeklyData: WeeklyReportData;
    year: number;
    month: number;
}

const shortenPartName = (name: string) => {
    return name
        .replace('Soprano', 'Sop')
        .replace('Alto', 'Alt')
        .replace('Tenor', 'Ten')
}

export default function ReportsView({ data, weeklyData, year, month }: ReportsViewProps) {
    const { user } = useAuth()
    const router = useRouter()

    const isAdmin = user?.role === 'ADMIN'
    const isLeader = user?.role === 'LEADER'
    const myPart = user?.part

    const [activeTab, setActiveTab] = useState<'monthly' | 'yearly' | 'soloist' | 'weekly'>('monthly')

    // Set default tab based on role on mount
    useEffect(() => {
        // Admin prefers Monthly view
        setActiveTab('monthly')
    }, [])

    const [isImportModalOpen, setIsImportModalOpen] = useState(false)

    // Filter data for Leaders
    const filteredByPart = isAdmin
        ? data.byPart
        : data.byPart.filter(p => p.part === myPart)

    // Hide overall stats for leaders if desired, or keep them? 
    // Usually leaders want to see their part vs others, but user asked for "only their part".
    // Let's safe-guard: if strict, hide other parts.

    // Weekly Report State
    const [reportDate, setReportDate] = useState(new Date())
    const [dailyReport, setDailyReport] = useState<DailyReportData | null>(null)
    const [generatedText, setGeneratedText] = useState('')

    // Soloist Stats State
    const [soloistStats, setSoloistStats] = useState<any[]>([])
    // Yearly Stats State
    const [yearlyStats, setYearlyStats] = useState<any[]>([])

    // Load extra stats on tab change
    useEffect(() => {
        if (activeTab === 'soloist' && soloistStats.length === 0) {
            getSoloistStats(year, month).then(setSoloistStats)
        }
        if (activeTab === 'yearly' && yearlyStats.length === 0) {
            const targetPart = isLeader ? myPart : undefined
            getYearlyReport(year, targetPart).then(setYearlyStats)
        }
        if (activeTab === 'weekly') {
            fetchDailyReport(reportDate)
        }
    }, [activeTab, year, month, reportDate, isAdmin, isLeader, myPart]) // Added dependencies

    const fetchDailyReport = async (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        try {
            const data = await getDailyReport(dateStr)
            setDailyReport(data)
            generateReportText(data, date)
        } catch (error) {
            console.error(error)
        }
    }

    const generateReportText = (report: DailyReportData, date: Date) => {
        const dateFormatted = format(date, 'M월 d일 (EEE)', { locale: ko })
        let text = `[${dateFormatted} 갈보리찬양대 출석 보고]\n\n`
        text += `총원: ${report.totalMembers}명 / 출석: ${report.totalPresent}명`
        if (report.totalLate > 0) text += ` (지각 ${report.totalLate})`
        text += ` / 출석률: ${report.attendanceRate}%\n\n`

        report.parts.forEach(p => {
            const partName = shortenPartName(p.part)
            // Format: Sop A: 12/15 (80%) - 결석: 김OO, 이OO
            text += `${partName}: ${p.present}/${p.total}`
            if (p.late > 0) text += `(+${p.late})`

            const absentList = p.absentMembers.length > 0 ? ` (결석: ${p.absentMembers.join(', ')})` : ''
            text += `${absentList}\n`
        })

        text += `\n이상입니다.`
        setGeneratedText(text)
    }

    // Kakao Share Setup
    const [isKakaoInitialized, setIsKakaoInitialized] = useState(false)
    const [isSdkLoaded, setIsSdkLoaded] = useState(false)
    const KAKAO_JS_KEY = '2d246c6c619b67ce0d182428f6e591a2'

    useEffect(() => {
        // Load Kakao SDK
        if ((window as any).Kakao) {
            setIsSdkLoaded(true)
        } else {
            const script = document.createElement('script')
            script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js'
            script.onload = () => {
                setIsSdkLoaded(true)
            }
            document.head.appendChild(script)
        }
    }, [])

    useEffect(() => {
        if (isSdkLoaded && !isKakaoInitialized) {
            const Kakao = (window as any).Kakao
            if (Kakao && !Kakao.isInitialized()) {
                try {
                    Kakao.init(KAKAO_JS_KEY)
                    setIsKakaoInitialized(true)
                } catch (e) {
                    console.error('Kakao Init failed', e)
                }
            } else if (Kakao && Kakao.isInitialized()) {
                setIsKakaoInitialized(true)
            }
        }
    }, [isSdkLoaded, isKakaoInitialized])

    const handleKakaoShare = () => {
        if (soloistStats.length === 0) return alert('데이터가 없습니다.')
        if (!isKakaoInitialized) return alert('카카오톡 SDK가 아직 로드되지 않았습니다.')

        let text = `[${month}월 솔리스트 토요연습]\n\n`

        soloistStats.forEach((s, index) => {
            text += `${index + 1}. ${s.name}(${shortenPartName(s.part)}): ${s.saturdayCount}회\n`
        })

        text += `\n총 ${soloistStats.length}명`

        const Kakao = (window as any).Kakao
        Kakao.Share.sendDefault({
            objectType: 'text',
            text: text,
            link: {
                mobileWebUrl: 'https://choir-master.vercel.app',
                webUrl: 'https://choir-master.vercel.app',
            },
            buttonTitle: '앱에서 보기',
        })
    }

    // Previous Copy Text Function (kept for Admin tab if needed, but Soloist uses Kakao now)
    const handleCopyText = () => {
        navigator.clipboard.writeText(generatedText)
        alert("리포트가 복사되었습니다! 카톡방에 붙여넣으세요.")
    }

    // Printing Setup
    const [reportAuthor, setReportAuthor] = useState('서기 김준구')
    const componentRef = useRef<HTMLDivElement>(null)
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `갈보리찬양대_출석보고_${year}년${month}월`,
    })

    // Month Navigation
    const handlePrevMonth = () => {
        let newMonth = month - 1
        let newYear = year
        if (newMonth < 1) { newMonth = 12; newYear -= 1; }
        router.push(`/reports?year=${newYear}&month=${newMonth}`)
    }

    const handleNextMonth = () => {
        let newMonth = month + 1
        let newYear = year
        if (newMonth > 12) { newMonth = 1; newYear += 1; }
        router.push(`/reports?year=${newYear}&month=${newMonth}`)
    }

    const handleDownloadExcel = () => {
        const wb = XLSX.utils.book_new()

        // 1. Prepare Data ROWS matches PDF Table
        // Header Row
        const wsData: (string | number | null)[][] = [
            [`${year}년 ${month}월 갈보리찬양대 출석통계`],
            [],
            ["구분", "소프라노", "알토", "테너", "베이스", "신입", "재적", "계", "%"],
        ]

        // 2. Registered Row (Top)
        wsData.push([
            weeklyData.registeredRow.label,
            weeklyData.registeredRow.soprano,
            weeklyData.registeredRow.alto,
            weeklyData.registeredRow.tenor,
            weeklyData.registeredRow.bass,
            weeklyData.registeredRow.newCount,
            weeklyData.registeredRow.registered,
            weeklyData.registeredRow.total,
            '-'
        ])

        // 3. Weekly Rows
        weeklyData.weeklyRows.forEach(row => {
            wsData.push([
                row.label,
                row.soprano,
                row.alto,
                row.tenor,
                row.bass,
                row.newCount,
                row.registered,
                row.total,
                row.rate !== null ? `${row.rate}%` : '-'
            ])
        })

        // 4. Monthly Averages
        weeklyData.monthlyStats.forEach(row => {
            wsData.push([
                row.label,
                row.soprano,
                row.alto,
                row.tenor,
                row.bass,
                row.newCount,
                row.registered,
                row.total,
                row.rate !== null ? `${row.rate}%` : '-'
            ])
        })

        // 5. Create Sheet
        const ws = XLSX.utils.aoa_to_sheet(wsData)

        // 6. Merge Title (A1:I1)
        if (!ws['!merges']) ws['!merges'] = []
        ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } })

        // 7. Column Widths
        ws['!cols'] = [
            { wch: 15 }, // 구분
            { wch: 10 }, // Sop
            { wch: 10 }, // Alt
            { wch: 10 }, // Ten
            { wch: 10 }, // Bass
            { wch: 10 }, // New
            { wch: 10 }, // Reg
            { wch: 10 }, // Total
            { wch: 10 }  // Rate
        ]

        XLSX.utils.book_append_sheet(wb, ws, "월간보고")

        // Optional: Additional Sheet for Lists (Resting, New, Withdrawn)
        const listData = [
            ["구분", "이름", "파트", "날짜/비고"],
            ...data.newMemberList.map(m => ["신입", m.name, m.part, ""]),
            ...data.restingList.map(m => ["휴식", m.name, m.part, ""]),
            ...data.withdrawnList.map(m => ["제적/탈퇴", m.name, m.part, format(new Date(m.date), 'yyyy-MM-dd')])
        ]

        if (listData.length > 1) {
            const wsLists = XLSX.utils.aoa_to_sheet(listData)
            wsLists['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }]
            XLSX.utils.book_append_sheet(wb, wsLists, "명단관리")
        }

        XLSX.writeFile(wb, `갈보리찬양대_월간보고_${year}년_${month}월.xlsx`)
    }

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
            {/* Header / Month Nav */}
            <div className="relative">
                {/* Back Button - Floating/Distinct */}
                <button
                    onClick={() => router.push('/dashboard')}
                    className="absolute -top-10 left-0 flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-full shadow-sm transition-all active:scale-95 text-xs font-bold"
                >
                    <ChevronLeft size={14} strokeWidth={3} />
                    <span>대시보드</span>
                </button>

                {/* Naver Band Link - Right Side Balance */}
                <a
                    href="https://band.us/band/2806346"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute -top-10 right-0 flex items-center gap-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-full shadow-sm transition-all active:scale-95 text-xs font-bold"
                >
                    <span>찬양대 밴드</span>
                    <Download size={14} strokeWidth={3} className="rotate-[-90deg]" />
                </a>

                <div className="flex flex-col gap-2 bg-slate-800 px-4 py-3 rounded-xl border border-slate-700 shadow-xl mt-8">
                    {/* Date Navigation - Compact */}
                    <div className="flex items-center justify-center gap-4 w-full relative">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-700/50 rounded-full text-slate-400 hover:text-white transition-all active:scale-90 hover:bg-slate-700">
                            <ChevronLeft size={20} />
                        </button>
                        <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 min-w-[140px] text-center tracking-tight drop-shadow-sm">
                            {year}년 {month}월
                        </h1>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-slate-700/50 rounded-full text-slate-400 hover:text-white transition-all active:scale-90 hover:bg-slate-700">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Admin Tools - Compact */}
                    {user?.role === 'ADMIN' && (
                        <div className="flex flex-col md:flex-row gap-2 pt-2 border-t border-slate-700/50 mt-1">
                            <div className="flex-1 flex gap-2">
                                <input
                                    type="text"
                                    className="bg-slate-900 text-white px-3 py-2 rounded-lg text-sm border border-slate-600 focus:outline-none focus:border-amber-500 w-full md:w-32 placeholder-slate-500 text-center md:text-left"
                                    placeholder="담당자 이름"
                                    value={reportAuthor}
                                    onChange={(e) => setReportAuthor(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handlePrint()}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95 text-xs whitespace-nowrap"
                                >
                                    <Printer size={14} />
                                    <span className="hidden md:inline">보고서 출력</span>
                                    <span className="md:hidden">출력</span>
                                </button>
                                <button
                                    onClick={handleDownloadExcel}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95 text-xs whitespace-nowrap"
                                >
                                    <FileSpreadsheet size={14} />
                                    <span className="hidden md:inline">엑셀 저장</span>
                                    <span className="md:hidden">엑셀</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 md:flex gap-2 bg-slate-800 p-1 rounded-xl w-full border border-slate-700">
                <button
                    onClick={() => setActiveTab('weekly')}
                    className={`flex-1 px-4 py-3 md:py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1 ${activeTab === 'weekly' ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                >
                    📝 주간리포트
                </button>
                <button
                    onClick={() => setActiveTab('monthly')}
                    className={`flex-1 px-4 py-3 md:py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1 ${activeTab === 'monthly' ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                >
                    📆 월간통계
                </button>
                {/* Yearly and Soloist tabs can remain visible to all or restricted similarly */}
                <button
                    onClick={() => setActiveTab('yearly')}
                    className={`flex-1 px-4 py-3 md:py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1 ${activeTab === 'yearly' ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                >
                    📈 연간리포트
                </button>
                <button
                    onClick={() => setActiveTab('soloist')}
                    className={`flex-1 px-4 py-3 md:py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1 ${activeTab === 'soloist' ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                >
                    🎤 솔리스트
                </button>
            </div>

            {/* Content Area */}
            {activeTab === 'weekly' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 relative overflow-hidden">
                        {/* Decorative Icon */}
                        <div className="absolute -top-6 -right-6 text-slate-700/20 rotate-12 pointer-events-none">
                            <Calendar size={120} strokeWidth={1} />
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 border-b border-slate-700 pb-6 relative z-10">
                            <h3 className="font-bold text-lg text-slate-200">
                                일일/주간 출석 현황
                            </h3>
                            <div className="flex items-center gap-3 bg-slate-900/50 p-1.5 pl-3 rounded-lg border border-slate-700/50 shadow-inner">
                                <input
                                    type="date"
                                    value={format(reportDate, 'yyyy-MM-dd')}
                                    onChange={(e) => {
                                        const d = new Date(e.target.value)
                                        setReportDate(d)
                                        fetchDailyReport(d)
                                    }}
                                    className="bg-transparent border-none text-white text-sm focus:ring-0 cursor-pointer text-center font-bold tracking-wide"
                                />
                                <div className="h-5 w-px bg-slate-700"></div>
                                <button
                                    onClick={() => fetchDailyReport(reportDate)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                                >
                                    <span>조회</span>
                                    <Search size={14} />
                                </button>
                            </div>
                        </div>

                        {dailyReport ? (
                            <div className={`grid ${isAdmin ? 'md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
                                {/* Preview Card */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-1 shadow-sm">
                                            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">전체 출석</div>
                                            <div className="text-2xl font-black text-green-400">{dailyReport.totalPresent}명</div>
                                        </div>
                                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-1 shadow-sm">
                                            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">결석/미체크</div>
                                            <div className="text-2xl font-black text-rose-400">
                                                {dailyReport.totalMembers - dailyReport.totalPresent - dailyReport.totalLate}명
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                                        <h4 className="font-bold text-slate-300 mb-3 text-sm">파트별 상세</h4>
                                        <div className="space-y-3">
                                            {(isAdmin ? dailyReport.parts : dailyReport.parts.filter(p => p.part === myPart)).map(p => (
                                                <div key={p.part} className="border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-indigo-300 font-bold text-sm">{shortenPartName(p.part)}</span>
                                                        <span className="text-slate-400 text-xs">
                                                            {p.present} / {p.total} ({p.rate}%)
                                                        </span>
                                                    </div>
                                                    {p.absentMembers.length > 0 && (
                                                        <div className="text-xs text-rose-400/80">
                                                            결석: {p.absentMembers.join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {!isAdmin && dailyReport.parts.filter(p => p.part === myPart).length === 0 && (
                                                <div className="text-center text-slate-500 text-sm py-4">
                                                    해당 파트 데이터가 없습니다.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Text Generator - Only for Admin */}
                                {isAdmin && (
                                    <div className="flex flex-col h-full">
                                        <h4 className="font-bold text-slate-300 mb-2 flex justify-between items-center">
                                            <span>📋 카톡 공유용 텍스트</span>
                                            <button
                                                onClick={handleCopyText}
                                                className="text-xs bg-amber-500 text-black px-2 py-1 rounded font-bold hover:bg-amber-400 active:scale-95 transition-all"
                                            >
                                                복사하기
                                            </button>
                                        </h4>
                                        <textarea
                                            className="flex-1 w-full bg-slate-900 border border-slate-600 rounded-xl p-4 text-sm text-slate-300 font-mono leading-relaxed resize-none focus:outline-none focus:border-amber-500"
                                            value={generatedText}
                                            onChange={(e) => setGeneratedText(e.target.value)}
                                            readOnly={false} // Allow manual edit
                                        />
                                        <p className="text-xs text-slate-500 mt-2 text-right">
                                            * 내용은 수정 가능합니다. 수정 후 복사하세요.
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-10 text-center text-slate-500">데이터를 불러오는 중...</div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'monthly' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* Refresh Control & Admin Link */}
                    <div className="flex justify-end mb-2 gap-2">
                        {user?.role === 'ADMIN' && (
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-green-500/30 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                            >
                                <FileSpreadsheet size={14} />
                                이전출석등록
                            </button>
                        )}
                        <button
                            onClick={() => router.push('/admin/members?back=/reports')}
                            className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500/30 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                        >
                            <Users size={14} />
                            대원 관리
                        </button>
                        <button
                            onClick={() => router.refresh()}
                            className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-500/30 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                        >
                            <span className="text-sm font-bold animate-spin-slow">↻</span>
                            통계 새로고침
                        </button>
                    </div>

                    <AttendanceImportModal
                        isOpen={isImportModalOpen}
                        onClose={() => setIsImportModalOpen(false)}
                        onSuccess={() => {
                            setIsImportModalOpen(false)
                            router.refresh()
                        }}
                    />

                    {/* Overview Section */}
                    <div className="space-y-4">
                        {/* 1. Overall Rate - Hero Card */}
                        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col items-center justify-center relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600"></div>
                            <div className="text-slate-400 font-bold mb-2 uppercase tracking-widest text-sm">종합 출석률</div>
                            <div className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-amber-500 drop-shadow-sm">
                                {data.overall.rate}%
                            </div>
                        </div>

                        {/* 2. Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Active */}
                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-1 hover:bg-slate-700/50 transition-colors">
                                <div className="text-slate-400 text-xs font-bold">활동 대원</div>
                                <div className="text-2xl font-bold text-white">{data.overall.totalActive}명</div>
                            </div>
                            {/* New - Highlighted */}
                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-1 relative overflow-hidden hover:bg-slate-700/50 transition-colors">
                                <div className="absolute top-2 right-2">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                                </div>
                                <div className="text-green-400 text-xs font-bold">신입 대원</div>
                                <div className="text-2xl font-bold text-green-300">{data.overall.totalNew}명</div>
                            </div>
                            {/* Resting */}
                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-1 hover:bg-slate-700/50 transition-colors">
                                <div className="text-slate-500 text-xs font-bold">휴식 대원</div>
                                <div className="text-2xl font-bold text-slate-400">{data.overall.totalResting}명</div>
                            </div>
                            {/* Total */}
                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-1 hover:bg-slate-700/50 transition-colors">
                                <div className="text-slate-500 text-xs font-bold">전체 재적</div>
                                <div className="text-2xl font-bold text-slate-500">{data.overall.totalActive + data.overall.totalResting}명</div>
                            </div>
                        </div>
                    </div>

                    {/* Part Table */}
                    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-700 font-bold text-lg text-indigo-200">
                            파트별 현황
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900/50 text-slate-400 text-sm">
                                    <tr>
                                        <th className="px-2 py-3 font-medium whitespace-nowrap">파트</th>
                                        <th className="px-2 py-3 font-medium text-center whitespace-nowrap">출석률(%)</th>
                                        <th className="px-2 py-3 font-medium text-center whitespace-nowrap">활동</th>
                                        <th className="px-2 py-3 font-medium text-center whitespace-nowrap">휴식</th>
                                        <th className="px-2 py-3 font-medium text-center whitespace-nowrap">계</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {filteredByPart.map((part) => (
                                        <tr key={part.part} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="px-2 py-3 font-medium text-slate-200 whitespace-nowrap text-sm">{shortenPartName(part.part)}</td>
                                            <td className="px-2 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-10 h-1.5 bg-slate-700 rounded-full overflow-hidden hidden sm:block">
                                                        <div
                                                            className={`h-full ${part.rate >= 90 ? 'bg-amber-400' : part.rate >= 80 ? 'bg-green-400' : 'bg-slate-500'}`}
                                                            style={{ width: `${part.rate}%` }}
                                                        />
                                                    </div>
                                                    <span className={`font-bold text-sm ${part.rate >= 90 ? 'text-amber-400' : 'text-slate-300'}`}>
                                                        {part.rate}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-3 text-center text-slate-300 text-sm">{part.activeMembers}</td>
                                            <td className="px-2 py-3 text-center text-slate-500 text-sm">{part.restingMembers}</td>
                                            <td className="px-2 py-3 text-center text-slate-400 text-sm">{part.totalMembers}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Resting List */}
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 min-h-[160px] h-fit flex flex-col">
                            <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2">
                                💤 휴식 대원 명단
                            </h3>
                            {data.restingList.length > 0 ? (
                                <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
                                    {data.restingList.map((m, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-2 bg-slate-700/30 rounded border border-slate-700 text-sm">
                                            <span className="text-slate-200 font-medium">{m.name}</span>
                                            <span className="text-slate-500 text-xs">{m.part}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-slate-500 text-sm italic py-4 text-center flex-1">해당 없음</div>
                            )}
                        </div>

                        {/* Withdrawn List */}
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 min-h-[160px] h-fit flex flex-col">
                            <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2">
                                👋 제적/탈퇴 명단
                            </h3>
                            {data.withdrawnList.length > 0 ? (
                                <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
                                    {data.withdrawnList.map((m, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-2 bg-slate-700/30 rounded border border-slate-700 text-sm">
                                            <div className="flex flex-col">
                                                <span className="text-slate-200 font-medium">{m.name}</span>
                                                <span className="text-slate-500 text-xs">{new Date(m.date).toLocaleDateString()}</span>
                                            </div>
                                            <span className="text-slate-500 text-xs bg-slate-900 px-2 py-1 rounded">{m.part}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-slate-500 text-sm italic py-4 text-center flex-1">해당 없음</div>
                            )}
                        </div>
                    </div>
                </div>
            )}



            // ... (rest of component) ...

            {activeTab === 'soloist' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-slate-900/30">
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-lg text-amber-200 whitespace-nowrap">🎤 솔리스트 출석 현황 ({month}월)</h3>
                            <button
                                onClick={handleCopySoloistText}
                                className="bg-amber-500 hover:bg-amber-400 text-black px-2 py-1 rounded text-xs font-bold transition-colors active:scale-95 flex items-center gap-1"
                            >
                                <span>복사</span>
                            </button>
                        </div>
                        <div className="text-xs text-slate-500">※ 토요일 연습 횟수 포함</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900/50 text-slate-400 text-sm">
                                <tr>
                                    <th className="px-2 py-3 font-medium whitespace-nowrap">이름</th>
                                    <th className="px-2 py-3 font-medium whitespace-nowrap">파트</th>
                                    <th className="px-2 py-3 font-medium text-center text-indigo-300 whitespace-nowrap">토(연습)</th>
                                    <th className="px-2 py-3 font-medium text-center text-rose-300 whitespace-nowrap">일(예배)</th>
                                    <th className="px-2 py-3 font-medium text-center font-bold whitespace-nowrap">계</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {soloistStats.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">데이터를 불러오는 중...</td></tr>
                                ) : (
                                    soloistStats.map((s) => (
                                        <tr key={s.id} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="px-2 py-3 font-bold text-slate-200 whitespace-nowrap text-sm">{s.name}</td>
                                            <td className="px-2 py-3 text-slate-400 text-xs whitespace-nowrap">{shortenPartName(s.part)}</td>
                                            <td className="px-2 py-3 text-center font-bold text-indigo-200 bg-indigo-900/10 text-sm">{s.saturdayCount}</td>
                                            <td className="px-2 py-3 text-center font-bold text-rose-200 bg-rose-900/10 text-sm">{s.sundayCount}</td>
                                            <td className="px-2 py-3 text-center font-black text-amber-400 text-sm">{s.total}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'yearly' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <h3 className="font-bold text-lg text-slate-200 mb-6">📈 {year}년도 출석 추이</h3>
                        <div className="h-64 flex items-end gap-2 justify-between px-4">
                            {/* Simple Bar Chart Visualization */}
                            {yearlyStats.length === 0 ? (
                                <div className="w-full h-full flex items-center justify-center text-slate-500">데이터 로딩중...</div>
                            ) : (
                                yearlyStats.map((stat) => (
                                    <div key={stat.month} className="flex flex-col items-center gap-2 group flex-1">
                                        <div className="text-xs text-amber-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                                            {stat.count}
                                        </div>
                                        <div
                                            className="w-full max-w-[40px] bg-slate-600 rounded-t-lg hover:bg-amber-500 transition-all relative group-hover:shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                                            style={{ height: `${Math.min(100, (stat.count / 50) * 100)}%` }} // Rough scaling
                                        ></div>
                                        <div className="text-xs text-slate-400">{stat.month}월</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Report Template for Printing */}
            <div style={{ display: 'none' }}>
                <ReportTemplate
                    ref={componentRef}
                    data={data}
                    weeklyData={weeklyData}
                    year={year}
                    month={month}
                    author={reportAuthor}
                    date={format(new Date(), 'yyyy년 M월 d일')}
                />
            </div>
        </div>
    )
}
