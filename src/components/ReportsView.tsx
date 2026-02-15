'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { Download, ChevronLeft, ChevronRight, FileSpreadsheet, Trophy, Calendar, Search } from 'lucide-react'
import { getSoloistStats, getYearlyReport } from '@/actions/stats'
import MemberStatsModal from './MemberStatsModal'

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

export default function ReportsView({ data, year, month }: ReportsViewProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'monthly' | 'yearly' | 'soloist'>('monthly')

    // Soloist Stats State
    const [soloistStats, setSoloistStats] = useState<any[]>([])
    // Yearly Stats State
    const [yearlyStats, setYearlyStats] = useState<any[]>([])
    // Search State
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResult, setSearchResult] = useState<{ id: number, name: string } | null>(null)

    // Load extra stats on tab change
    useEffect(() => {
        if (activeTab === 'soloist' && soloistStats.length === 0) {
            getSoloistStats(year, month).then(setSoloistStats)
        }
        if (activeTab === 'yearly' && yearlyStats.length === 0) {
            getYearlyReport(year).then(setYearlyStats)
        }
    }, [activeTab, year, month])

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

        // Sheet 1: Summary
        const summaryData = [
            ["월간 요약 리포트", `${year}년 ${month}월`],
            [],
            ["구분", "값"],
            ["전체 재적 대원", data.overall.totalActive + data.overall.totalResting],
            ["활동 대원", data.overall.totalActive],
            ["휴식 대원", data.overall.totalResting],
            ["종합 출석률", `${data.overall.rate}%`],
            [],
            ["파트별 현황"],
            ["파트", "재적", "활동", "휴식", "출석률"],
            ...data.byPart.map(p => [p.part, p.totalMembers, p.activeMembers, p.restingMembers, `${p.rate}%`])
        ]
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(wb, wsSummary, "요약")

        // Sheet 2: Resting Members
        const restingData = [
            ["휴식 대원 명단", `${year}년 ${month}월`],
            [],
            ["이름", "파트"],
            ...data.restingList.map(m => [m.name, m.part])
        ]
        const wsResting = XLSX.utils.aoa_to_sheet(restingData)
        XLSX.utils.book_append_sheet(wb, wsResting, "휴식대원")

        // Sheet 3: Soloists (if loaded)
        if (soloistStats.length > 0) {
            const soloistData = [
                ["솔리스트 출석 현황", `${year}년 ${month}월`],
                [],
                ["이름", "파트", "토요일 출석", "주일 출석", "총 합계"],
                ...soloistStats.map(s => [s.name, s.part, s.saturdayCount, s.sundayCount, s.total])
            ]
            const wsSolo = XLSX.utils.aoa_to_sheet(soloistData)
            XLSX.utils.book_append_sheet(wb, wsSolo, "솔리스트")
        }

        // Save File
        XLSX.writeFile(wb, `Choir_Report_${year}_${month}.xlsx`)
    }

    // Dummy Search Logic (Client side filter of a full list would be better but let's just make a mock for now or use server action?)
    // Actually we don't have a lookup action yet. 
    // Let's rely on the MemberStatsModal taking an ID. 
    // We need to Find the ID First.
    // For now, let's skip search or implement simple client-side search if we passed all members?
    // We only passed stats. 
    // Let's focus on the Tabs first.

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
            {/* Header / Month Nav */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                <div className="flex items-center gap-4">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                        <ChevronLeft />
                    </button>
                    <h1 className="text-2xl font-bold text-amber-100 min-w-[180px] text-center">
                        {year}년 {month}월
                    </h1>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                        <ChevronRight />
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleDownloadExcel}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg transition-all active:scale-95 text-sm"
                    >
                        <FileSpreadsheet size={18} />
                        엑셀 저장
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-slate-800 p-1 rounded-xl w-fit mx-auto border border-slate-700 overflow-x-auto max-w-full">
                <button
                    onClick={() => setActiveTab('monthly')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'monthly' ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    📆 월간 통계
                </button>
                <button
                    onClick={() => setActiveTab('yearly')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'yearly' ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    📈 연간 흐름
                </button>
                <button
                    onClick={() => setActiveTab('soloist')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'soloist' ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    🎤 솔리스트
                </button>
            </div>

            {/* Content Area */}
            {activeTab === 'monthly' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
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
                                    {data.byPart.map((part) => (
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

        </div>
    )
}
