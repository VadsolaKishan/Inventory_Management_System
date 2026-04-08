import { FiCheckCircle, FiCircle } from 'react-icons/fi'

const RULES = [
  {
    key: 'length',
    label: '8-20 characters',
    isMet: (state) => state.hasMinLength && state.hasMaxLength,
  },
  {
    key: 'uppercase',
    label: 'At least 1 uppercase letter (A-Z)',
    isMet: (state) => state.hasUppercase,
  },
  {
    key: 'lowercase',
    label: 'At least 1 lowercase letter (a-z)',
    isMet: (state) => state.hasLowercase,
  },
  {
    key: 'number',
    label: 'At least 1 number (0-9)',
    isMet: (state) => state.hasNumber,
  },
  {
    key: 'special',
    label: 'At least 1 special character (@$!%*?&)',
    isMet: (state) => state.hasSpecial,
  },
]

function getStrengthStyles(label) {
  if (label === 'Strong') {
    return {
      textClass: 'text-emerald-700',
      barClasses: ['bg-red-500', 'bg-amber-500', 'bg-emerald-500'],
    }
  }

  if (label === 'Medium') {
    return {
      textClass: 'text-amber-700',
      barClasses: ['bg-red-500', 'bg-amber-500', 'bg-border'],
    }
  }

  return {
    textClass: 'text-red-700',
    barClasses: ['bg-red-500', 'bg-border', 'bg-border'],
  }
}

export default function PasswordPolicyPanel({ passwordValue, passwordRules, passwordStrength }) {
  const strength = getStrengthStyles(passwordStrength.label)

  return (
    <div className="rounded-xl border border-border/70 bg-white/80 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-ink">Password strength</p>
        <span className={`font-semibold ${strength.textClass}`}>{passwordStrength.label}</span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1">
        {strength.barClasses.map((barClass, index) => (
          <span key={`strength-segment-${index}`} className={`h-1.5 rounded ${barClass}`} />
        ))}
      </div>

      <ul className="mt-3 space-y-1.5">
        {RULES.map((rule) => {
          const isMet = rule.isMet(passwordRules)
          return (
            <li key={rule.key} className="flex items-center gap-2">
              {isMet ? (
                <FiCheckCircle className="text-emerald-600" />
              ) : (
                <FiCircle className="text-muted" />
              )}
              <span className={isMet ? 'text-emerald-700' : 'text-muted'}>{rule.label}</span>
            </li>
          )
        })}
      </ul>

      {passwordValue && !passwordRules.isValid && (
        <p className="mt-3 rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700" aria-live="polite">
          Password format is not complete yet.
        </p>
      )}
    </div>
  )
}
