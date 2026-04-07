import { useState } from 'react'
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

  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const redirectPath = location.state?.from?.pathname

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!form.username || !form.password) {
      setError('Username and password are required.')
      return
    }

    setLoading(true)
    try {
      const payload = await authService.login(form)
      dispatch(setCredentials(payload))
      toast.success(`Welcome back, ${payload.user?.username || 'User'}!`)
      const fallbackPath = payload.user?.role === ROLES.MANAGER ? '/dashboard' : '/receipts'
      navigate(redirectPath || fallbackPath, { replace: true })
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Unable to sign in.'))
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

      <form className="space-y-4" onSubmit={handleSubmit}>
        <InputField
          id="username"
          label="Username"
          value={form.username}
          onChange={updateField('username')}
          placeholder="manager1"
          autoComplete="username"
        />

        <InputField
          id="password"
          label="Password"
          type="password"
          value={form.password}
          onChange={updateField('password')}
          placeholder="Enter your password"
          autoComplete="current-password"
        />

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

        <Button type="submit" className="w-full" loading={loading}>
          Sign In
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