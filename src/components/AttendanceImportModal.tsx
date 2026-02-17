'use client'

import { useState } from 'react'
import { FileSpreadsheet, Upload, X, AlertCircle, CheckCircle, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { importAttendanceData } from '@/actions/import'

interface AttendanceImportModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export default function AttendanceImportModal({ isOpen, onClose, onSuccess }: AttendanceImportModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [logs, setLogs] = useState<string[]>([])

    if (!isOpen) return null

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setMessage(null)
            setLogs([])
        }
    }

    const handleDownloadTemplate = async () => {
        try {
            // 1. Fetch current members
            const { getAllMembers } = await import('@/actions/members')
            const members = await getAllMembers()

            // 2. Generate Dates (Jan 1 - Feb 15, Sat & Sun only)
            const dates: string[] = []
            const start = new Date(2025, 0, 1) // Jan 1 2025? Or 2024? User said "1월 부터...". Assuming current year contexts.
            // Current date is 2026-02-17. So "Jan 1" likely means 2026.
            // Wait, "1월 부터 ... 2월 15일까지".
            // If today is Feb 2026, user likely means Jan 2026 - Feb 2026.
            const year = new Date().getFullYear()
            const startDate = new Date(year, 0, 1) // Jan 1
            const endDate = new Date(year, 1, 15) // Feb 15

            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const day = d.getDay()
                if (day === 0 || day === 6) { // Sun or Sat
                    dates.push(d.toISOString().split('T')[0])
                }
            }

            // 3. Build Body
            // Sort by Part then Name
            members.sort((a, b) => a.part.localeCompare(b.part) || a.name.localeCompare(b.name))

            const wsData = [
                ['이름', '파트', '직분', '교회직분', ...dates], // Header
                ...members.map(m => [
                    m.name,
                    m.part,
                    m.role === 'Regular' ? '정대원' : m.role,
                    m.churchTitle || '',
                    ...Array(dates.length).fill('') // Empty cells for attendance
                ])
            ]

            const wb = XLSX.utils.book_new()
            const ws = XLSX.utils.aoa_to_sheet(wsData)

            // Auto-width
            const cols = [{ wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }]
            dates.forEach(() => cols.push({ wch: 12 }))
            ws['!cols'] = cols

            XLSX.utils.book_append_sheet(wb, ws, "출석일괄등록")
            XLSX.writeFile(wb, `출석일괄등록_템플릿_${year}.xlsx`)

        } catch (error) {
            console.error(error)
            alert('템플릿 생성 실패. 관리자에게 문의하세요.')
        }
    }

    const handleUpload = async () => {
        if (!file) return

        setIsUploading(true)
        setMessage(null)
        setLogs([])

        try {
            const formData = new FormData()
            formData.append('file', file)

            const result: any = await importAttendanceData(formData)

            if (result.success) {
                setMessage({ type: 'success', text: result.message })
                if (result.errors && result.errors.length > 0) {
                    setLogs(result.errors)
                }
                if (onSuccess) onSuccess()
            } else {
                setMessage({ type: 'error', text: result.message })
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: `업로드 실패: ${error.message}` })
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-800/50">
                    <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        <FileSpreadsheet className="text-green-400" size={20} />
                        이전 출석 일괄 등록
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700/50 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Step 1: Template */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-300">1. 양식 다운로드</label>
                        <p className="text-xs text-slate-400">
                            아래 버튼을 눌러 엑셀 양식을 다운로드하세요. <br />
                            이름과 파트는 정확해야 하며, 날짜 형식(YYYY-MM-DD)을 지켜주세요.
                        </p>
                        <button
                            onClick={handleDownloadTemplate}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm py-2 px-4 rounded-lg flex items-center gap-2 border border-slate-600 transition-colors w-full justify-center"
                        >
                            <Download size={16} />
                            템플릿 엑셀 받기
                        </button>
                    </div>

                    {/* Step 2: Upload */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-slate-300">2. 파일 업로드</label>
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="dropzone-file" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${file ? 'border-green-500 bg-green-500/10' : 'border-slate-600 bg-slate-800 hover:bg-slate-700'}`}>
                                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                                    <Upload className={`w-8 h-8 mb-2 ${file ? 'text-green-400' : 'text-slate-400'}`} />
                                    {file ? (
                                        <p className="text-sm text-green-400 font-bold">{file.name}</p>
                                    ) : (
                                        <>
                                            <p className="text-sm text-slate-400 font-bold">클릭하여 파일 선택</p>
                                            <p className="text-xs text-slate-500">XLSX 파일만 가능</p>
                                        </>
                                    )}
                                </div>
                                <input id="dropzone-file" type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileChange} />
                            </label>
                        </div>
                    </div>

                    {/* Message Area */}
                    {message && (
                        <div className={`p-4 rounded-lg flex items-start gap-3 text-sm ${message.type === 'success' ? 'bg-green-900/20 text-green-300 border border-green-500/30' : 'bg-rose-900/20 text-rose-300 border border-rose-500/30'}`}>
                            {message.type === 'success' ? <CheckCircle size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
                            <div className="flex-1">
                                <p className="font-bold">{message.text}</p>
                                {logs.length > 0 && (
                                    <div className="mt-2 text-xs opacity-80 max-h-24 overflow-y-auto custom-scrollbar border-t border-white/10 pt-2 space-y-1">
                                        {logs.map((log, i) => <div key={i}>- {log}</div>)}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-800/50 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                        disabled={isUploading}
                    >
                        닫기
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg ${!file || isUploading ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white active:scale-95 shadow-green-900/20'}`}
                    >
                        {isUploading ? (
                            <>
                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></span>
                                처리중...
                            </>
                        ) : (
                            <>
                                <Upload size={16} />
                                업로드 시작
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
