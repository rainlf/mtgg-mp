import { uploadUserInfo, updateUsername, getUserInfo } from '../../services/user-service'
import { convertUserDTO } from '../../utils/util'
import { getTrimmedNickname, normalizeNicknameInput, validateNickname } from '../../utils/nickname'

Page({
  data: {
    user: null as any,
    avatarUrl: '',
    nickname: '',
    avatarChanged: false,
  },

  onLoad() {
    const user = wx.getStorageSync('user')
    if (user) {
      this.setData({
        user,
        nickname: user.nickname || user.username || '',
      })
    }
  },

  onChooseAvatar(e: any) {
    this.setData({
      avatarUrl: e.detail.avatarUrl,
      avatarChanged: true,
    })
  },

  onNicknameInput(e: any) {
    this.setData({ nickname: normalizeNicknameInput(e.detail.value) })
  },

  save() {
    const { user, nickname, avatarUrl, avatarChanged } = this.data
    if (!user || !user.id) return
    const trimmedNickname = getTrimmedNickname(nickname)
    const nicknameError = validateNickname(trimmedNickname)
    if (nicknameError) {
      wx.showToast({ title: nicknameError, icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })

    let savePromise: Promise<any>
    if (avatarChanged && avatarUrl) {
      // 头像和昵称都更新
      savePromise = uploadUserInfo(user.id, trimmedNickname, avatarUrl)
    } else if (trimmedNickname !== (user.nickname || user.username || '')) {
      // 只更新昵称
      savePromise = updateUsername(user.id, trimmedNickname)
    } else {
      wx.hideLoading()
      wx.showToast({ title: '未做修改', icon: 'none' })
      return
    }

    savePromise
      .then(() => getUserInfo(user.id))
      .then((userDTO) => {
        const updatedUser = convertUserDTO(userDTO)
        wx.setStorageSync('user', updatedUser)
        this.setData({ user: updatedUser })
        wx.hideLoading()
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => this.back(), 500)
      })
      .catch((err) => {
        wx.hideLoading()
        console.error('保存失败:', err)
        wx.showToast({ title: String(err || '保存失败'), icon: 'none' })
      })
  },

  back() {
    wx.navigateBack()
  },
})
