const ONLINE_SERVER = 'https://wx.guanshantech.com'
const LOCAL_SERVER = 'http://localhost:8080'
const USER_ID_HEADER = 'X-User-ID'
const CURRENT_USER_ID_STORAGE_KEY = 'current_user_id'

const getServer = (): string => {
  const envVersion = wx.getAccountInfoSync().miniProgram.envVersion
  const { platform } = wx.getSystemInfoSync()

  switch (envVersion) {
    case 'develop':
      return platform === 'devtools' ? LOCAL_SERVER : ONLINE_SERVER
    case 'trial':
      return ONLINE_SERVER
    case 'release':
      return ONLINE_SERVER
    default:
      return LOCAL_SERVER
  }
}

export { getServer }

const getStoredUserId = (): number | null => {
  try {
    const cachedUserId = wx.getStorageSync(CURRENT_USER_ID_STORAGE_KEY)
    if (typeof cachedUserId === 'number' && cachedUserId > 0) {
      return cachedUserId
    }
    if (typeof cachedUserId === 'string') {
      const parsedUserId = Number(cachedUserId)
      if (Number.isInteger(parsedUserId) && parsedUserId > 0) {
        return parsedUserId
      }
    }

    const user = wx.getStorageSync('user') as Partial<User> | undefined
    if (user && typeof user.id === 'number' && user.id > 0) {
      wx.setStorageSync(CURRENT_USER_ID_STORAGE_KEY, user.id)
      return user.id
    }
  } catch (_) {}
  return null
}

const buildRequestHeader = (header?: Record<string, string>): Record<string, string> => {
  const mergedHeader: Record<string, string> = { ...(header || {}) }
  const userID = getStoredUserId()
  if (userID && !mergedHeader[USER_ID_HEADER]) {
    mergedHeader[USER_ID_HEADER] = String(userID)
  }
  return mergedHeader
}

export const getCurrentUserId = (): number | null => {
  return getStoredUserId()
}

export const setCurrentUserId = (userId: number | null | undefined) => {
  try {
    if (typeof userId === 'number' && userId > 0) {
      wx.setStorageSync(CURRENT_USER_ID_STORAGE_KEY, userId)
      return
    }
    wx.removeStorageSync(CURRENT_USER_ID_STORAGE_KEY)
  } catch (_) {}
}

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
}

export const request = <T>(options: RequestOptions): Promise<T> => {
  const fullUrl = options.url.startsWith('http') ? options.url : `${getServer()}${options.url}`
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      url: fullUrl,
      header: buildRequestHeader(options.header),
      success: (res) => {
        const response = res.data as any
        // 后端返回格式: { code: 0, message: "success", data: ... }
        if (response.code === 0) {
          resolve(response.data as T)
        } else {
          reject(response.message || '请求失败')
        }
      },
      fail: () => {
        reject('网络连接失败')
      },
    })
  })
}
