import { useDispatch, useSelector } from 'react-redux'

import { clearCredentials, selectAuth } from '../store/slices/authSlice'

export default function useAuth() {
  const dispatch = useDispatch()
  const auth = useSelector(selectAuth)

  const logout = () => {
    dispatch(clearCredentials())
  }

  return {
    ...auth,
    logout,
  }
}