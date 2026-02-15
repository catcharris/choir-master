'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, User } from 'lucide-react';
import Image from 'next/image';

const ROLES = [
    { label: '관리자 (Admin)', value: 'ADMIN' },
    { label: 'Soprano A 파트장', value: 'Soprano A' },
    { label: 'Soprano B 파트장', value: 'Soprano B' },
    { label: 'Soprano B+ 파트장', value: 'Soprano B+' },
    { label: 'Alto A 파트장', value: 'Alto A' },
    { label: 'Alto B 파트장', value: 'Alto B' },
    { label: 'Tenor 파트장', value: 'Tenor' },
    { label: 'Bass 파트장', value: 'Bass' },
];

export default function Home() {
    const { login } = useAuth();
    const router = useRouter();
    const [selectedRole, setSelectedRole] = useState(ROLES[0].value);
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (login(password)) {
            router.push('/dashboard');
        } else {
            setError(true);
            setShake(true);
            setTimeout(() => setShake(false), 500);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center p-6 pb-20 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl opacity-30 animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl opacity-30"></div>
            </div>

            <div className="text-center w-full max-w-sm z-10">
                <div className="mb-8 flex justify-center">
                    <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                        <span className="text-5xl drop-shadow-lg">🎼</span>
                    </div>
                </div>

                <h1 className="text-3xl font-bold mb-2 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500">
                    Calvary Choir
                </h1>
                <p className="text-slate-400 mb-10 text-sm font-light tracking-wide">
                    갈보리 찬양대 스마트 출석 관리 시스템
                </p>

                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
                    <form onSubmit={handleLogin} className={`space-y-4 ${shake ? 'animate-shake' : ''}`}>
                        <div className="space-y-1 text-left">
                            <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">Role</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                    <User size={18} />
                                </div>
                                <select
                                    className="w-full bg-slate-900/80 border border-slate-600 rounded-xl p-3.5 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 appearance-none transition-all"
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
                        </div>

                        <div className="space-y-1 text-left">
                            <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">Password</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError(false);
                                    }}
                                    className={`
                                        w-full bg-slate-900/80 text-lg p-3.5 pl-10 rounded-xl border outline-none transition-all
                                        ${error ? 'border-rose-500 text-rose-500 placeholder-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : 'border-slate-600 text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'}
                                    `}
                                    placeholder="비밀번호"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-amber-900/30 transition-all transform active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
                        >
                            <span>로그인 및 출석부 입장</span>
                            <span className="text-amber-200">→</span>
                        </button>
                    </form>
                </div>

                <div className="mt-8 flex justify-center gap-4 text-xs text-slate-500">
                    <span onClick={() => alert('관리자에게 문의하세요')} className="cursor-pointer hover:text-slate-300 transition-colors">비밀번호 찾기</span>
                    <span>|</span>
                    <span onClick={() => alert('Calvary Choir System v2.1\n\n© 2026 Lemon Production\n"Empowering Harmony with Technology"\n\nAll Rights Reserved.')} className="cursor-pointer hover:text-slate-300 transition-colors">시스템 정보</span>
                </div>
            </div>

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
        </div>
    );
}
