export const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/

export function getPasswordRuleState(password = '') {
  const value = String(password || '')

  const hasMinLength = value.length >= 8
  const hasMaxLength = value.length <= 20
  const hasUppercase = /[A-Z]/.test(value)
  const hasLowercase = /[a-z]/.test(value)
  const hasNumber = /\d/.test(value)
  const hasSpecial = /[@$!%*?&]/.test(value)
  const hasAllowedCharactersOnly = /^[A-Za-z\d@$!%*?&]*$/.test(value)

  return {
    hasMinLength,
    hasMaxLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    hasAllowedCharactersOnly,
    isValid: PASSWORD_POLICY_REGEX.test(value),
  }
}

export function isPasswordPolicyCompliant(password = '') {
  return getPasswordRuleState(password).isValid
}

export function getPasswordStrength(password = '') {
  const value = String(password || '')
  const rules = getPasswordRuleState(value)

  if (!value) {
    return { label: 'Weak', score: 0 }
  }

  let score = 0
  if (rules.hasMinLength) score += 1
  if (rules.hasUppercase) score += 1
  if (rules.hasLowercase) score += 1
  if (rules.hasNumber) score += 1
  if (rules.hasSpecial) score += 1
  if (rules.hasAllowedCharactersOnly && rules.hasMaxLength) score += 1

  if (rules.isValid && value.length >= 12) {
    return { label: 'Strong', score: 3 }
  }
  if (score >= 4) {
    return { label: 'Medium', score: 2 }
  }
  return { label: 'Weak', score: 1 }
}
