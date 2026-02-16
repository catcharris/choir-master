'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export type UserRole = 'ADMIN' | 'LEADER'

export interface User {
    id: string
    name: string
    role: UserRole
    part?: string
}

interface AuthContextType {
    user: User | null
    login: (password: string, expectedRoleValue?: string) => boolean
    logout: () => void
    loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock Database of Users
// Values are passwords. 
const CREDENTIALS: Record<string, { role: UserRole, part?: string, name: string }> = {
    '0000': { role: 'ADMIN', name: '관리자' },
    '1111': { role: 'LEADER', part: 'Soprano A', name: '소프라노A 파트장' },
    '2222': { role: 'LEADER', part: 'Soprano B', name: '소프라노B 파트장' },
    '3333': { role: 'LEADER', part: 'Soprano B+', name: '소프라노B+ 파트장' },
    '4444': { role: 'LEADER', part: 'Alto A', name: '알토A 파트장' },
    '5555': { role: 'LEADER', part: 'Alto B', name: '알토B 파트장' },
    '6666': { role: 'LEADER', part: 'Tenor', name: '테너 파트장' },
    '7777': { role: 'LEADER', part: 'Bass', name: '베이스 파트장' },
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const router = useRouter()
    const pathname = usePathname()

    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Hydrate from storage
        const stored = localStorage.getItem('choir_user')
        if (stored) {
            setUser(JSON.parse(stored))
        }
        setLoading(false)
    }, [])

    const login = (password: string, expectedRoleValue?: string) => {
        const matched = CREDENTIALS[password]
        if (matched) {
            // Validate that the password matches the selected role/part
            if (expectedRoleValue) {
                if (matched.role === 'ADMIN') {
                    if (expectedRoleValue !== 'ADMIN') return false
                } else {
                    // Start of Part Leader check
                    if (matched.part !== expectedRoleValue) return false
                }
            }

            const userData: User = {
                id: password, // using pw as id for simplicity here
                ...matched
            }
            setUser(userData)
            localStorage.setItem('choir_user', JSON.stringify(userData))
            return true
        }
        return false
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem('choir_user')
        router.push('/')
        router.refresh()
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
