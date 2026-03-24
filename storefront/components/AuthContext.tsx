"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback
} from "react"
import { clearCheckoutDraftFromBrowser } from "../lib/checkout-draft"

export type AuthUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  isConfirmed: boolean
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (params: {
    email: string
    password: string
    firstName: string
    lastName: string
  }) => Promise<{ requiresConfirmation?: boolean; message?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" })
      const data = await res.json().catch(() => ({ user: null }))
      setUser(data.user ?? null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    })

    let errorMessage = "Login failed"
    try {
      const data = await res.json()
      errorMessage = data?.error || errorMessage
    } catch {
      if (!res.ok) {
        errorMessage = res.status === 401 ? "Invalid email or password." : `Login failed (${res.status})`
      }
    }

    if (!res.ok) {
      throw new Error(errorMessage)
    }

    await fetchUser()
  }

  const register = async (params: {
    email: string
    password: string
    firstName: string
    lastName: string
  }): Promise<{ requiresConfirmation?: boolean; message?: string }> => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      credentials: "include",
    })

    let data: { error?: string; requiresConfirmation?: boolean; message?: string } = {}
    try {
      data = await res.json()
    } catch {
      if (!res.ok) throw new Error(`Registration failed (${res.status})`)
    }

    if (!res.ok) {
      throw new Error(data?.error || "Registration failed")
    }

    // If confirmation is required, don't fetch user (they're not logged in yet)
    if (data.requiresConfirmation) {
      return { requiresConfirmation: true, message: data.message }
    }

    await fetchUser()
    return {}
  }

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    setUser(null)
    // Clear checkout draft so next visit doesn't show previous user's addresses/contact
    if (typeof window !== "undefined") {
      try {
        clearCheckoutDraftFromBrowser()
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser: fetchUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
