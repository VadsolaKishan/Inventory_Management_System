import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { motion as Motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiEye, FiEyeOff } from 'react-icons/fi'

import Button from '../../components/common/Button'
import InputField from '../../components/common/InputField'
import PasswordPolicyPanel from '../../components/forms/PasswordPolicyPanel'
import { authService } from '../../services/authService'
import { setCredentials } from '../../store/slices/authSlice'
import { extractErrorMessage } from '../../utils/http'
import { getPasswordRuleState, getPasswordStrength, isPasswordPolicyCompliant } from '../../utils/password'

const initialForm = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  confirm_password: '',
}

export default function RegisterPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const passwordRules = useMemo(() => getPasswordRuleState(form.password), [form.password])
  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password])
  const confirmPasswordMismatch = Boolean(
    form.confirm_password && form.password !== form.confirm_password,
  )

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!form.username || !form.email || !form.password || !form.confirm_password) {
      setError('Username, email, and passwords are required.')
      return
    }

    if (!isPasswordPolicyCompliant(form.password)) {
      setError(
        'Password must be 8-20 characters and include uppercase, lowercase, number, and special character.',
      )
      return
    }

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const payload = await authService.register(form)
      dispatch(setCredentials(payload))
      toast.success('Staff account created successfully!')
      navigate('/receipts', { replace: true })
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Unable to register account.'))
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
        <h2 className="mt-2 font-display text-3xl text-ink">Create Account</h2>
        <p className="mt-2 text-sm text-muted">Set up access for your inventory team.</p>
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <InputField
          id="username"
          label="Username"
          value={form.username}
          onChange={updateField('username')}
          placeholder="manager1"
        />

        <InputField
          id="email"
          label="Email"
          type="email"
          value={form.email}
          onChange={updateField('email')}
          placeholder="manager@example.com"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="first_name"
            label="First Name"
            value={form.first_name}
            onChange={updateField('first_name')}
            placeholder="John"
          />
          <InputField
            id="last_name"
            label="Last Name"
            value={form.last_name}
            onChange={updateField('last_name')}
            placeholder="Doe"
          />
        </div>

        <label className="flex flex-col gap-1.5 text-sm" htmlFor="password">
          <span className="font-semibold text-ink">Password</span>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={updateField('password')}
              placeholder="Create a secure password"
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 pr-11 text-sm text-ink placeholder:text-muted/80 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              autoComplete="new-password"
              maxLength={20}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </label>

        <PasswordPolicyPanel
          passwordValue={form.password}
          passwordRules={passwordRules}
          passwordStrength={passwordStrength}
        />

        <label className="flex flex-col gap-1.5 text-sm" htmlFor="confirm_password">
          <span className="font-semibold text-ink">Confirm Password</span>
          <div className="relative">
            <input
              id="confirm_password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={form.confirm_password}
              onChange={updateField('confirm_password')}
              placeholder="Repeat password"
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 pr-11 text-sm text-ink placeholder:text-muted/80 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              autoComplete="new-password"
              maxLength={20}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
          {confirmPasswordMismatch && (
            <span className="text-xs font-medium text-red-600">Passwords do not match.</span>
          )}
        </label>

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

        <Button type="submit" className="w-full" loading={loading}>
          Register
        </Button>
      </form>

      <div className="mt-5 text-center text-sm">
        <span className="text-muted">Already have an account? </span>
        <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">
          Sign in
        </Link>
      </div>
    </Motion.div>
  )
}