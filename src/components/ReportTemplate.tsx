'use client'

import React, { forwardRef } from 'react'
import { WeeklyStat } from '@/actions/stats'

interface WeeklyReportData {
    registeredRow: WeeklyStat;
    weeklyRows: WeeklyStat[];
    monthlyStats: WeeklyStat[];
}

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

interface ReportProps {
    data: ReportData;
    weeklyData: WeeklyReportData;
    year: number;
    month: number;
    author: string;
    date: string;
}

export const ReportTemplate = forwardRef<HTMLDivElement, ReportProps>(({ data, weeklyData, year, month, author, date }, ref) => {
    return (
        <div ref={ref} className="p-8 bg-white text-black print:p-0">
            {/* Print Styles */}
            <style type="text/css" media="print">
                {`
                @page { size: A4; margin: 20mm; }
                body { -webkit-print-color-adjust: exact; }
                table { border-collapse: collapse; width: 100%; font-size: 10pt; margin-bottom: 20px; }
                th, td { border: 1px solid #000; padding: 5px 3px; text-align: center; }
                th { background-color: #f0f0f0; font-weight: bold; }
                .title { font-size: 24pt; font-weight: bold; text-align: center; margin-bottom: 30px; }
                .header-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 11pt; }
                .footer { margin-top: 20px; text-align: right; font-size: 10pt; }
                .section-title { font-size: 14pt; font-weight: bold; margin-top: 20px; margin-bottom: 5px; }
            `}
            </style>

            {/* Title */}
            <div className="title">
                {year}년 {month}월 갈보리찬양대 출석통계
            </div>

            {/* Header Info */}
            <div className="header-row">
                <div style={{ visibility: 'hidden' }}>Left</div>
                <div className="font-bold border px-4 py-1 border-black">
                    갈보리찬양대
                </div>
            </div>

            {/* Main Table (Weekly Data) */}
            <table>
                <thead>
                    <tr className="bg-gray-100">
                        <th style={{ width: '15%' }}>구분</th>
                        <th style={{ width: '10%' }}>소프라노</th>
                        <th style={{ width: '10%' }}>알토</th>
                        <th style={{ width: '10%' }}>테너</th>
                        <th style={{ width: '10%' }}>베이스</th>
                        <th style={{ width: '10%' }}>신입</th>
                        <th style={{ width: '10%' }}>재적</th>
                        <th style={{ width: '10%' }}>계</th>
                        <th style={{ width: '10%' }}>%</th>
                    </tr>
                </thead>
                <tbody>
                    {/* 1. Registered Row */}
                    <tr>
                        <td className="font-bold">{weeklyData.registeredRow.label}</td>
                        <td>{weeklyData.registeredRow.soprano}</td>
                        <td>{weeklyData.registeredRow.alto}</td>
                        <td>{weeklyData.registeredRow.tenor}</td>
                        <td>{weeklyData.registeredRow.bass}</td>
                        <td>{weeklyData.registeredRow.newCount}</td>
                        <td className="bg-gray-50 font-bold">{weeklyData.registeredRow.registered}</td>
                        <td className="font-bold">{weeklyData.registeredRow.total}</td>
                        <td>-</td>
                    </tr>

                    {/* 2. Weekly Rows */}
                    {weeklyData.weeklyRows.map((row, idx) => (
                        <tr key={idx}>
                            <td>{row.label}</td>
                            <td>{row.soprano}</td>
                            <td>{row.alto}</td>
                            <td>{row.tenor}</td>
                            <td>{row.bass}</td>
                            <td>{row.newCount}</td>
                            <td className="bg-gray-50">{row.registered}</td>
                            <td>{row.total}</td>
                            <td className="font-bold">{row.rate !== null ? `${row.rate}%` : '-'}</td>
                        </tr>
                    ))}

                    {/* 3. Monthly Averages */}
                    {weeklyData.monthlyStats.map((row, idx) => (
                        <tr key={`avg-${idx}`} className="bg-gray-50 font-bold">
                            <td>{row.label}</td>
                            <td>{row.soprano}</td>
                            <td>{row.alto}</td>
                            <td>{row.tenor}</td>
                            <td>{row.bass}</td>
                            <td>{row.newCount}</td>
                            <td>{row.registered}</td>
                            <td>{row.total}</td>
                            <td>{row.rate !== null ? `${row.rate}%` : '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Additional Lists (Optional but useful context) */}
            <div className="grid grid-cols-2 gap-8 text-sm mt-8 border-t border-black pt-4">
                <div>
                    <h4 className="font-bold mb-2">∎ 휴식 대원 명단:</h4>
                    <p className="leading-relaxed text-xs">
                        {data.restingList.length > 0
                            ? data.restingList.map(m => `${m.name}(${m.part})`).join(', ')
                            : '없음'}
                    </p>
                </div>
                <div>
                    <h4 className="font-bold mb-2">∎ 신입 대원 명단:</h4>
                    <p className="leading-relaxed text-xs">
                        {data.newMemberList.length > 0
                            ? data.newMemberList.map(m => `${m.name}(${m.part})`).join(', ')
                            : '없음'}
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="footer">
                작성일: {date} / 작성자: {author}
            </div>
        </div>
    )
})

ReportTemplate.displayName = 'ReportTemplate'
