import { request, getServer } from './request-service'

// 登录：返回 { user_id }，需要再调 getUserInfo 获取完整信息
export const login = (code: string): Promise<LoginResponse> => {
  return request<LoginResponse>({
    url: '/api/user/login',
    method: 'GET',
    data: { code },
  })
}

// 获取用户详情
export const getUserInfo = (userId: number): Promise<UserDTO> => {
  return request<UserDTO>({
    url: '/api/user/info',
    method: 'GET',
    data: { userId },
  })
}

// 获取排行榜
export const getUserRank = (): Promise<UserDTO[]> => {
  return request<UserDTO[]>({
    url: '/api/user/rank',
    method: 'GET',
  })
}

// 获取健身榜
export const getFitnessRank = (): Promise<UserDTO[]> => {
  return request<UserDTO[]>({
    url: '/api/user/fitness/rank',
    method: 'GET',
  })
}

// 更新用户昵称（不含头像）
export const updateUsername = (userId: number, nickname: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const server = getServer()
    wx.request({
      url: `${server}/api/user/update`,
      method: 'POST',
      header: { 'content-type': 'application/x-www-form-urlencoded' },
      data: `userId=${userId}&nickname=${encodeURIComponent(nickname)}`,
      success: (res) => {
        const response = res.data as any
        if (response.code === 0) {
          resolve(response.data)
        } else {
          reject(response.message || '请求失败')
        }
      },
      fail: () => reject('网络连接失败'),
    })
  })
}

// 上传头像+更新资料（使用 wx.uploadFile）
export const uploadUserInfo = (userId: number, nickname: string, avatarPath: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const server = getServer()
    wx.uploadFile({
      url: `${server}/api/user/update`,
      filePath: avatarPath,
      name: 'avatar',
      formData: {
        userId: String(userId),
        nickname: nickname,
      },
      success(res) {
        try {
          const data = JSON.parse(res.data)
          if (data.code === 0) {
            resolve(data.data)
          } else {
            reject(data.message || '上传失败')
          }
        } catch (e) {
          reject('解析响应失败')
        }
      },
      fail() {
        reject('网络连接失败')
      },
    })
  })
}
