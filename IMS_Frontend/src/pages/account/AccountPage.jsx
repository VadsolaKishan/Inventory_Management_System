import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FiMail, FiShield, FiUser } from 'react-icons/fi'

import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import PageMotion from '../../components/common/PageMotion'
import { authService } from '../../services/authService'
import { selectCurrentUser, setUser } from '../../store/slices/authSlice'
import { ROLE_LABELS } from '../../utils/constants'
import { extractErrorMessage } from '../../utils/http'

export default function AccountPage() {
  const dispatch = useDispatch()
  const currentUser = useSelector(selectCurrentUser)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadProfile = async () => {
      setLoading(true)
      setError('')
      try {
        const profile = await authService.me()
        if (isMounted) {
          dispatch(setUser(profile))
        }
      } catch (requestError) {
        if (isMounted) {
          setError(extractErrorMessage(requestError, 'Unable to load account profile.'))
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [dispatch])

  if (loading) {
    return (
      <PageMotion>
        <Card title="Account" description="Loading profile information..." />
      </PageMotion>
    )
  }

  if (error) {
    return (
      <PageMotion>
        <EmptyState title="Profile unavailable" description={error} />
      </PageMotion>
    )
  }

  const fullName = [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(' ')

  return (
    <PageMotion className="space-y-5">
      <Card title="Account Profile" description="Your authenticated account details and role access.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-canvas/60 p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-muted">Name</p>
            <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-ink">
              <FiUser className="text-brand-600" />
              {fullName || currentUser?.username || '-'}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-canvas/60 p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-muted">Email</p>
            <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-ink">
              <FiMail className="text-brand-600" />
              {currentUser?.email || '-'}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-canvas/60 p-4 md:col-span-2">
            <p className="text-xs uppercase tracking-[0.1em] text-muted">Role</p>
            <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-ink">
              <FiShield className="text-brand-600" />
              {ROLE_LABELS[currentUser?.role] || 'Unknown'}
            </p>
          </div>
        </div>
      </Card>
    </PageMotion>
  )
}
