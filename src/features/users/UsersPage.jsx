import { useState, useMemo } from 'react'
import { useDebounce } from '../../hooks/useDebounce'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useForm, Controller } from 'react-hook-form'
import {
  Plus, Search, MoreHorizontal, X,
  Users, UserCheck, Mail, ShieldCheck,
  Edit2, KeyRound, Ban, Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import KPICard from '../../components/ui/KPICard'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { cn } from '../../lib/utils'

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_USERS = [
  { id: 1,  name: 'Arun Kumar',      email: 'arun@decoinks.com',        role: 'Admin',   status: 'Active',    lastActive: '2026-05-09T08:14:00Z', createdAt: '2026-04-15T00:00:00Z', avatar: 'AK', color: 'bg-primary-500' },
  { id: 2,  name: 'Sarah Mitchell',  email: 'sarah@decoinks.com',       role: 'Manager', status: 'Active',    lastActive: '2026-05-09T07:45:00Z', createdAt: '2026-04-16T00:00:00Z', avatar: 'SM', color: 'bg-violet-500'  },
  { id: 3,  name: 'James Torres',    email: 'james@decoinks.com',       role: 'Analyst', status: 'Active',    lastActive: '2026-05-08T16:30:00Z', createdAt: '2026-04-20T00:00:00Z', avatar: 'JT', color: 'bg-sky-500'     },
  { id: 4,  name: 'Priya Nair',      email: 'priya@decoinks.com',       role: 'Analyst', status: 'Active',    lastActive: '2026-05-07T11:10:00Z', createdAt: '2026-04-22T00:00:00Z', avatar: 'PN', color: 'bg-pink-500'    },
  { id: 5,  name: 'Lucas Becker',    email: 'lucas@decoinks.com',       role: 'Viewer',  status: 'Active',    lastActive: '2026-05-06T09:55:00Z', createdAt: '2026-04-28T00:00:00Z', avatar: 'LB', color: 'bg-amber-500'   },
  { id: 6,  name: 'Chloe Dupont',    email: 'chloe@agency.io',          role: 'Manager', status: 'Invited',   lastActive: null,                   createdAt: '2026-05-01T00:00:00Z', avatar: 'CD', color: 'bg-teal-500'    },
  { id: 7,  name: 'Marco Rossi',     email: 'marco@agency.io',          role: 'Analyst', status: 'Invited',   lastActive: null,                   createdAt: '2026-05-03T00:00:00Z', avatar: 'MR', color: 'bg-orange-500'  },
  { id: 8,  name: 'Nina Petrov',     email: 'nina.p@decoinks.com',      role: 'Viewer',  status: 'Suspended', lastActive: '2026-04-10T14:22:00Z', createdAt: '2026-04-18T00:00:00Z', avatar: 'NP', color: 'bg-gray-400'    },
  { id: 9,  name: 'Hassan Al-Amin',  email: 'hassan@decoinks.com',      role: 'Admin',   status: 'Active',    lastActive: '2026-05-09T06:00:00Z', createdAt: '2026-04-15T00:00:00Z', avatar: 'HA', color: 'bg-emerald-500' },
  { id: 10, name: 'Yuki Tanaka',     email: 'yuki@decoinks.com',        role: 'Analyst', status: 'Active',    lastActive: '2026-05-08T18:05:00Z', createdAt: '2026-04-25T00:00:00Z', avatar: 'YT', color: 'bg-rose-500'    },
]

const ROLES   = ['Admin', 'Manager', 'Analyst', 'Viewer']
const STATUSES = ['Active', 'Invited', 'Suspended']

const FEATURES = [
  'Dashboard',
  'Ad Intelligence',
  'AI Analysis',
  'Campaigns',
  'Performance',
  'Briefs',
  'Learning Loop',
  'Review Queue',
  'Settings',
  'Users',
]
const ACCESS_LEVELS = ['None', 'View', 'Edit', 'Manage']

// ── Style helpers ─────────────────────────────────────────────────────────────

const ROLE_STYLE = {
  Admin:   'bg-primary-100 text-primary-700',
  Manager: 'bg-violet-100 text-violet-700',
  Analyst: 'bg-sky-100 text-sky-700',
  Viewer:  'bg-gray-100 text-gray-600',
}

const STATUS_STYLE = {
  Active:    'bg-green-100 text-green-700',
  Invited:   'bg-amber-100 text-amber-700',
  Suspended: 'bg-red-100 text-red-600',
}

const INPUT = cn(
  'h-9 w-full rounded-btn border border-border-default bg-white px-3',
  'text-sm text-text-primary placeholder:text-text-tertiary',
  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
)

function Badge({ text, styleMap }) {
  return (
    <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold', styleMap[text] ?? 'bg-gray-100 text-gray-600')}>
      {text}
    </span>
  )
}

function Avatar({ initials, color }) {
  return (
    <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white', color)}>
      {initials}
    </span>
  )
}

function FieldLabel({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-text-primary">
      {children}
      {required && <span className="ml-0.5 text-danger-500">*</span>}
    </label>
  )
}

function ModalShell({ open, onOpenChange, title, description, children, maxWidth = 'max-w-lg' }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50 w-full rounded-t-2xl',
            'sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card',
            'border border-border-default bg-white shadow-xl',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=open]:slide-in-from-bottom sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            'data-[state=closed]:slide-out-to-bottom sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=closed]:zoom-out-95',
            'max-h-[90vh] overflow-y-auto sm:w-full',
            maxWidth
          )}
        >
          <div className="flex items-start justify-between border-b border-border-default px-6 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-text-primary">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-0.5 text-xs text-text-secondary">{description}</Dialog.Description>
              )}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="ml-4 shrink-0 rounded-md p-1 text-text-tertiary hover:bg-gray-100 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Invite User Modal ─────────────────────────────────────────────────────────

function InviteUserModal({ open, onOpenChange }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { email: '', role: 'Analyst' },
  })

  const onSubmit = (data) => {
    toast.success(`Invite sent to ${data.email}`)
    reset()
    onOpenChange(false)
  }

  const handleClose = () => { reset(); onOpenChange(false) }

  return (
    <ModalShell
      open={open}
      onOpenChange={handleClose}
      title="Invite User"
      description="Send an invitation email with login instructions."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 py-5">
        <div>
          <FieldLabel htmlFor="inv-email" required>Email Address</FieldLabel>
          <input
            id="inv-email"
            type="email"
            placeholder="colleague@company.com"
            className={cn(INPUT, errors.email && 'border-danger-400 focus:ring-danger-400')}
            {...register('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
          />
          {errors.email && <p className="mt-1 text-xs text-danger-600">{errors.email.message}</p>}
        </div>

        <div>
          <FieldLabel htmlFor="inv-role" required>Role</FieldLabel>
          <select id="inv-role" className={INPUT} {...register('role', { required: true })}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <p className="mt-1 text-[11px] text-text-tertiary">
            <strong>Admin</strong> — full access · <strong>Manager</strong> — manage campaigns &amp; briefs ·{' '}
            <strong>Analyst</strong> — view &amp; analyse · <strong>Viewer</strong> — read only
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-border-default pt-4">
          <Button variant="outline" type="button" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" type="submit" icon={Mail}>Send Invite</Button>
        </div>
      </form>
    </ModalShell>
  )
}

// ── Edit User Modal ───────────────────────────────────────────────────────────

const DEFAULT_PERMISSIONS = Object.fromEntries(FEATURES.map((f) => [f, 'View']))

function EditUserModal({ open, onOpenChange, user }) {
  const { register, handleSubmit, reset, control, watch } = useForm({
    defaultValues: {
      name:        user?.name  ?? '',
      email:       user?.email ?? '',
      role:        user?.role  ?? 'Analyst',
      status:      user?.status ?? 'Active',
      permissions: DEFAULT_PERMISSIONS,
    },
  })

  // Reset when user changes
  useMemo(() => {
    if (user) reset({
      name:        user.name,
      email:       user.email,
      role:        user.role,
      status:      user.status,
      permissions: DEFAULT_PERMISSIONS,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const onSubmit = (data) => {
    toast.success(`User "${data.name}" updated`)
    onOpenChange(false)
  }

  const handleClose = () => onOpenChange(false)

  return (
    <ModalShell
      open={open}
      onOpenChange={handleClose}
      title="Edit User"
      description={user ? `Editing ${user.name} (${user.email})` : ''}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-5">
        {/* Basic info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="edit-name" required>Full Name</FieldLabel>
            <input id="edit-name" className={INPUT} {...register('name', { required: true })} />
          </div>
          <div>
            <FieldLabel htmlFor="edit-email" required>Email</FieldLabel>
            <input id="edit-email" type="email" className={INPUT} {...register('email', { required: true })} />
          </div>
          <div>
            <FieldLabel htmlFor="edit-role">Role</FieldLabel>
            <select id="edit-role" className={INPUT} {...register('role')}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="edit-status">Status</FieldLabel>
            <select id="edit-status" className={INPUT} {...register('status')}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Permissions matrix */}
        <div>
          <p className="mb-3 text-sm font-semibold text-text-primary">Feature Permissions</p>
          <div className="overflow-x-auto rounded-lg border border-border-default">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2.5 pl-4 pr-3 text-left font-semibold text-text-secondary">Feature</th>
                  {ACCESS_LEVELS.map((lvl) => (
                    <th key={lvl} className="px-3 py-2.5 text-center font-semibold text-text-secondary">{lvl}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {FEATURES.map((feat) => (
                  <tr key={feat} className="hover:bg-gray-50">
                    <td className="py-2.5 pl-4 pr-3 font-medium text-text-primary">{feat}</td>
                    {ACCESS_LEVELS.map((lvl) => (
                      <td key={lvl} className="px-3 py-2.5 text-center">
                        <Controller
                          control={control}
                          name={`permissions.${feat}`}
                          render={({ field }) => (
                            <input
                              type="radio"
                              value={lvl}
                              checked={field.value === lvl}
                              onChange={() => field.onChange(lvl)}
                              className="h-3.5 w-3.5 cursor-pointer accent-primary-600"
                            />
                          )}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-border-default pt-4">
          <Button variant="outline" type="button" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" type="submit">Save Changes</Button>
        </div>
      </form>
    </ModalShell>
  )
}

// ── Actions kebab menu ────────────────────────────────────────────────────────

function ActionsMenu({ user, onEdit, onDelete, onSuspend }) {
  const handleReset = () => toast.success(`Password reset email sent to ${user.email}`)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label={`Actions for ${user.name}`}
          className="rounded-md p-1 text-text-tertiary hover:bg-gray-100 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <MoreHorizontal size={16} aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[168px] rounded-card border border-border-default bg-white p-1.5 shadow-lg"
        >
          <DropdownMenu.Item
            onSelect={() => onEdit(user)}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary outline-none hover:bg-gray-50"
          >
            <Edit2 size={13} className="text-text-secondary" /> Edit User
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={handleReset}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary outline-none hover:bg-gray-50"
          >
            <KeyRound size={13} className="text-text-secondary" /> Reset Password
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => onSuspend(user)}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary outline-none hover:bg-gray-50"
          >
            <Ban size={13} className="text-text-secondary" />
            {user.status === 'Suspended' ? 'Reactivate' : 'Suspend'}
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-gray-100" />
          <DropdownMenu.Item
            onSelect={() => onDelete(user)}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger-600 outline-none hover:bg-danger-50"
          >
            <Trash2 size={13} /> Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtRelative(iso) {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers]               = useState(MOCK_USERS)
  const [search, setSearch]             = useState('')
  const debouncedSearch                 = useDebounce(search, 300)
  const [roleFilter, setRoleFilter]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [inviteOpen, setInviteOpen]     = useState(false)
  const [editUser, setEditUser]         = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [suspendTarget, setSuspendTarget] = useState(null)

  // KPI derived values
  const totalUsers    = users.length
  const activeUsers   = users.filter((u) => u.status === 'Active').length
  const pendingInvites = users.filter((u) => u.status === 'Invited').length
  const adminCount    = users.filter((u) => u.role === 'Admin').length

  // Filtered list
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch = !debouncedSearch ||
        u.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(debouncedSearch.toLowerCase())
      const matchRole   = !roleFilter   || u.role === roleFilter
      const matchStatus = !statusFilter || u.status === statusFilter
      return matchSearch && matchRole && matchStatus
    })
  }, [users, debouncedSearch, roleFilter, statusFilter])

  const handleDelete = () => {
    if (!deleteTarget) return
    setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
    toast.success(`${deleteTarget.name} removed`)
    setDeleteTarget(null)
  }

  const handleSuspend = () => {
    if (!suspendTarget) return
    const isSuspended = suspendTarget.status === 'Suspended'
    setUsers((prev) => prev.map((u) =>
      u.id === suspendTarget.id ? { ...u, status: isSuspended ? 'Active' : 'Suspended' } : u
    ))
    toast.success(`${suspendTarget.name} ${isSuspended ? 'reactivated' : 'suspended'}`)
    setSuspendTarget(null)
  }

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <PageHeader
          title="Users"
          subtitle="Manage team members, roles, and access"
          rightSlot={
            <Button variant="primary" icon={Plus} onClick={() => setInviteOpen(true)}>
              Invite User
            </Button>
          }
        />

        {/* KPI row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            title="Total Users"
            value={totalUsers}
            icon={Users}
            iconBg="bg-primary-50"
            iconColor="text-primary-500"
          />
          <KPICard
            title="Active Users"
            value={activeUsers}
            icon={UserCheck}
            iconBg="bg-success-50"
            iconColor="text-success-600"
          />
          <KPICard
            title="Pending Invites"
            value={pendingInvites}
            icon={Mail}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
          <KPICard
            title="Admins"
            value={adminCount}
            icon={ShieldCheck}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
          />
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="search"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-btn border border-border-default bg-white pl-8 pr-3 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 rounded-btn border border-border-default bg-white px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-btn border border-border-default bg-white px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          {(search || roleFilter || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter('') }}
              className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
            >
              <X size={13} /> Clear
            </button>
          )}

          <span className="ml-auto text-xs text-text-tertiary">
            {filtered.length} of {users.length} users
          </span>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-card border border-border-default bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border-default bg-gray-50">
                  {['Name', 'Role', 'Last Active', 'Status', 'Created', ''].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className={cn(
                        'py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-tertiary',
                        h === '' ? 'pr-4 text-right' : h === 'Name' ? 'pl-5 pr-3' : 'px-3',
                        h === 'Last Active' && 'hidden md:table-cell',
                        h === 'Created'     && 'hidden lg:table-cell',
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-text-tertiary">
                      No users match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => (
                    <tr key={user.id} className="group hover:bg-gray-50">
                      {/* Name + email */}
                      <td className="py-3.5 pl-5 pr-3">
                        <div className="flex items-center gap-3">
                          <Avatar initials={user.avatar} color={user.color} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-text-primary">{user.name}</p>
                            <p className="truncate text-[11px] text-text-tertiary">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-3 py-3.5">
                        <Badge text={user.role} styleMap={ROLE_STYLE} />
                      </td>

                      {/* Last Active */}
                      <td className="hidden px-3 py-3.5 text-text-secondary md:table-cell">
                        {fmtRelative(user.lastActive)}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5">
                        <Badge text={user.status} styleMap={STATUS_STYLE} />
                      </td>

                      {/* Created At */}
                      <td className="hidden px-3 py-3.5 text-text-secondary lg:table-cell">
                        {fmtDate(user.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pr-4 text-right">
                        <ActionsMenu
                          user={user}
                          onEdit={setEditUser}
                          onDelete={setDeleteTarget}
                          onSuspend={setSuspendTarget}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="flex items-center justify-between border-t border-border-default px-5 py-3">
            <p className="text-xs text-text-tertiary">
              Showing {filtered.length} user{filtered.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-text-tertiary">
              {activeUsers} active · {pendingInvites} pending
            </p>
          </div>
        </div>
      </div>

      {/* Invite modal */}
      <InviteUserModal open={inviteOpen} onOpenChange={setInviteOpen} />

      {/* Edit modal */}
      <EditUserModal
        open={editUser !== null}
        onOpenChange={(v) => { if (!v) setEditUser(null) }}
        user={editUser}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title={`Delete ${deleteTarget?.name ?? 'user'}?`}
        description="This will permanently remove the user and revoke their access. This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        onConfirm={handleDelete}
      />

      {/* Suspend confirm */}
      <ConfirmDialog
        open={suspendTarget !== null}
        onOpenChange={(v) => { if (!v) setSuspendTarget(null) }}
        title={suspendTarget?.status === 'Suspended' ? `Reactivate ${suspendTarget?.name ?? 'user'}?` : `Suspend ${suspendTarget?.name ?? 'user'}?`}
        description={suspendTarget?.status === 'Suspended'
          ? 'The user will regain access to the platform.'
          : 'The user will lose access immediately. You can reactivate them later.'}
        confirmText={suspendTarget?.status === 'Suspended' ? 'Reactivate' : 'Suspend'}
        variant="warning"
        onConfirm={handleSuspend}
      />
    </>
  )
}
