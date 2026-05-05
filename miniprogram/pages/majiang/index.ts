import { getUserInfo, getUserRank, updateUsername, uploadUserInfo } from '../../services/user-service'
import { getGameList, getGameListByUser, cancelGame, getPrizePool, preloadMajiangPlayers, redeemSquat } from '../../services/majiang-service'
import { convertUserDTO, convertGameDTO, updateAvatarFromCache } from '../../utils/util'
import { getTrimmedNickname, normalizeNicknameInput, validateNickname } from '../../utils/nickname'

const SQUAT_DOWN_THRESHOLD = -0.14
const SQUAT_UP_THRESHOLD = 0.14
const SQUAT_MIN_ACTION_GAP = 900
const SENSOR_UNSUPPORTED_ERROR = 'startAccelerometer:fail system permission denied'

type SquatMotionState = 'idle' | 'down'

let squatMotionState: SquatMotionState = 'idle'
let squatLastCountTime = 0
let squatBaseY: number | null = null
let squatSmoothY: number | null = null
let squatSensorStarted = false
let squatAccelerometerHandler: WechatMiniprogram.OnAccelerometerChangeCallback | null = null

function resetSquatDetectorState() {
  squatMotionState = 'idle'
  squatLastCountTime = 0
  squatBaseY = null
  squatSmoothY = null
}

Page({
  data: {
    user: {} as User,
    isRefreshing: false,
    isPageRefreshing: false,
    rankLoading: false,
    isLoadingMore: false,
    hasMoreData: true,
    currentPage: 0,
    pageSize: 10,
    rankList: [] as User[],
    gameList: [] as MajiangLog[],
    userGameList: [] as MajiangLog[],
    prizePoolInfo: null as PrizePoolDTO | null,
    prizePoolLoading: false,
    historyTitle: '游戏历史',
    historyEmptyText: '',
    historyLoading: false,
    showUserRank: true,
    showGameLog: false,
    showUserGameLog: false,
    showUserRankBtn: false,
    showDrawer: false,
    currentUserId: 0,
    showProfileDrawer: false,
    profileAvatarUrl: '',
    profileNickname: '',
    profileAvatarChanged: false,
    isProfileSaving: false,
    showSquatPopup: false,
    squatCount: 1,
    isSquatRedeeming: false,
  },

  onLoad() {
  },

  onShow() {
    const user: User = wx.getStorageSync('user')
    if (user) {
      this.setData({ user })
    }

    preloadMajiangPlayers().catch((err) => {
      console.error('预加载牌桌玩家失败:', err)
    })
    this.fetchUserInfo()
    if (this.data.showUserRank) {
      this.setData({ rankLoading: true })
    }
    this.fetchUserRank().finally(() => {
      if (this.data.rankLoading) {
        this.setData({ rankLoading: false })
      }
    })
  },

  onHide() {
    this.stopSquatDetect()
  },

  onUnload() {
    this.stopSquatDetect()
  },

  onPageRefresh() {
    this.setData({ isPageRefreshing: true })
    Promise.allSettled([this.fetchUserInfo(), this.fetchUserRank()]).finally(() => {
      this.setData({ isPageRefreshing: false })
    })
  },

  noop() {},

  // 子组件下拉刷新触发
  handleRankListLoad() {
    this.fetchUserInfo()
    this.fetchUserRank()
  },
  handleGameListLoad() {
    this.fetchUserInfo()
    this.fetchGameList(false)
  },
  handleUserGameListLoad() {
    this.fetchUserInfo()
    if (this.data.currentUserId) {
      this.fetchUserGameList(this.data.currentUserId, false)
    }
  },
  handleCurrentHistoryRefresh() {
    this.fetchUserInfo()
    if (this.data.showUserGameLog && this.data.currentUserId) {
      this.fetchUserGameList(this.data.currentUserId, false)
      return
    }
    this.fetchGameList(false)
  },

  // === 排行榜 ===
  fetchUserRank() {
    return getUserRank()
      .then((dtos) => {
        const rankList = dtos.map((dto: UserDTO) => convertUserDTO(dto))
        // 缓存头像
        const avatars = rankList.map((u: User) => ({ id: u.id, avatar: u.avatar }))
        wx.setStorageSync('avatars', avatars)
        this.setData({ rankList })
      })
      .catch((err) => {
        console.error('获取排行榜失败:', err)
        throw err
      })
  },

  fetchGameList(isLoadMore: boolean = false) {
    if (this.data.isLoadingMore) return

    const page = isLoadMore ? this.data.currentPage + 1 : 0
    const offset = page * this.data.pageSize

    if (isLoadMore) {
      this.setData({ isLoadingMore: true })
    } else {
      this.setData({ historyLoading: true, prizePoolLoading: true })
    }

    const currentUserId = this.data.user ? this.data.user.id : 0
    getGameList(this.data.pageSize, offset)
      .then((dtos) => {
        const safeDtos = Array.isArray(dtos) ? dtos : []
        const avatars = wx.getStorageSync('avatars') || []
        const validDtos = safeDtos.filter((dto: GameDTO) => Array.isArray(dto.players) && dto.players.length > 0)
        const formattedList = validDtos.map((dto: GameDTO) => {
          const log = convertGameDTO(dto, currentUserId)
          if (avatars.length > 0) this.updateLogAvatars(log, avatars)
          return log
        })

        const newGameList = isLoadMore ? [...this.data.gameList, ...formattedList] : formattedList
        const hasMoreData = formattedList.length > 0 && formattedList.length === this.data.pageSize

        this.setData({
          gameList: newGameList,
          currentPage: page,
          hasMoreData,
          historyLoading: false,
          isLoadingMore: false,
        })
        this.notifyComponentLoadMoreComplete()
      })
      .catch((err) => {
        console.error('获取对局记录失败:', err)
        this.setData({
          historyLoading: false,
          isLoadingMore: false,
        })
        this.notifyComponentLoadMoreComplete()
      })

    if (!isLoadMore) {
      this.fetchPrizePoolInfo()
    }
  },

  fetchUserInfo() {
    if (!this.data.user || !this.data.user.id) return Promise.resolve()
    return getUserInfo(this.data.user.id)
      .then((dto) => {
        const updatedUser = convertUserDTO(dto)
        wx.setStorageSync('user', updatedUser)
        this.setData({ user: updatedUser })
      })
      .catch((err) => {
        console.error('获取用户信息失败:', err)
        throw err
      })
  },

  fetchUserGameList(userId: number, isLoadMore: boolean = false) {
    if (this.data.isLoadingMore && isLoadMore) return
    if (!isLoadMore) {
      this.setData({
        currentUserId: userId,
        historyLoading: true,
        prizePoolLoading: true,
      })
    }

    const page = isLoadMore ? this.data.currentPage + 1 : 0
    const offset = page * this.data.pageSize

    if (isLoadMore) {
      this.setData({ isLoadingMore: true })
    }

    const currentUserId = this.data.user ? this.data.user.id : 0
    const targetUserId = isLoadMore ? this.data.currentUserId : userId

    getGameListByUser(targetUserId, this.data.pageSize, offset)
      .then((dtos) => {
        if (this.data.currentUserId !== targetUserId) {
          return
        }
        const safeDtos = Array.isArray(dtos) ? dtos : []
        const avatars = wx.getStorageSync('avatars') || []
        const validDtos = safeDtos.filter((dto: GameDTO) => Array.isArray(dto.players) && dto.players.length > 0)
        const formattedList = validDtos.map((dto: GameDTO) => {
          const log = convertGameDTO(dto, currentUserId)
          log.forOnePlayer = true
          log.playerWin = dto.players.some((p: any) => p.user.id === targetUserId && p.role_code === 1)
          if (avatars.length > 0) this.updateLogAvatars(log, avatars)
          return log
        })

        const newUserGameList = isLoadMore ? [...this.data.userGameList, ...formattedList] : formattedList
        const hasMoreData = formattedList.length > 0 && formattedList.length === this.data.pageSize

        this.setData({
          userGameList: newUserGameList,
          currentPage: page,
          hasMoreData,
          historyEmptyText: !isLoadMore && newUserGameList.length === 0 ? '暂无记录' : '',
          historyLoading: false,
          isLoadingMore: false,
        })
        this.notifyComponentLoadMoreComplete()
      })
      .catch((err) => {
        if (this.data.currentUserId !== targetUserId) {
          return
        }
        console.error('获取个人对局记录失败:', err)
        this.setData({
          historyEmptyText: !isLoadMore ? '' : this.data.historyEmptyText,
          historyLoading: false,
          isLoadingMore: false,
        })
        this.notifyComponentLoadMoreComplete()
      })

    if (!isLoadMore) {
      this.fetchPrizePoolInfo()
    }
  },

  fetchPrizePoolInfo() {
    return getPrizePool()
      .then((prizePoolInfo) => {
        this.setData({
          prizePoolInfo,
          prizePoolLoading: false,
        })
      })
      .catch((err) => {
        console.error('获取奖池信息失败:', err)
        this.setData({
          prizePoolLoading: false,
        })
      })
  },

  // 更新对局记录中的头像
  updateLogAvatars(log: MajiangLog, avatars: any[]) {
    const updateAvatar = (user: User) => {
      if (user && user.id) {
        const cached = updateAvatarFromCache(user.id, avatars)
        if (cached) user.avatar = cached
      }
    }
    updateAvatar(log.player1)
    updateAvatar(log.player2)
    updateAvatar(log.player3)
    updateAvatar(log.player4)
    log.winners.forEach((item) => updateAvatar(item.user))
    log.losers.forEach((item) => updateAvatar(item.user))
    if (log.recorder) updateAvatar(log.recorder.user)
    if (log.jackpotEvent) updateAvatar(log.jackpotEvent.user)
  },

  // 通知子组件加载更多完成
  notifyComponentLoadMoreComplete() {
    this.setData({ isLoadingMore: false })
    try {
      let componentId = ''
      if (this.data.showGameLog) componentId = '#game-log-component'
      else if (this.data.showUserGameLog) componentId = '#user-game-log-component'
      if (!componentId) return
      const component = this.selectComponent(componentId) as any
      if (component && component.loadMoreComplete) component.loadMoreComplete()
    } catch (e) {
      console.error('notifyComponentLoadMoreComplete failed:', e)
    }
  },

  handleLoadMore() {
    if (this.data.showGameLog) {
      this.fetchGameList(true)
    } else if (this.data.showUserGameLog && this.data.currentUserId) {
      this.fetchUserGameList(this.data.currentUserId, true)
    }
  },

  refreshRankPanel() {
    this.setData({ rankLoading: true })
    return Promise.allSettled([this.fetchUserInfo(), this.fetchUserRank()]).finally(() => {
      this.setData({ rankLoading: false })
    })
  },

  refreshGameLogPanel() {
    return Promise.allSettled([this.fetchUserInfo(), this.fetchGameList(false)])
  },

  openProfileEditor() {
    const user = this.data.user || {}
    this.setData({
      showProfileDrawer: true,
      profileAvatarUrl: '',
      profileNickname: user.nickname || user.username || '',
      profileAvatarChanged: false,
      showDrawer: false,
    })
  },

  openSquatPopup() {
    if (this.data.showSquatPopup) {
      return
    }

    this.setData({
      showSquatPopup: true,
      squatCount: 1,
      showDrawer: false,
      showProfileDrawer: false,
    }, () => {
      this.startSquatDetect()
    })
  },

  closeSquatPopup() {
    if (this.data.isSquatRedeeming) {
      return
    }
    this.setData({
      showSquatPopup: false,
    })
    this.stopSquatDetect()
  },

  resetSquatCount() {
    resetSquatDetectorState()
    this.setData({
      squatCount: 1,
    })
  },

  redeemSquatPoints() {
    if (this.data.isSquatRedeeming) {
      return
    }
    if (!this.data.user || !this.data.user.id) {
      wx.showToast({ title: '用户信息异常', icon: 'none' })
      return
    }
    if (this.data.squatCount <= 0) {
      wx.showToast({ title: '请先完成一次深蹲', icon: 'none' })
      return
    }

    const currentCount = this.data.squatCount
    this.stopSquatDetect()
    this.setData({
      isSquatRedeeming: true,
    })

    redeemSquat({
      user_id: this.data.user.id,
      squat_count: currentCount,
    })
      .then(() => {
        this.setData({
          isSquatRedeeming: false,
          showSquatPopup: false,
          squatCount: 1,
        })
        wx.showToast({
          title: `已兑换 ${currentCount} 金币`,
          icon: 'success',
        })
        this.refreshData()
      })
      .catch((err) => {
        console.error('[Squat] 兑换失败:', err)
        this.setData({
          isSquatRedeeming: false,
        })
        wx.showToast({
          title: String(err || '兑换失败'),
          icon: 'none',
        })
        if (this.data.showSquatPopup) {
          this.startSquatDetect()
        }
      })
  },

  startSquatDetect() {
    if (squatSensorStarted) {
      return
    }

    resetSquatDetectorState()
    squatAccelerometerHandler = (res) => {
      if (!this.data.showSquatPopup) {
        return
      }

      if (squatBaseY === null || squatSmoothY === null) {
        squatBaseY = res.y
        squatSmoothY = res.y
        return
      }

      squatSmoothY = squatSmoothY * 0.82 + res.y * 0.18
      const deltaY = squatSmoothY - squatBaseY
      const now = Date.now()

      if (squatMotionState === 'idle' && deltaY <= SQUAT_DOWN_THRESHOLD) {
        squatMotionState = 'down'
        return
      }

      if (squatMotionState === 'down' && deltaY >= SQUAT_UP_THRESHOLD) {
        if (now - squatLastCountTime >= SQUAT_MIN_ACTION_GAP) {
          squatLastCountTime = now
          this.setData({
            squatCount: this.data.squatCount + 1,
          })
        }
        squatMotionState = 'idle'
      }
    }

    wx.startAccelerometer({
      interval: 'game',
      success: () => {
        squatSensorStarted = true
        if (squatAccelerometerHandler) {
          wx.onAccelerometerChange(squatAccelerometerHandler)
        }
      },
      fail: (err) => {
        console.error('[Squat] 启动加速度计失败:', err)
        resetSquatDetectorState()
        squatSensorStarted = false
        squatAccelerometerHandler = null
        this.setData({
          showSquatPopup: false,
        })
        wx.showToast({
          title: err && err.errMsg === SENSOR_UNSUPPORTED_ERROR ? '当前设备不支持' : '启动传感器失败',
          icon: 'none',
        })
      },
    })
  },

  stopSquatDetect() {
    if (squatAccelerometerHandler) {
      wx.offAccelerometerChange(squatAccelerometerHandler)
    }

    if (squatSensorStarted) {
      wx.stopAccelerometer({
        fail: (err) => {
          console.error('[Squat] 停止加速度计失败:', err)
        },
      })
    }

    squatSensorStarted = false
    squatAccelerometerHandler = null
    resetSquatDetectorState()
  },

  closeProfileEditor() {
    this.setData({
      showProfileDrawer: false,
      profileAvatarUrl: '',
      profileNickname: '',
      profileAvatarChanged: false,
      isProfileSaving: false,
    })
  },

  onProfileChooseAvatar(e: any) {
    this.setData({
      profileAvatarUrl: e.detail.avatarUrl,
      profileAvatarChanged: true,
    })
  },

  onProfileNicknameInput(e: any) {
    this.setData({
      profileNickname: normalizeNicknameInput(e.detail.value),
    })
  },

  saveProfile() {
    const { user, profileNickname, profileAvatarUrl, profileAvatarChanged, isProfileSaving } = this.data
    if (!user || !user.id || isProfileSaving) return

    const trimmedNickname = getTrimmedNickname(profileNickname)
    const nicknameError = validateNickname(trimmedNickname)
    if (nicknameError) {
      wx.showToast({ title: nicknameError, icon: 'none' })
      return
    }

    const originalNickname = user.nickname || user.username || ''
    let savePromise: Promise<any> | null = null
    if (profileAvatarChanged && profileAvatarUrl) {
      savePromise = uploadUserInfo(user.id, trimmedNickname, profileAvatarUrl)
    } else if (trimmedNickname !== originalNickname) {
      savePromise = updateUsername(user.id, trimmedNickname)
    }

    if (!savePromise) {
      wx.showToast({ title: '未做修改', icon: 'none' })
      return
    }

    this.setData({ isProfileSaving: true })
    wx.showLoading({ title: '保存中...' })
    savePromise
      .then(() => getUserInfo(user.id))
      .then((dto) => {
        const updatedUser = convertUserDTO(dto)
        wx.setStorageSync('user', updatedUser)
        this.setData({
          user: updatedUser,
          isProfileSaving: false,
        })
        wx.hideLoading()
        wx.showToast({ title: '保存成功', icon: 'success' })
        this.closeProfileEditor()
      })
      .catch((err) => {
        console.error('保存资料失败:', err)
        this.setData({ isProfileSaving: false })
        wx.hideLoading()
        wx.showToast({ title: String(err || '保存失败'), icon: 'none' })
      })
  },

  openUserRank() {
    this.setData({
      showUserRank: true,
      showGameLog: false,
      showUserGameLog: false,
      showUserRankBtn: false,
      showDrawer: false,
      historyTitle: '游戏历史',
      historyEmptyText: '',
      historyLoading: false,
      rankLoading: true,
      rankList: [],
      currentUserId: 0,
      currentPage: 0,
      hasMoreData: true,
    }, () => {
      this.refreshRankPanel()
    })
  },

  openGameLog() {
    this.setData({
      showUserRank: false,
      showGameLog: true,
      showUserGameLog: false,
      showUserRankBtn: true,
      showDrawer: false,
      historyTitle: '游戏历史',
      historyEmptyText: '',
      historyLoading: true,
      currentUserId: 0,
      gameList: [],
      currentPage: 0,
      hasMoreData: true,
    }, () => {
      this.refreshGameLogPanel()
    })
  },

  openRecordGame() {
    this.setData({
      showDrawer: true,
    })
  },

  handleClickUserAvatar(e: any) {
    const userId = e.detail.userId
    const username = (e.detail.username || '').trim()
    this.setData({
      showUserRank: false,
      showGameLog: false,
      showUserGameLog: true,
      showUserRankBtn: true,
      historyTitle: username ? `${username}的游戏历史` : '该玩家的游戏历史',
      historyEmptyText: '',
      historyLoading: true,
      currentUserId: userId,
      userGameList: [],
      isLoadingMore: false,
      currentPage: 0,
      hasMoreData: true,
    }, () => {
      this.fetchUserGameList(userId, false)
    })
  },

  refreshData() {
    this.fetchUserInfo()
    this.fetchUserRank()
    if (this.data.showUserGameLog && this.data.currentUserId) {
      this.fetchUserGameList(this.data.currentUserId, false)
      return
    }
    this.fetchGameList(false)
  },

  showSaveGameLog() {
    this.openRecordGame()
  },

  handleCloseDrawer() {
    this.setData({ showDrawer: false })
  },

  // mgtt-mp 由组件内处理删除；这里保留一个入口给后续兼容使用
  deleteGame(gameId: number) {
    return cancelGame(gameId)
  },
})
