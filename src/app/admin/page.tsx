'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react'
import Papa from 'papaparse'
import { bulkUploadAttendance } from '@/actions/admin'

export default function AdminPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [csvData, setCsvData] = useState<any[]>([])
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState<{ success: number, failed: number, errors: string[] } | null>(null)

    if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>
    if (!user || user.role !== 'ADMIN') {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">⛔ 접근 권한이 없습니다</h1>
                    <button onClick={() => router.push('/')} className="text-amber-500 underline">홈으로 돌아가기</button>
                </div>
            </div>
        )
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setCsvData(results.data)
                setResult(null)
            },
            error: (error) => {
                alert("CSV 파싱 오류: " + error.message)
            }
        })
    }

    const processUpload = async () => {
        if (!confirm(`총 ${csvData.length}건의 데이터를 업로드하시겠습니까?`)) return

        setUploading(true)
        try {
            const res = await bulkUploadAttendance(csvData)
            setResult(res)
            if (res.success > 0) {
                alert(`업로드 완료! 성공: ${res.success}건`)
                setCsvData([])
            }
        } catch (e: any) {
            alert("업로드 중 오류 발생: " + e.message)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 pb-20">
            <header className="mb-8 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-amber-500">🛠️ 관리자 도구</h1>
                <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-white">
                    ← 대시보드
                </button>
            </header>

            <div className="max-w-4xl mx-auto space-y-8">
                {/* Info Card */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <FileSpreadsheet className="text-green-500" />
                        과거 출석 데이터 일괄 업로드
                    </h2>
                    <p className="text-slate-400 mb-4 text-sm leading-relaxed">
                        엑셀(CSV) 파일을 통해 과거 출석 기록을 한 번에 등록할 수 있습니다.<br />
                        파일 형식은 반드시 <span className="text-amber-400 font-mono">이름, 날짜(YYYY-MM-DD), 상태(출석/지각/결석)</span> 컬럼을 포함해야 합니다.
                    </p>

                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 font-mono text-xs text-slate-300 mb-6">
                        <div className="mb-2 text-slate-500">CSV 예시:</div>
                        name,date,status<br />
                        홍길동,2024-01-01,출석<br />
                        김철수,2024-01-01,결석<br />
                        이영희,2024-01-08,지각
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <label className="flex-1 w-full cursor-pointer bg-slate-700 hover:bg-slate-600 border-2 border-dashed border-slate-500 rounded-xl p-8 text-center transition-all group">
                            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                            <Upload className="mx-auto mb-2 text-slate-400 group-hover:text-white" size={32} />
                            <span className="text-slate-400 group-hover:text-white font-medium">
                                클릭하여 CSV 파일 업로드
                            </span>
                        </label>
                    </div>
                </div>

                {/* Preview Area */}
                {csvData.length > 0 && (
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">📊 데이터 미리보기 ({csvData.length}건)</h3>
                            <button
                                onClick={processUpload}
                                disabled={uploading}
                                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2"
                            >
                                {uploading ? '처리 중...' : '데이터베이스에 반영하기'}
                            </button>
                        </div>

                        <div className="overflow-x-auto max-h-96 border border-slate-700 rounded-lg">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-900 text-slate-400 sticky top-0">
                                    <tr>
                                        {Object.keys(csvData[0] || {}).map(key => (
                                            <th key={key} className="p-3 font-medium whitespace-nowrap">{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700 bg-slate-800/50">
                                    {csvData.slice(0, 100).map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-700/30">
                                            {Object.values(row).map((val: any, i) => (
                                                <td key={i} className="p-3 text-slate-300 whitespace-nowrap">{val}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {csvData.length > 100 && (
                                <div className="p-3 text-center text-slate-500 bg-slate-900/50 text-xs">
                                    ...외 {csvData.length - 100}건 생략됨
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Result Area */}
                {result && (
                    <div className={`p-6 rounded-xl border ${result.failed === 0 ? 'bg-green-900/20 border-green-500/30' : 'bg-slate-800 border-slate-700'}`}>
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            {result.failed === 0 ? <CheckCircle className="text-green-500" /> : <AlertCircle className="text-amber-500" />}
                            처리 결과
                        </h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 text-center">
                                <div className="text-xs text-slate-500 mb-1">성공</div>
                                <div className="text-2xl font-bold text-green-500">{result.success}건</div>
                            </div>
                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 text-center">
                                <div className="text-xs text-slate-500 mb-1">실패/건너뜀</div>
                                <div className="text-2xl font-bold text-rose-500">{result.failed}건</div>
                            </div>
                        </div>

                        {result.errors.length > 0 && (
                            <div className="bg-black/30 p-4 rounded-lg border border-rose-900/30 max-h-48 overflow-y-auto custom-scrollbar text-xs font-mono text-rose-300">
                                {result.errors.map((err, i) => (
                                    <div key={i} className="mb-1">• {err}</div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
