import { Link } from 'react-router-dom'

import Button from '../components/common/Button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-card max-w-md p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">404</p>
        <h1 className="mt-2 font-display text-4xl text-ink">Page Not Found</h1>
        <p className="mt-3 text-sm text-muted">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary">Sign In</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}