import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { motion as Motion } from 'framer-motion'
import toast from 'react-hot-toast'

import Button from '../../components/common/Button'
import InputField from '../../components/common/InputField'
import { authService } from '../../services/authService'
import { setCredentials } from '../../store/slices/authSlice'
import { extractErrorMessage } from '../../utils/http'

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

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
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

        <InputField
          id="password"
          label="Password"
          type="password"
          value={form.password}
          onChange={updateField('password')}
          placeholder="Minimum 8 characters"
        />
        <InputField
          id="confirm_password"
          label="Confirm Password"
          type="password"
          value={form.confirm_password}
          onChange={updateField('confirm_password')}
          placeholder="Repeat password"
        />

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