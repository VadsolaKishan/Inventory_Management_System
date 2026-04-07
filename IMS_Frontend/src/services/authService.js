import api from './apiClient'

function unwrap(response) {
  return response.data
}

export const authService = {
  login: (payload) => api.post('auth/login/', payload).then(unwrap),
  register: (payload) => api.post('auth/register/', payload).then(unwrap),
  requestPasswordOtp: (payload) => api.post('auth/password-reset/request-otp/', payload).then(unwrap),
  confirmPasswordOtp: (payload) => api.post('auth/password-reset/confirm/', payload).then(unwrap),
  me: () => api.get('auth/me/').then(unwrap),
}