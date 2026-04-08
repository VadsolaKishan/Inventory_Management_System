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
      <Card
        title="Account Profile"
        description="Your authenticated account details and role access."
        className="w-full max-w-full overflow-hidden"
        contentClassName="overflow-hidden"
      >
        <div className="grid w-full min-w-0 gap-4 md:grid-cols-2">
          <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-canvas/60 p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-muted">Name</p>
            <div className="mt-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
              <FiUser className="mt-0.5 shrink-0 text-brand-600" />
              <p className="min-w-0 break-words text-base font-semibold leading-snug text-ink sm:text-lg">
                {fullName || currentUser?.username || '-'}
              </p>
            </div>
          </div>

          <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-canvas/60 p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-muted">Email</p>
            <div className="mt-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
              <FiMail className="mt-0.5 shrink-0 text-brand-600" />
              <p className="min-w-0 break-all text-base font-semibold leading-snug text-ink sm:text-lg">
                {currentUser?.email || '-'}
              </p>
            </div>
          </div>

          <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-canvas/60 p-4 md:col-span-2">
            <p className="text-xs uppercase tracking-[0.1em] text-muted">Role</p>
            <div className="mt-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
              <FiShield className="mt-0.5 shrink-0 text-brand-600" />
              <p className="min-w-0 break-words text-base font-semibold leading-snug text-ink sm:text-lg">
                {ROLE_LABELS[currentUser?.role] || 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </PageMotion>
  )
}
