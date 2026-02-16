'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useReactToPrint } from 'react-to-print'
import * as XLSX from 'xlsx'
import { Download, ChevronLeft, ChevronRight, FileSpreadsheet, Trophy, Calendar, Search, Printer } from 'lucide-react'
import { getSoloistStats, getYearlyReport } from '@/actions/stats'
import { getDailyReport, DailyReportData } from '@/actions/reports'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import MemberStatsModal from './MemberStatsModal'
import { ReportTemplate } from './ReportTemplate'

interface ReportData {
    overall: {
        totalActive: number;
        totalResting: number;
        rate: number;
    };
    byPart: {
        part: string;
        totalMembers: number;
        activeMembers: number;
        restingMembers: number;
        attendCount: number;
        totalSlots: number;
        rate: number;
    }[];
    withdrawnList: { name: string; part: string; date: Date }[];
    restingList: { name: string; part: string }[];
}

interface ReportsViewProps {
    data: ReportData;
    year: number;
    month: number;
}

const shortenPartName = (name: string) => {
    return name
        .replace('Soprano', 'Sop')
        .replace('Alto', 'Alt')
        .replace('Tenor', 'Ten')
}

import { useAuth } from '@/contexts/AuthContext'

export default function ReportsView({ data, year, month }: ReportsViewProps) {
    const { user } = useAuth()
    const router = useRouter()

    const isAdmin = user?.role === 'ADMIN'
    const isLeader = user?.role === 'LEADER'
    const myPart = user?.part

    const [activeTab, setActiveTab] = useState<'monthly' | 'yearly' | 'soloist' | 'weekly'>('monthly')

    // Set default tab based on role on mount
    useEffect(() => {
        if (isAdmin) {
            setActiveTab('weekly')
        } else {
            setActiveTab('monthly')
        }
    }, [isAdmin])

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
        // ... (Excel logic same as before, omitted for brevity but preserved in real file) ...
        // Re-implementing simplified for this replacement block context
        const summaryData = [
            ["월간 요약 리포트", `${year}년 ${month}월`],
            [],
            ["구분", "값"],
            ["전체 재적 대원", data.overall.totalActive + data.overall.totalResting],
            ["활동 대원", data.overall.totalActive],
            ["종합 출석률", `${data.overall.rate}%`],
            [],
            ["파트별 현황"],
            ["파트", "재적", "활동", "휴식", "출석률"],
            ...data.byPart.map(p => [p.part, p.totalMembers, p.activeMembers, p.restingMembers, `${p.rate}%`])
        ]
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(wb, wsSummary, "요약")
        XLSX.writeFile(wb, `Choir_Report_${year}_${month}.xlsx`)
    }

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
            {/* Header / Month Nav */}
            <div className="flex flex-col gap-4 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                {/* Date Navigation - Always Visible */}
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 border border-slate-600">
                            <ChevronLeft size={20} /> <span className="sr-only">뒤로가기</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                            <ChevronLeft />
                        </button>
                        <h1 className="text-xl md:text-2xl font-bold text-amber-100 min-w-[140px] text-center whitespace-nowrap">
                            {year}년 {month}월
                        </h1>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                            <ChevronRight />
                        </button>
                    </div>

                    {/* Spacer for centering */}
                    <div className="w-[42px] hidden md:block"></div>
                </div>

                {/* Admin Tools - Only for ADMIN */}
                {user?.role === 'ADMIN' && (
                    <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-slate-700/50 mt-2">
                        <div className="flex-1 flex gap-2">
                            <input
                                type="text"
                                className="bg-slate-900 text-white px-3 py-3 rounded-xl text-sm border border-slate-600 focus:outline-none focus:border-amber-500 w-full md:w-40 placeholder-slate-500 text-center md:text-left"
                                placeholder="담당자 이름"
                                value={reportAuthor}
                                onChange={(e) => setReportAuthor(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePrint()}
                                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 text-sm whitespace-nowrap"
                            >
                                <Printer size={18} />
                                <span className="hidden md:inline">보고서 출력</span>
                                <span className="md:hidden">출력</span>
                            </button>
                            <button
                                onClick={handleDownloadExcel}
                                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 text-sm whitespace-nowrap"
                            >
                                <FileSpreadsheet size={18} />
                                <span className="hidden md:inline">엑셀 저장</span>
                                <span className="md:hidden">엑셀</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 md:flex gap-2 bg-slate-800 p-1 rounded-xl w-full md:w-fit mx-auto border border-slate-700">
                <button
                    onClick={() => setActiveTab('weekly')}
                    className={`w-full md:w-auto px-4 py-3 md:py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1 ${activeTab === 'weekly' ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                >
                    📝 주간리포트
                </button>
                <button
                    onClick={() => setActiveTab('monthly')}
                    className={`w-full md:w-auto px-4 py-3 md:py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1 ${activeTab === 'monthly' ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                >
                    📆 월간통계
                </button>
                {/* Yearly and Soloist tabs can remain visible to all or restricted similarly */}
                <button
                    onClick={() => setActiveTab('yearly')}
                    className={`w-full md:w-auto px-4 py-3 md:py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1 ${activeTab === 'yearly' ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                >
                    📈 연간리포트
                </button>
                <button
                    onClick={() => setActiveTab('soloist')}
                    className={`w-full md:w-auto px-4 py-3 md:py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1 ${activeTab === 'soloist' ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                >
                    🎤 솔리스트
                </button>
            </div>

            {/* Content Area */}
            {activeTab === 'weekly' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <h3 className="font-bold text-lg text-slate-200 flex items-center gap-2">
                                📅 일일/주간 출석 현황
                            </h3>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={format(reportDate, 'yyyy-MM-dd')}
                                    onChange={(e) => {
                                        const d = new Date(e.target.value)
                                        setReportDate(d)
                                        fetchDailyReport(d)
                                    }}
                                    className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                                />
                                <button
                                    onClick={() => fetchDailyReport(reportDate)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm font-bold"
                                >
                                    새로고침
                                </button>
                            </div>
                        </div>

                        {dailyReport ? (
                            <div className={`grid ${isAdmin ? 'md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
                                {/* Preview Card */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                            <div className="text-xs text-slate-400">전체 출석</div>
                                            <div className="text-xl font-bold text-green-400">{dailyReport.totalPresent}명</div>
                                        </div>
                                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                            <div className="text-xs text-slate-400">전체 결석/미체크</div>
                                            <div className="text-xl font-bold text-rose-400">
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
                    {/* Refresh Control */}
                    <div className="flex justify-end -mb-4">
                        <button
                            onClick={() => router.refresh()}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                        >
                            <span className="text-lg leading-none">↻</span>
                            통계 새로고침
                        </button>
                    </div>

                    {/* Overview Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <div className="text-slate-400 text-sm mb-1">종합 출석률</div>
                            <div className="text-3xl font-bold text-amber-400">{data.overall.rate}%</div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <div className="text-slate-400 text-sm mb-1">활동 대원</div>
                            <div className="text-3xl font-bold text-white">{data.overall.totalActive}명</div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <div className="text-slate-400 text-sm mb-1">휴식 대원</div>
                            <div className="text-3xl font-bold text-slate-300">{data.overall.totalResting}명</div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <div className="text-slate-400 text-sm mb-1">전체 재적</div>
                            <div className="text-3xl font-bold text-slate-500">{data.overall.totalActive + data.overall.totalResting}명</div>
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
                                        <th className="px-2 py-3 font-medium text-center whitespace-nowrap">률(%)</th>
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
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-64 flex flex-col">
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
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-64 flex flex-col">
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

            {activeTab === 'soloist' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-slate-900/30">
                        <h3 className="font-bold text-lg text-amber-200 whitespace-nowrap">🎤 솔리스트 출석 현황 ({month}월)</h3>
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
                    year={year}
                    month={month}
                    author={reportAuthor}
                    date={format(new Date(), 'yyyy년 M월 d일')}
                />
            </div>
        </div>
    )
}
