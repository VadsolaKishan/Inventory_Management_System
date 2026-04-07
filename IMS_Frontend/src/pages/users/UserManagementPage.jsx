import { useCallback, useEffect, useState } from 'react'
import { FiPlus, FiUserPlus } from 'react-icons/fi'
import toast from 'react-hot-toast'

import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import InputField from '../../components/common/InputField'
import { TableSkeleton } from '../../components/common/LoadingSkeleton'
import Modal from '../../components/common/Modal'
import PageMotion from '../../components/common/PageMotion'
import PaginationControls from '../../components/common/PaginationControls'
import SelectField from '../../components/common/SelectField'
import { getCount, getResults, imsService } from '../../services/imsService'
import { PAGE_SIZE, ROLE_LABELS } from '../../utils/constants'
import { formatDateTime } from '../../utils/format'
import { extractErrorMessage } from '../../utils/http'

const initialStaffForm = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  confirm_password: '',
  is_active: 'true',
}

export default function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [roleFilter, setRoleFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [form, setForm] = useState(initialStaffForm)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await imsService.listUsers({
        page,
        role: roleFilter || undefined,
      })
      setUsers(getResults(payload))
      setTotalCount(getCount(payload))
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Unable to load users.'))
      setUsers([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, roleFilter])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const closeModal = () => {
    setIsCreateModalOpen(false)
    setForm(initialStaffForm)
    setFormError('')
  }

  const submitCreateStaff = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!form.username || !form.email || !form.password || !form.confirm_password) {
      setFormError('Username, email, and passwords are required.')
      return
    }

    if (form.password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }

    if (form.password !== form.confirm_password) {
      setFormError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await imsService.createStaff({
        username: form.username,
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        password: form.password,
        confirm_password: form.confirm_password,
        is_active: form.is_active === 'true',
      })

      toast.success('Staff user created successfully.')
      closeModal()
      setPage(1)
      setRoleFilter('')
      await loadUsers()
    } catch (requestError) {
      setFormError(extractErrorMessage(requestError, 'Unable to create staff user.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageMotion className="space-y-5">
      <Card
        title="User Management"
        description="Managers can create and monitor staff accounts."
        action={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <FiPlus /> Create Staff
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField
            id="user-role-filter"
            label="Filter by Role"
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value)
              setPage(1)
            }}
            options={[
              { value: 'manager', label: 'Manager' },
              { value: 'staff', label: 'Staff' },
            ]}
            placeholder="All roles"
          />
        </div>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={8} />
        ) : error ? (
          <EmptyState title="Users unavailable" description={error} />
        ) : users.length === 0 ? (
          <EmptyState title="No users found" description="Create staff users to get started." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[0.08em] text-muted">
                    <th className="px-3 py-3">Username</th>
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="table-row-hover border-b border-border/70">
                      <td className="px-3 py-3 font-medium text-ink">{user.username}</td>
                      <td className="px-3 py-3 text-ink">
                        {[user.first_name, user.last_name].filter(Boolean).join(' ') || '-'}
                      </td>
                      <td className="px-3 py-3 text-muted">{user.email}</td>
                      <td className="px-3 py-3 text-muted">{ROLE_LABELS[user.role] || user.role}</td>
                      <td className="px-3 py-3 text-muted">{user.is_active ? 'Active' : 'Inactive'}</td>
                      <td className="px-3 py-3 text-muted">{formatDateTime(user.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationControls
              page={page}
              pageSize={PAGE_SIZE}
              totalCount={totalCount}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <Modal isOpen={isCreateModalOpen} onClose={closeModal} title="Create Staff User">
        <form className="space-y-4" onSubmit={submitCreateStaff}>
          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              id="staff-username"
              label="Username"
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
            />
            <InputField
              id="staff-email"
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              id="staff-first-name"
              label="First Name"
              value={form.first_name}
              onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
            />
            <InputField
              id="staff-last-name"
              label="Last Name"
              value={form.last_name}
              onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              id="staff-password"
              label="Password"
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
            <InputField
              id="staff-confirm-password"
              label="Confirm Password"
              type="password"
              value={form.confirm_password}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  confirm_password: event.target.value,
                }))
              }
            />
          </div>

          <SelectField
            id="staff-status"
            label="Account Status"
            value={form.is_active}
            onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.value }))}
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]}
            placeholder="Select status"
            menuPlacement="top"
          />

          {formError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              <FiUserPlus /> Create Staff
            </Button>
          </div>
        </form>
      </Modal>
    </PageMotion>
  )
}
