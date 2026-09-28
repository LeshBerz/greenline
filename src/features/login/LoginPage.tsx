// Owner: Integrator.
import { useState } from 'react'
import { LoginScreen } from '../../components'
import { useChatStore } from '../../store/chatStore'
import type { Credentials } from '../../types'
import { checkLogin } from './checkLogin'

export function LoginPage() {
  const login = useChatStore((s) => s.login)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  async function handleSubmit(credentials: Credentials) {
    setLoading(true)
    setError(undefined)
    const message = await checkLogin(credentials)
    setLoading(false)
    if (message) setError(message)
    else login(credentials)
  }

  return <LoginScreen onSubmit={handleSubmit} loading={loading} error={error} />
}
