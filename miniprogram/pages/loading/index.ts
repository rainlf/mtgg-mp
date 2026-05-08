import { login, getUserInfo } from '../../services/user-service'
import { setCurrentUserId } from '../../services/request-service'
import { convertUserDTO } from '../../utils/util'

Page({
  data: {
    progress: 0,
    loadingText: '正在加载...',
  },

  onLoad() {
    this.startProgress()
    this.doLogin()
  },

  startProgress() {
    let progress = 0
    const timer = setInterval(() => {
      progress += Math.random() * 15
      if (progress >= 90) {
        progress = 90
        clearInterval(timer)
      }
      this.setData({ progress: Math.min(progress, 90) })
    }, 200)
  },

  doLogin() {
    wx.login({
      success: (res) => {
        if (res.code) {
          this.setData({ loadingText: '正在登录...' })
          login(res.code)
            .then((loginRes) => {
              const userId = loginRes.user_id
              setCurrentUserId(userId)
              return getUserInfo(userId)
            })
            .then((userDTO) => {
              const user = convertUserDTO(userDTO)
              wx.setStorageSync('user', user)
              setCurrentUserId(user.id)
              this.setData({ progress: 100, loadingText: '加载完成' })
              setTimeout(() => {
                if (user.avatar && user.nickname) {
                  wx.redirectTo({ url: '../majiang/index' })
                } else {
                  wx.redirectTo({ url: '../login/index' })
                }
              }, 300)
            })
            .catch((err) => {
              console.error('登录失败:', err)
              this.setData({ loadingText: '登录失败，请重试' })
            })
        } else {
          this.setData({ loadingText: '获取登录凭证失败' })
        }
      },
      fail: () => {
        this.setData({ loadingText: '微信登录失败' })
      },
    })
  },
})
