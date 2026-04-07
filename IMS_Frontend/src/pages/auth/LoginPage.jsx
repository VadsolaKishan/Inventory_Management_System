import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { motion as Motion } from 'framer-motion'
import toast from 'react-hot-toast'

import Button from '../../components/common/Button'
import InputField from '../../components/common/InputField'
import { authService } from '../../services/authService'
import { setCredentials } from '../../store/slices/authSlice'
import { ROLES } from '../../utils/constants'
import { extractErrorMessage } from '../../utils/http'

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ login: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [blockedUntilMs, setBlockedUntilMs] = useState(0)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const redirectPath = location.state?.from?.pathname

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const secondsUntilUnblock = Math.max(0, Math.ceil((blockedUntilMs - nowMs) / 1000))
  const isTemporarilyBlocked = secondsUntilUnblock > 0

  useEffect(() => {
    if (!isTemporarilyBlocked) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isTemporarilyBlocked])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (isTemporarilyBlocked) {
      setError(`Too many login attempts. Please try again in ${secondsUntilUnblock} seconds.`)
      return
    }

    const sanitizedLogin = form.login.trim()
    if (!sanitizedLogin || !form.password) {
      setError('Username/email and password are required.')
      return
    }

    setLoading(true)
    try {
      const payload = await authService.login({
        login: sanitizedLogin,
        password: form.password,
      })
      setBlockedUntilMs(0)
      dispatch(setCredentials(payload))
      toast.success(`Welcome back, ${payload.user?.username || 'User'}!`)
      const fallbackPath = payload.user?.role === ROLES.MANAGER ? '/dashboard' : '/receipts'
      navigate(redirectPath || fallbackPath, { replace: true })
    } catch (requestError) {
      const retryAfterSeconds = Number(requestError?.response?.data?.retry_after_seconds || 0)
      if (requestError?.response?.status === 429 && retryAfterSeconds > 0) {
        setBlockedUntilMs(Date.now() + retryAfterSeconds * 1000)
        const lockMessage = 'Too many login attempts. Please try again later.'
        setError(lockMessage)
        toast.error(lockMessage)
        return
      }
      const safeMessage = extractErrorMessage(requestError, 'Invalid username or password')
      setError(safeMessage)
      toast.error(safeMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 sm:p-7"
    >
      <div className="mb-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Nexus IMS</p>
        <h2 className="mt-2 font-display text-3xl text-ink">Sign In</h2>
        <p className="mt-2 text-sm text-muted">Access your inventory dashboard.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
        <InputField
          id="login"
          label="Username or Email"
          value={form.login}
          onChange={updateField('login')}
          placeholder="manager1 or name@company.com"
          autoComplete="off"
        />

        <InputField
          id="password"
          label="Password"
          type="password"
          value={form.password}
          onChange={updateField('password')}
          placeholder="Enter your password"
          autoComplete="new-password"
        />

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

        <Button
          type="submit"
          className="w-full"
          loading={loading}
          disabled={loading || isTemporarilyBlocked}
        >
          {isTemporarilyBlocked ? `Try again in ${secondsUntilUnblock}s` : 'Sign In'}
        </Button>
      </form>

      <div className="mt-5 flex items-center justify-between text-sm">
        <Link to="/forgot-password" className="font-medium text-brand-700 hover:text-brand-800">
          Forgot password?
        </Link>
        <Link to="/register" className="font-medium text-brand-700 hover:text-brand-800">
          Create account
        </Link>
      </div>
    </Motion.div>
  )
}