'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Lock, Settings, LogOut, Check, User } from 'lucide-react'

const ROLES = [
    { label: '관리자 (Admin)', value: 'ADMIN' },
    { label: 'Soprano A 파트장', value: 'Soprano A' },
    { label: 'Soprano B 파트장', value: 'Soprano B' },
    { label: 'Soprano B+ 파트장', value: 'Soprano B+' },
    { label: 'Alto A 파트장', value: 'Alto A' },
    { label: 'Alto B 파트장', value: 'Alto B' },
    { label: 'Tenor 파트장', value: 'Tenor' },
    { label: 'Bass 파트장', value: 'Bass' },
]

export default function DashboardHeader() {
    const { user, login, logout } = useAuth()
    const router = useRouter()
    const [showLoginModal, setShowLoginModal] = useState(false)
    const [selectedRole, setSelectedRole] = useState(ROLES[0].value)
    const [password, setPassword] = useState('')
    const [error, setError] = useState(false)
    const [shake, setShake] = useState(false)

    // Handle Login
    const attemptLogin = (e: React.FormEvent) => {
        e.preventDefault()

        // In a real app we'd pass ID and Password.
        // Here we just use password.
        if (login(password)) {
            setShowLoginModal(false)
            setPassword('')
            setError(false)
        } else {
            setError(true)
            setShake(true)
            setTimeout(() => setShake(false), 500)
        }
    }

    // Handle Logout
    const handleLogout = () => {
        if (window.confirm('로그아웃 하시겠습니까?')) {
            logout()
            router.push('/')
        }
    }

    return (
        <>
            <header className="mb-4 mt-4 flex items-center justify-between">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-yellow-400">
                    갈보리 찬양대
                </h1>

                {user ? (
                    <div className="flex items-center gap-2">
                        {user.role === 'ADMIN' && (
                            <button
                                onClick={() => router.push('/admin')}
                                className="text-amber-500 hover:text-amber-400 transition-colors p-2 hover:bg-slate-800 rounded-full"
                                title="관리자 도구"
                            >
                                <Settings size={20} />
                            </button>
                        )}
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${user.role === 'ADMIN' ? 'bg-amber-900/30 border-amber-500/30 text-amber-500' : 'bg-indigo-900/30 border-indigo-500/30 text-indigo-400'}`}>
                            <User size={14} className="fill-current" />
                            <span className="text-xs font-bold">{user.name}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-slate-400 hover:text-rose-400 transition-colors p-2 hover:bg-slate-800 rounded-full"
                            title="로그아웃"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowLoginModal(true)}
                        className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-full"
                        title="로그인"
                    >
                        <Settings size={20} />
                    </button>
                )}
            </header>

            {/* Login Modal */}
            {showLoginModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`
                        w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden 
                        ${shake ? 'animate-shake' : 'animate-in zoom-in-95 duration-200'}
                    `}>
                        <div className="p-6">
                            <div className="text-center mb-6">
                                <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                    <Lock size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">시스템 접속</h3>
                                <p className="text-xs text-slate-400">아이디(직책)을 선택하고 비밀번호를 입력하세요.</p>
                            </div>

                            <form onSubmit={attemptLogin} className="space-y-4">
                                {/* Role Selector */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 ml-1">아이디 (직책)</label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 appearance-none"
                                        value={selectedRole}
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                    >
                                        {ROLES.map(role => (
                                            <option key={role.value} value={role.value}>
                                                {role.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 ml-1">비밀번호</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value)
                                            setError(false)
                                        }}
                                        className={`
                                            w-full bg-slate-900 text-lg p-3 rounded-xl border outline-none transition-all
                                            ${error ? 'border-rose-500 text-rose-500 placeholder-rose-500/50' : 'border-slate-700 text-white focus:border-amber-500'}
                                        `}
                                        placeholder="비밀번호 입력"
                                        autoFocus
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center shadow-lg mt-2"
                                >
                                    로그인
                                </button>
                            </form>
                        </div>
                        <div className="bg-slate-900/50 p-3 text-center border-t border-slate-700/50">
                            <button
                                onClick={() => setShowLoginModal(false)}
                                className="text-xs text-slate-500 hover:text-slate-300"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.2s ease-in-out 0s 2;
                }
            `}</style>
        </>
    )
}
