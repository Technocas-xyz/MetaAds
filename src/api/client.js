import axios from 'axios'
import toast from 'react-hot-toast'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  timeout: 15000,
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    } else if (status >= 500) {
      toast.error('Server error — please try again.')
    }
    return Promise.reject(error)
  }
)

export default client
