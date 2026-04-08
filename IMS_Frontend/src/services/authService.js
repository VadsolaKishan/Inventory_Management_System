import api from './apiClient'

function unwrap(response) {
  return response.data
}

export const authService = {
  login: (payload) => api.post('auth/login/', payload).then(unwrap),
  register: (payload) => api.post('auth/register/', payload).then(unwrap),
  // OTP delivery can involve slow SMTP/network providers, so allow extra time.
  requestPasswordOtp: (payload) => api.post('auth/password-reset/request-otp/', payload, { timeout: 45000 })
    .then(unwrap),
  confirmPasswordOtp: (payload) => api.post('auth/password-reset/confirm/', payload).then(unwrap),
  me: () => api.get('auth/me/').then(unwrap),
}