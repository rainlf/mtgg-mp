import { uploadUserInfo } from '../../services/user-service'
import { getUserInfo } from '../../services/user-service'
import { setCurrentUserId } from '../../services/request-service'
import { convertUserDTO } from '../../utils/util'
import { getTrimmedNickname, normalizeNicknameInput, validateNickname } from '../../utils/nickname'

Page({
  data: {
    user: null as any,
    userInfo: {
      avatarUrl: '',
      nickName: '',
    },
    canLogin: false,
  },

  onLoad() {
    const user = wx.getStorageSync('user')
    if (user) {
      setCurrentUserId(user.id)
      this.setData({ user })
    }
  },

  onChooseAvatar(e: any) {
    const avatarUrl = e.detail.avatarUrl
    this.setData({
      'userInfo.avatarUrl': avatarUrl,
      canLogin: !!avatarUrl && !!this.data.userInfo.nickName,
    })
  },

  onNicknameInput(e: any) {
    const nickName = normalizeNicknameInput(e.detail.value)
    this.setData({
      'userInfo.nickName': nickName,
      canLogin: !!this.data.userInfo.avatarUrl && !!getTrimmedNickname(nickName),
    })
  },

  login() {
    if (!this.data.user || !this.data.user.id) {
      wx.showToast({ title: '用户信息异常', icon: 'none' })
      return
    }
    const nickname = getTrimmedNickname(this.data.userInfo.nickName)
    if (!this.data.userInfo.avatarUrl || !nickname) {
      wx.showToast({ title: '请选择头像和输入昵称', icon: 'none' })
      return
    }
    const nicknameError = validateNickname(nickname)
    if (nicknameError) {
      wx.showToast({ title: nicknameError, icon: 'none' })
      return
    }

    wx.showLoading({ title: '提交中...' })
    uploadUserInfo(this.data.user.id, nickname, this.data.userInfo.avatarUrl)
      .then(() => {
        // 重新获取用户信息
        return getUserInfo(this.data.user.id)
      })
      .then((userDTO) => {
        const user = convertUserDTO(userDTO)
        wx.setStorageSync('user', user)
        setCurrentUserId(user.id)
        wx.hideLoading()
        wx.redirectTo({ url: '../majiang/index' })
      })
      .catch((err) => {
        wx.hideLoading()
        console.error('登录失败:', err)
        wx.showToast({ title: String(err || '提交失败'), icon: 'none' })
      })
  },
})
