import axios from 'axios'

export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 添加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器 - 统一处理响应
api.interceptors.response.use(
  (response) => {
    const data = response.data as ApiResponse
    if (data && typeof data === 'object' && 'code' in data) {
      if (data.code === 0) {
        return { ...response, data: data.data }
      }
      else {
        const err = new Error(data.message) as any
        err.response = {
          status: 400,
          data,
        }
        return Promise.reject(err)
      }
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    else if (error.response?.data?.message) {
      const err = new Error(error.response.data.message) as any
      err.response = error.response
      return Promise.reject(err)
    }
    return Promise.reject(error)
  },
)

export default api
