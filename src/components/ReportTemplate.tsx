'use client'

import React, { forwardRef } from 'react'

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

interface ReportTemplateProps {
    data: ReportData
    year: number
    month: number
    author: string
    date: string
}

export const ReportTemplate = forwardRef<HTMLDivElement, ReportTemplateProps>((props, ref) => {
    const { data, year, month, author, date } = props

    return (
        <div ref={ref} className="p-8 bg-white text-black font-serif" style={{ width: '210mm', margin: '0 auto' }}>
            <style type="text/css" media="print">
                {`
                    @page { size: A4; margin: 15mm; }
                    html, body { height: auto; }
                `}
            </style>

            {/* Header */}
            <div className="text-center mb-8 pb-4 border-b-2 border-black">
                <h1 className="text-2xl font-bold mb-2">갈보리 찬양대 출석현황 보고</h1>
                <h2 className="text-lg">({year}년 {month}월)</h2>
            </div>

            {/* Overall Summary */}
            <div className="mb-6">
                <h3 className="text-base font-bold mb-2 border-l-4 border-black pl-2">1. 총괄 현황</h3>
                <table className="w-full border-collapse border border-black text-center text-sm">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-2 w-1/4">구분</th>
                            <th className="border border-black p-2 w-1/4">재적 대원</th>
                            <th className="border border-black p-2 w-1/4">활동 대원</th>
                            <th className="border border-black p-2 w-1/4">출석률 (종합)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-black p-2 font-bold">합계</td>
                            <td className="border border-black p-2">{data.overall.totalActive + data.overall.totalResting}명</td>
                            <td className="border border-black p-2">{data.overall.totalActive}명</td>
                            <td className="border border-black p-2 font-bold text-base">{data.overall.rate}%</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Part Stats */}
            <div className="mb-6">
                <h3 className="text-base font-bold mb-2 border-l-4 border-black pl-2">2. 파트별 상세 현황</h3>
                <table className="w-full border-collapse border border-black text-center text-xs">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-1.5">파트</th>
                            <th className="border border-black p-1.5">재적</th>
                            <th className="border border-black p-1.5">활동</th>
                            <th className="border border-black p-1.5">휴식</th>
                            <th className="border border-black p-1.5">출석률</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.byPart.map((p) => (
                            <tr key={p.part}>
                                <td className="border border-black p-1.5 font-bold">{p.part}</td>
                                <td className="border border-black p-1.5">{p.totalMembers}</td>
                                <td className="border border-black p-1.5">{p.activeMembers}</td>
                                <td className="border border-black p-1.5 text-gray-500">{p.restingMembers}</td>
                                <td className="border border-black p-1.5 font-bold">{p.rate}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Special Notes (Resting/New/Withdrawn) */}
            <div className="mb-8">
                <h3 className="text-base font-bold mb-2 border-l-4 border-black pl-2">3. 특이사항 (변동 내역)</h3>
                <div className="border border-black p-3 min-h-[100px] text-xs">
                    {/* Resting Members */}
                    <div className="mb-3">
                        <h4 className="font-bold mb-1">∎ 휴식 대원 명단:</h4>
                        <p className="pl-2 leading-relaxed">
                            {data.restingList.length > 0
                                ? data.restingList.map(m => `${m.name}(${m.part})`).join(', ')
                                : '없음'}
                        </p>
                    </div>
                    {/* Withdrawn Members */}
                    <div>
                        <h4 className="font-bold mb-1">∎ 제적/탈퇴 명단:</h4>
                        <p className="pl-2 leading-relaxed">
                            {data.withdrawnList.length > 0
                                ? data.withdrawnList.map(m => `${m.name}(${m.part}, ${new Date(m.date).toLocaleDateString()})`).join(', ')
                                : '없음'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer Signature */}
            <div className="mt-12 text-right space-y-2 pr-4">
                <p className="text-base font-bold">{date}</p>
                <br />
                <div className="flex justify-end items-end gap-3">
                    <span className="text-lg font-bold">담당자 :</span>
                    <span className="text-lg font-bold border-b border-black min-w-[120px] text-center pb-1">{author}</span>
                    <span className="text-lg font-bold">(인)</span>
                </div>
            </div>

            {/* Footer Text */}
            <div className="mt-10 text-center text-gray-400 text-[10px]">
                갈보리 찬양대 출석 관리 시스템
            </div>
        </div>
    )
})

ReportTemplate.displayName = 'ReportTemplate'
