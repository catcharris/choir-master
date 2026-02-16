'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, X, FileSpreadsheet, Check, AlertCircle, Loader2 } from 'lucide-react'
import { updateMembersBulk } from '@/actions/members'

interface BulkMemberUpdateProps {
    onClose: () => void
}

interface BulkData {
    name: string
    part: string
    churchTitle?: string
    birthDate?: string
    status?: 'MATCH' | 'NEW' | 'ERROR' // MATCH: Update existing, NEW: Create new (not implemented yet), ERROR: invalid
}

export default function BulkMemberUpdate({ onClose }: BulkMemberUpdateProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [file, setFile] = useState<File | null>(null)
    const [previewData, setPreviewData] = useState<BulkData[]>([])
    const [loading, setLoading] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [result, setResult] = useState<{ success: number, fail: number, errors: string[] } | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            parseExcel(selectedFile)
        }
    }

    const parseExcel = async (file: File) => {
        setLoading(true)
        const reader = new FileReader()
        reader.onload = (e) => {
            const data = e.target?.result
            if (data) {
                const workbook = XLSX.read(data, { type: 'binary' })
                const sheetName = workbook.SheetNames[0]
                const sheet = workbook.Sheets[sheetName]
                const json = XLSX.utils.sheet_to_json(sheet) as any[]

                // Normalize keys to handle whitespace or slight variations
                const normalizedJson = json.map(row => {
                    const newRow: any = {};
                    Object.keys(row).forEach(key => {
                        const cleanKey = key.trim().replace(/\s+/g, '');
                        newRow[cleanKey] = row[key];
                    });
                    return newRow;
                });

                const transformed = normalizedJson.map(row => {
                    // Try to find columns with normalized keys
                    // Expected: 이름, Name, name -> 이름, name
                    // But we stripped spaces: '이름', '파트', '상태', '직분', '생년월일'

                    const name = row['이름'] || row['Name'] || row['name']
                    const birthDateRaw = row['생년월일'] || row['BirthDate'] || row['birth'] || row['생년']
                    const title = row['직분'] || row['Title'] || row['title']
                    const statusRaw = row['상태'] || row['Status'] || row['State'] || row['Role'] || row['role']

                    // Format BirthDate (YYMMDD)
                    let birthDate = ''
                    if (birthDateRaw) {
                        const str = String(birthDateRaw).replace(/[^0-9]/g, '')
                        if (str.length === 8) birthDate = str.substring(2)
                        else if (str.length === 6) birthDate = str
                    }

                    // Normalize Part Name
                    let part = row['파트'] || row['Part'] || row['part']
                    if (part) {
                        part = String(part).trim()
                        const partMap: { [key: string]: string } = {
                            '소프라노A': 'Soprano A', 'SopranoA': 'Soprano A', 'SopA': 'Soprano A', 'Sop A': 'Soprano A',
                            '소프라노B': 'Soprano B', 'SopranoB': 'Soprano B', 'SopB': 'Soprano B', 'Sop B': 'Soprano B',
                            '소프라노B+': 'Soprano B+', 'SopranoB+': 'Soprano B+', 'SopB+': 'Soprano B+', 'Sop B+': 'Soprano B+',
                            '알토A': 'Alto A', 'AltoA': 'Alto A',
                            '알토B': 'Alto B', 'AltoB': 'Alto B',
                            '테너': 'Tenor', 'Tenor': 'Tenor',
                            '베이스': 'Bass', 'Bass': 'Bass'
                        }
                        // Normalize the part input itself (remove spaces for lookup)
                        const cleanPart = part.replace(/\s+/g, '');
                        // Check map with clean key too
                        if (partMap[cleanPart]) part = partMap[cleanPart]
                        else {
                            // Try original map just in case
                            const partMapOrig: { [key: string]: string } = {
                                '소프라노A': 'Soprano A', 'Soprano A': 'Soprano A', 'SopranoA': 'Soprano A', 'sop a': 'Soprano A', 'Sop A': 'Soprano A',
                                '소프라노B': 'Soprano B', 'Soprano B': 'Soprano B', 'SopranoB': 'Soprano B', 'sop b': 'Soprano B', 'Sop B': 'Soprano B',
                                '소프라노B+': 'Soprano B+', 'Soprano B+': 'Soprano B+', 'SopranoB+': 'Soprano B+', 'sop b+': 'Soprano B+', 'Sop B+': 'Soprano B+',
                                '알토A': 'Alto A', 'Alto A': 'Alto A', 'alto a': 'Alto A',
                                '알토B': 'Alto B', 'Alto B': 'Alto B', 'alto b': 'Alto B',
                                '테너': 'Tenor', 'Tenor': 'Tenor', 'tenor': 'Tenor',
                                '베이스': 'Bass', 'Bass': 'Bass', 'bass': 'Bass'
                            }
                            if (partMapOrig[part]) part = partMapOrig[part]
                        }
                    }

                    // Normalize Role (Status)
                    let role = undefined
                    if (statusRaw) {
                        const s = String(statusRaw).trim()
                        if (s === '정대원' || s === 'Regular') role = 'Regular'
                        else if (s.includes('신입') || s === 'New') role = 'New'
                        else if (s.includes('휴식') || s === 'Resting') role = 'Resting'
                        else if (s === '솔리스트' || s === 'Soloist') role = 'Soloist'
                    }

                    return {
                        name: name ? String(name).trim() : '',
                        part: part || '',
                        churchTitle: title ? String(title).trim() : undefined,
                        birthDate: birthDate || undefined,
                        role: role
                    }
                }).filter(item => item.name && item.part) // Valid rows only

                setPreviewData(transformed)
                if (transformed.length === 0 && json.length > 0) {
                    alert('데이터를 찾을 수 없습니다. 엑셀 헤더(이름, 파트)를 확인해주세요.')
                }
                setLoading(false)
            }
        }
        reader.readAsBinaryString(file)
    }

    const handleUpload = async () => {
        if (previewData.length === 0) return
        if (!confirm(`${previewData.length}명의 데이터를 업데이트하시겠습니까?`)) return

        setProcessing(true)
        try {
            const res = await updateMembersBulk(previewData)
            setResult({
                success: res.successCount,
                fail: res.failCount,
                errors: res.errors
            })
        } catch (error) {
            console.error(error)
            alert('업데이트 중 오류가 발생했습니다.')
        } finally {
            setProcessing(false)
        }
    }

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['파트', '이름', '상태', '직분', '생년월일', '기타'],
            ['Sop A', '홍길동', '정대원', '집사', '900101', '양력'],
            ['Bass', '김철수', '신입', '성도', '851225', ''],
            ['Tenor', '이영희', '솔리스트', '', '920505', '']
        ])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Template')
        XLSX.writeFile(wb, 'member_update_template.xlsx')
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-700 bg-slate-900 text-slate-100">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        📦 대원 일괄 업데이트
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">

                    {!result ? (
                        <>
                            {/* Step 1: Template & Upload */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-slate-700/30 p-4 rounded-xl border border-slate-600 border-dashed flex flex-col items-center justify-center gap-2 text-center hover:bg-slate-700/50 transition-colors">
                                    <FileSpreadsheet size={32} className="text-green-500" />
                                    <div className="text-sm font-bold text-slate-300">엑셀 템플릿 다운로드</div>
                                    <button
                                        onClick={downloadTemplate}
                                        className="text-xs bg-slate-600 hover:bg-slate-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        양식 받기 (.xlsx)
                                    </button>
                                </div>

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-slate-700/30 p-4 rounded-xl border border-slate-600 border-dashed flex flex-col items-center justify-center gap-2 text-center hover:bg-slate-700/50 transition-colors cursor-pointer group"
                                >
                                    <Upload size={32} className="text-blue-500 group-hover:scale-110 transition-transform" />
                                    <div className="text-sm font-bold text-slate-300">
                                        {file ? file.name : "엑셀 파일 업로드"}
                                    </div>
                                    <div className="text-xs text-slate-500">클릭하여 파일 선택</div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept=".xlsx, .xls, .csv"
                                        className="hidden"
                                    />
                                </div>
                            </div>

                            {/* Step 2: Preview */}
                            {previewData.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="font-bold text-slate-300 flex justify-between items-center">
                                        <span>미리보기 ({previewData.length}명)</span>
                                        <span className="text-xs font-normal text-slate-500">* 이름과 파트가 일치하는 대원만 업데이트됩니다.</span>
                                    </h4>
                                    <div className="max-h-[300px] overflow-y-auto rounded-lg border border-slate-700">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-900 text-slate-400 sticky top-0">
                                                <tr>
                                                    <th className="p-3">이름</th>
                                                    <th className="p-3">파트</th>
                                                    <th className="p-3">생년월일</th>
                                                    <th className="p-3">직분</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700 bg-slate-800">
                                                {previewData.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-700/50">
                                                        <td className="p-3 text-white font-bold">{row.name}</td>
                                                        <td className="p-3 text-slate-300">{row.part}</td>
                                                        <td className="p-3 font-mono text-amber-400">{row.birthDate || '-'}</td>
                                                        <td className="p-3 text-slate-300">{row.churchTitle || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        // Result View
                        <div className="space-y-6 text-center py-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 text-green-500 mb-2">
                                <Check size={32} strokeWidth={3} />
                            </div>
                            <h3 className="text-2xl font-bold text-white">업데이트 완료!</h3>
                            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                                    <div className="text-slate-400 text-xs uppercase font-bold">성공</div>
                                    <div className="text-3xl font-black text-green-400">{result.success}</div>
                                </div>
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                                    <div className="text-slate-400 text-xs uppercase font-bold">실패/미발견</div>
                                    <div className="text-3xl font-black text-rose-400">{result.fail}</div>
                                </div>
                            </div>

                            {result.errors.length > 0 && (
                                <div className="bg-rose-900/20 border border-rose-900/50 rounded-lg p-4 text-left max-w-sm mx-auto overflow-y-auto max-h-[150px]">
                                    <h4 className="text-rose-400 font-bold mb-2 flex items-center gap-2 text-sm">
                                        <AlertCircle size={14} />
                                        오류 상세
                                    </h4>
                                    <ul className="list-disc list-inside text-xs text-rose-200/80 space-y-1">
                                        {result.errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-700 bg-slate-900 flex justify-end gap-3">
                    {!result ? (
                        <>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-slate-400 hover:text-white font-bold transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={previewData.length === 0 || processing}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {processing && <Loader2 size={16} className="animate-spin" />}
                                업데이트 실행
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg w-full"
                        >
                            닫기
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
