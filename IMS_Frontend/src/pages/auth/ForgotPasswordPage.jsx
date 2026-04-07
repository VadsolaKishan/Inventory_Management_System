import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiEye, FiEyeOff } from 'react-icons/fi'

import Button from '../../components/common/Button'
import PasswordPolicyPanel from '../../components/forms/PasswordPolicyPanel'
import InputField from '../../components/common/InputField'
import { authService } from '../../services/authService'
import { extractErrorMessage } from '../../utils/http'
import { getPasswordRuleState, getPasswordStrength, isPasswordPolicyCompliant } from '../../utils/password'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState('request')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordRules = useMemo(() => getPasswordRuleState(newPassword), [newPassword])
  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword])

  const requestOtp = async (event) => {
    event.preventDefault()
    setError('')

    if (!email) {
      setError('Email is required.')
      return
    }

    setLoading(true)
    try {
      const payload = await authService.requestPasswordOtp({ email })
      setStep('confirm')
      toast.success(payload.detail || 'If the account exists, an OTP has been sent to your email.')
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Unable to request OTP.'))
    } finally {
      setLoading(false)
    }
  }

  const confirmReset = async (event) => {
    event.preventDefault()
    setError('')

    if (!email || !otpCode || !newPassword) {
      setError('Email, OTP code, and new password are required.')
      return
    }

    if (otpCode.length !== 6) {
      setError('OTP code must contain 6 digits.')
      return
    }

    if (!isPasswordPolicyCompliant(newPassword)) {
      setError(
        'Password must be 8-20 characters and include uppercase, lowercase, number, and special character.',
      )
      return
    }

    setLoading(true)
    try {
      await authService.confirmPasswordOtp({
        email,
        otp_code: otpCode,
        new_password: newPassword,
      })
      toast.success('Password reset successful. Please sign in.')
      navigate('/login', { replace: true })
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Unable to reset password.'))
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
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Password Recovery</p>
        <h2 className="mt-2 font-display text-3xl text-ink">Reset Access</h2>
        <p className="mt-2 text-sm text-muted">
          {step === 'request'
            ? 'Request an OTP to your email address.'
            : 'Enter OTP and set a new password.'}
        </p>
      </div>

      {step === 'request' ? (
        <form className="space-y-4" onSubmit={requestOtp}>
          <InputField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="manager@example.com"
          />
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Request OTP
          </Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={confirmReset}>
          <InputField
            id="email_confirm"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <InputField
            id="otp"
            label="OTP Code"
            value={otpCode}
            onChange={(event) => setOtpCode(event.target.value)}
            placeholder="6 digits"
            maxLength={6}
          />
          <label className="flex flex-col gap-1.5 text-sm" htmlFor="new_password">
            <span className="font-semibold text-ink">New Password</span>
            <div className="relative">
              <input
                id="new_password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Create a secure password"
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 pr-11 text-sm text-ink placeholder:text-muted/80 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                autoComplete="new-password"
                maxLength={20}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
              >
                {showNewPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </label>

          <PasswordPolicyPanel
            passwordValue={newPassword}
            passwordRules={passwordRules}
            passwordStrength={passwordStrength}
          />

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

          <Button type="submit" className="w-full" loading={loading}>
            Confirm Reset
          </Button>
        </form>
      )}

      <div className="mt-5 text-center text-sm">
        <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">
          Back to Sign In
        </Link>
      </div>
    </Motion.div>
  )
}