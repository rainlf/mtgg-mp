import { getUserInfo, getUserRank, getFitnessRank, updateUsername, uploadUserInfo } from '../../services/user-service'
import { getGameList, getGameListByUser, getFitnessList, getFitnessListByUser, cancelGame, getPrizePool, preloadMajiangPlayers, redeemSquat } from '../../services/majiang-service'
import { convertUserDTO, convertGameDTO, updateAvatarFromCache } from '../../utils/util'
import { getTrimmedNickname, normalizeNicknameInput, validateNickname } from '../../utils/nickname'

const SQUAT_DOWN_THRESHOLD = -0.12
const SQUAT_UP_THRESHOLD = 0.12
const SQUAT_RETURN_THRESHOLD = -0.04
const SQUAT_RECOVERY_THRESHOLD = 0.16
const SQUAT_RESET_THRESHOLD = 0.08
const SQUAT_BASE_ADJUST_WEIGHT = 0.04
const SQUAT_BASE_ADJUST_DELTA_LIMIT = 0.08
const SQUAT_MIN_ACTION_GAP = 900
const SQUAT_MAX_COUNT = 100
const SQUAT_LOCK_COUNT = 101
const SQUAT_INITIAL_COUNT = 0
const SENSOR_UNSUPPORTED_ERROR = 'startAccelerometer:fail system permission denied'
const SQUAT_DEBUG_SERVER_URL = 'http://127.0.0.1:7777/event'
const SQUAT_DEBUG_SESSION_ID = 'squat-double-count'

type SquatMotionState = 'idle' | 'down' | 'cooldown'

let squatMotionState: SquatMotionState = 'idle'
let squatLastCountTime = 0
let squatBaseY: number | null = null
let squatSmoothY: number | null = null
let squatDownMinDelta = 0
let squatSensorStarted = false
let squatAccelerometerHandler: WechatMiniprogram.OnAccelerometerChangeCallback | null = null

function resetSquatDetectorState() {
  squatMotionState = 'idle'
  squatLastCountTime = 0
  squatBaseY = null
  squatSmoothY = null
  squatDownMinDelta = 0
}

function reportSquatDebug(
  hypothesisId: 'A' | 'B' | 'C' | 'D' | 'E',
  location: string,
  msg: string,
  data: Record<string, unknown>,
) {
  try {
    wx.request({
      url: SQUAT_DEBUG_SERVER_URL,
      method: 'POST',
      timeout: 1200,
      data: {
        sessionId: SQUAT_DEBUG_SESSION_ID,
        runId: 'pre-fix',
        hypothesisId,
        location,
        msg: `[DEBUG] ${msg}`,
        data,
        ts: Date.now(),
      },
      fail: () => {},
    })
  } catch (_) {}
}

function getSquatStep(count: number) {
  if (count < 10) return 1
  if (count < 30) return 2
  if (count < 60) return 3
  if (count < SQUAT_MAX_COUNT) return 5
  return SQUAT_MAX_COUNT
}

function getSquatTheme(count: number) {
  if (count >= SQUAT_MAX_COUNT) return 'theme-max'
  if (count >= 60) return 'theme-5'
  if (count >= 30) return 'theme-3'
  if (count >= 10) return 'theme-2'
  return 'theme-1'
}

function getSquatDisplayCount(count: number) {
  return Math.min(count, SQUAT_MAX_COUNT)
}

function getSquatRedeemAmount(count: number) {
  if (count >= SQUAT_MAX_COUNT) {
    return getSquatDisplayCount(count) + 100
  }
  return count
}

function getSquatSubmitCount(count: number) {
  if (count >= SQUAT_MAX_COUNT) {
    return getSquatDisplayCount(count) + 100
  }
  return count
}

function mapFitnessUser(dto: UserDTO): User {
  const user = convertUserDTO(dto)
  user.fitnessPoints = dto.total_points || 0
  user.fitnessCount = dto.total_games || 0
  user.points = user.fitnessPoints
  user.totalGames = user.fitnessCount
  user.winCount = 0
  user.winRate = 0
  user.lastTags = []
  return user
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
    fitnessRankList: [] as User[],
    gameList: [] as MajiangLog[],
    userGameList: [] as MajiangLog[],
    prizePoolInfo: null as PrizePoolDTO | null,
    prizePoolLoading: false,
    historyTitle: '奖池&账本',
    historyEmptyText: '',
    historyLoading: false,
    showUserRank: true,
    showFitnessRank: false,
    showGameLog: false,
    showFitnessLog: false,
    showUserGameLog: false,
    currentRankScene: 'wealth' as RankScene,
    currentHistoryScene: 'game' as HistoryScene,
    showDrawer: false,
    currentUserId: 0,
    showProfileDrawer: false,
    profileAvatarUrl: '',
    profileNickname: '',
    profileAvatarChanged: false,
    isProfileSaving: false,
    showSquatPopup: false,
    squatCount: SQUAT_INITIAL_COUNT,
    squatDisplayCount: getSquatDisplayCount(SQUAT_INITIAL_COUNT),
    squatStep: getSquatStep(SQUAT_INITIAL_COUNT),
    squatTheme: getSquatTheme(SQUAT_INITIAL_COUNT),
    isSquatRedeeming: false,
    showSquatConfirm: false,
    squatConfirmCount: SQUAT_INITIAL_COUNT,
    squatConfirmTheme: getSquatTheme(SQUAT_INITIAL_COUNT),
    squatConfirmReachedMax: false,
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
    if (this.data.showUserRank || this.data.showFitnessRank) {
      this.setData({ rankLoading: true })
    }
    this.refreshCurrentRankPanel().finally(() => {
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
    Promise.allSettled([this.fetchUserInfo(), this.refreshCurrentPanelData()]).finally(() => {
      this.setData({ isPageRefreshing: false })
    })
  },

  noop() {},

  // 子组件下拉刷新触发
  handleRankListLoad() {
    this.fetchUserInfo()
    this.refreshCurrentRankPanel()
  },
  handleGameListLoad() {
    this.fetchUserInfo()
    if (this.data.currentHistoryScene === 'fitness') {
      this.fetchFitnessList(false)
      return
    }
    this.fetchGameList(false)
  },
  handleUserGameListLoad() {
    this.fetchUserInfo()
    if (this.data.currentUserId) {
      if (this.data.currentHistoryScene === 'fitness') {
        this.fetchUserFitnessList(this.data.currentUserId, false)
      } else {
        this.fetchUserGameList(this.data.currentUserId, false)
      }
    }
  },
  handleCurrentHistoryRefresh() {
    this.fetchUserInfo()
    if (this.data.showUserGameLog && this.data.currentUserId) {
      if (this.data.currentHistoryScene === 'fitness') {
        this.fetchUserFitnessList(this.data.currentUserId, false)
      } else {
        this.fetchUserGameList(this.data.currentUserId, false)
      }
      return
    }
    if (this.data.currentHistoryScene === 'fitness') {
      this.fetchFitnessList(false)
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

  fetchFitnessRank() {
    return getFitnessRank()
      .then((dtos) => {
        const fitnessRankList = dtos.map((dto: UserDTO) => mapFitnessUser(dto))
        const avatars = fitnessRankList.map((u: User) => ({ id: u.id, avatar: u.avatar }))
        wx.setStorageSync('avatars', avatars)
        this.setData({ fitnessRankList })
      })
      .catch((err) => {
        console.error('获取健身榜失败:', err)
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
        const validDtos = safeDtos.filter((dto: GameDTO) => dto.type_code !== 6 && Array.isArray(dto.players) && dto.players.length > 0)
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

  fetchFitnessList(isLoadMore: boolean = false) {
    if (this.data.isLoadingMore) return

    const page = isLoadMore ? this.data.currentPage + 1 : 0
    const offset = page * this.data.pageSize

    if (isLoadMore) {
      this.setData({ isLoadingMore: true })
    } else {
      this.setData({ historyLoading: true, prizePoolInfo: null, prizePoolLoading: false })
    }

    const currentUserId = this.data.user ? this.data.user.id : 0
    getFitnessList(this.data.pageSize, offset)
      .then((dtos) => {
        const safeDtos = Array.isArray(dtos) ? dtos : []
        const avatars = wx.getStorageSync('avatars') || []
        const validDtos = safeDtos.filter((dto: GameDTO) => dto.type_code === 6 && Array.isArray(dto.players) && dto.players.length > 0)
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
          historyEmptyText: !isLoadMore && newGameList.length === 0 ? '暂无健身记录' : '',
          historyLoading: false,
          isLoadingMore: false,
        })
        this.notifyComponentLoadMoreComplete()
      })
      .catch((err) => {
        console.error('获取健身记录失败:', err)
        this.setData({
          historyLoading: false,
          isLoadingMore: false,
        })
        this.notifyComponentLoadMoreComplete()
      })
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
        const validDtos = safeDtos.filter((dto: GameDTO) => dto.type_code !== 6 && Array.isArray(dto.players) && dto.players.length > 0)
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

  fetchUserFitnessList(userId: number, isLoadMore: boolean = false) {
    if (this.data.isLoadingMore && isLoadMore) return
    if (!isLoadMore) {
      this.setData({
        currentUserId: userId,
        historyLoading: true,
        prizePoolInfo: null,
        prizePoolLoading: false,
      })
    }

    const page = isLoadMore ? this.data.currentPage + 1 : 0
    const offset = page * this.data.pageSize

    if (isLoadMore) {
      this.setData({ isLoadingMore: true })
    }

    const currentUserId = this.data.user ? this.data.user.id : 0
    const targetUserId = isLoadMore ? this.data.currentUserId : userId

    getFitnessListByUser(targetUserId, this.data.pageSize, offset)
      .then((dtos) => {
        if (this.data.currentUserId !== targetUserId) {
          return
        }
        const safeDtos = Array.isArray(dtos) ? dtos : []
        const avatars = wx.getStorageSync('avatars') || []
        const validDtos = safeDtos.filter((dto: GameDTO) => dto.type_code === 6 && Array.isArray(dto.players) && dto.players.length > 0)
        const formattedList = validDtos.map((dto: GameDTO) => {
          const log = convertGameDTO(dto, currentUserId)
          log.forOnePlayer = true
          log.playerWin = true
          if (avatars.length > 0) this.updateLogAvatars(log, avatars)
          return log
        })

        const newUserGameList = isLoadMore ? [...this.data.userGameList, ...formattedList] : formattedList
        const hasMoreData = formattedList.length > 0 && formattedList.length === this.data.pageSize

        this.setData({
          userGameList: newUserGameList,
          currentPage: page,
          hasMoreData,
          historyEmptyText: !isLoadMore && newUserGameList.length === 0 ? '暂无健身记录' : '',
          historyLoading: false,
          isLoadingMore: false,
        })
        this.notifyComponentLoadMoreComplete()
      })
      .catch((err) => {
        if (this.data.currentUserId !== targetUserId) {
          return
        }
        console.error('获取个人健身记录失败:', err)
        this.setData({
          historyLoading: false,
          isLoadingMore: false,
        })
        this.notifyComponentLoadMoreComplete()
      })
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
      if (this.data.showGameLog || this.data.showFitnessLog) componentId = '#game-log-component'
      else if (this.data.showUserGameLog) componentId = '#user-game-log-component'
      if (!componentId) return
      const component = this.selectComponent(componentId) as any
      if (component && component.loadMoreComplete) component.loadMoreComplete()
    } catch (e) {
      console.error('notifyComponentLoadMoreComplete failed:', e)
    }
  },

  handleLoadMore() {
    if (this.data.showFitnessLog) {
      this.fetchFitnessList(true)
    } else if (this.data.showGameLog) {
      this.fetchGameList(true)
    } else if (this.data.showUserGameLog && this.data.currentUserId) {
      if (this.data.currentHistoryScene === 'fitness') {
        this.fetchUserFitnessList(this.data.currentUserId, true)
      } else {
        this.fetchUserGameList(this.data.currentUserId, true)
      }
    }
  },

  refreshRankPanel() {
    this.setData({ rankLoading: true })
    return Promise.allSettled([this.fetchUserInfo(), this.fetchUserRank()]).finally(() => {
      this.setData({ rankLoading: false })
    })
  },

  refreshFitnessRankPanel() {
    this.setData({ rankLoading: true })
    return Promise.allSettled([this.fetchUserInfo(), this.fetchFitnessRank()]).finally(() => {
      this.setData({ rankLoading: false })
    })
  },

  refreshGameLogPanel() {
    return Promise.allSettled([this.fetchUserInfo(), this.fetchGameList(false)])
  },

  refreshFitnessLogPanel() {
    return Promise.allSettled([this.fetchUserInfo(), this.fetchFitnessList(false)])
  },

  refreshCurrentRankPanel() {
    return this.data.currentRankScene === 'fitness' ? this.refreshFitnessRankPanel() : this.refreshRankPanel()
  },

  refreshCurrentPanelData() {
    if (this.data.showUserRank || this.data.showFitnessRank) {
      return this.refreshCurrentRankPanel()
    }
    if (this.data.showUserGameLog && this.data.currentUserId) {
      return this.data.currentHistoryScene === 'fitness'
        ? this.fetchUserFitnessList(this.data.currentUserId, false)
        : this.fetchUserGameList(this.data.currentUserId, false)
    }
    return this.data.currentHistoryScene === 'fitness' ? this.refreshFitnessLogPanel() : this.refreshGameLogPanel()
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
      squatCount: SQUAT_INITIAL_COUNT,
      squatDisplayCount: getSquatDisplayCount(SQUAT_INITIAL_COUNT),
      squatStep: getSquatStep(SQUAT_INITIAL_COUNT),
      squatTheme: getSquatTheme(SQUAT_INITIAL_COUNT),
      showDrawer: false,
      showProfileDrawer: false,
    }, () => {
      this.startSquatDetect()
    })
  },

  closeSquatPopup() {
    if (this.data.isSquatRedeeming || this.data.showSquatConfirm) {
      return
    }
    if (this.data.squatCount > 0) {
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
      squatCount: SQUAT_INITIAL_COUNT,
      squatDisplayCount: getSquatDisplayCount(SQUAT_INITIAL_COUNT),
      squatStep: getSquatStep(SQUAT_INITIAL_COUNT),
      squatTheme: getSquatTheme(SQUAT_INITIAL_COUNT),
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
    const redeemAmount = getSquatRedeemAmount(currentCount)
    this.stopSquatDetect()
    this.setData({
      showSquatConfirm: true,
      squatConfirmCount: redeemAmount,
      squatConfirmTheme: getSquatTheme(currentCount),
      squatConfirmReachedMax: currentCount >= SQUAT_MAX_COUNT,
    })
  },

  cancelSquatRedeem() {
    if (this.data.isSquatRedeeming) {
      return
    }
    this.setData({
      showSquatConfirm: false,
      squatConfirmReachedMax: false,
    })
    if (this.data.showSquatPopup) {
      this.startSquatDetect()
    }
  },

  confirmSquatRedeem() {
    if (this.data.isSquatRedeeming) {
      return
    }
    const submitCount = getSquatSubmitCount(this.data.squatCount)
    const redeemAmount = this.data.squatConfirmCount
    this.setData({
      isSquatRedeeming: true,
    })

    redeemSquat({
      user_id: this.data.user.id,
      squat_count: submitCount,
    })
      .then(() => {
        this.setData({
          isSquatRedeeming: false,
          showSquatConfirm: false,
          showSquatPopup: false,
          squatConfirmCount: SQUAT_INITIAL_COUNT,
          squatConfirmTheme: getSquatTheme(SQUAT_INITIAL_COUNT),
          squatConfirmReachedMax: false,
          squatCount: SQUAT_INITIAL_COUNT,
          squatDisplayCount: getSquatDisplayCount(SQUAT_INITIAL_COUNT),
          squatStep: getSquatStep(SQUAT_INITIAL_COUNT),
          squatTheme: getSquatTheme(SQUAT_INITIAL_COUNT),
        })
        wx.showToast({
          title: `已兑换 ${redeemAmount} 金币`,
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
    if (this.data.squatCount >= SQUAT_LOCK_COUNT) {
      return
    }

    resetSquatDetectorState()
    // #region debug-point E:start-detect
    reportSquatDebug('E', 'majiang/index.ts:startSquatDetect', 'start squat detect', {
      squatCount: this.data.squatCount,
      sensorStarted: squatSensorStarted,
      showSquatPopup: this.data.showSquatPopup,
    })
    // #endregion
    squatAccelerometerHandler = (res) => {
      if (!this.data.showSquatPopup) {
        return
      }

      if (squatBaseY === null || squatSmoothY === null) {
        squatBaseY = res.y
        squatSmoothY = res.y
        // #region debug-point C:init-base
        reportSquatDebug('C', 'majiang/index.ts:init-base', 'init squat base', {
          y: res.y,
        })
        // #endregion
        return
      }

      squatSmoothY = squatSmoothY * 0.82 + res.y * 0.18
      const deltaY = squatSmoothY - squatBaseY
      const now = Date.now()

      if (squatMotionState === 'cooldown') {
        if (Math.abs(deltaY) <= SQUAT_RESET_THRESHOLD) {
          // #region debug-point A:cooldown-reset
          reportSquatDebug('A', 'majiang/index.ts:cooldown-reset', 'cooldown reset to idle', {
            deltaY,
            resetThreshold: SQUAT_RESET_THRESHOLD,
            now,
            sinceLastCount: now - squatLastCountTime,
          })
          // #endregion
          squatMotionState = 'idle'
        }
        return
      }

      if (squatMotionState === 'idle' && Math.abs(deltaY) <= SQUAT_BASE_ADJUST_DELTA_LIMIT) {
        // #region debug-point C:base-adjust
        reportSquatDebug('C', 'majiang/index.ts:base-adjust', 'adjust squat base', {
          deltaY,
          baseY: squatBaseY,
          smoothY: squatSmoothY,
        })
        // #endregion
        squatBaseY = squatBaseY * (1 - SQUAT_BASE_ADJUST_WEIGHT) + squatSmoothY * SQUAT_BASE_ADJUST_WEIGHT
      }

      if (squatMotionState === 'idle' && deltaY <= SQUAT_DOWN_THRESHOLD) {
        // #region debug-point A:enter-down
        reportSquatDebug('A', 'majiang/index.ts:enter-down', 'enter down state', {
          deltaY,
          downThreshold: SQUAT_DOWN_THRESHOLD,
          baseY: squatBaseY,
          smoothY: squatSmoothY,
          now,
          sinceLastCount: now - squatLastCountTime,
        })
        // #endregion
        squatMotionState = 'down'
        squatDownMinDelta = deltaY
        return
      }

      if (squatMotionState === 'down') {
        squatDownMinDelta = Math.min(squatDownMinDelta, deltaY)
        const recoveredDelta = deltaY - squatDownMinDelta
        const isSlowReturn = deltaY >= SQUAT_RETURN_THRESHOLD && recoveredDelta >= SQUAT_RECOVERY_THRESHOLD

        if (deltaY < SQUAT_DOWN_THRESHOLD * 0.5) {
          return
        }

        if (deltaY >= SQUAT_UP_THRESHOLD || isSlowReturn) {
          // #region debug-point B:count-branch
          reportSquatDebug('B', 'majiang/index.ts:count-branch', 'hit count branch', {
            deltaY,
            upThreshold: SQUAT_UP_THRESHOLD,
            returnThreshold: SQUAT_RETURN_THRESHOLD,
            recoveredDelta,
            recoveryThreshold: SQUAT_RECOVERY_THRESHOLD,
            isSlowReturn,
            downMinDelta: squatDownMinDelta,
            now,
            sinceLastCount: now - squatLastCountTime,
            currentState: squatMotionState,
          })
          // #endregion
          if (now - squatLastCountTime >= SQUAT_MIN_ACTION_GAP) {
            squatLastCountTime = now
            const currentCount = this.data.squatCount
            const step = getSquatStep(currentCount)
            const nextCount = Math.min(SQUAT_LOCK_COUNT, currentCount + step)
            this.setData({
              squatCount: nextCount,
              squatDisplayCount: getSquatDisplayCount(nextCount),
              squatStep: getSquatStep(nextCount),
              squatTheme: getSquatTheme(nextCount),
            })
            if (nextCount >= SQUAT_LOCK_COUNT) {
              this.stopSquatDetect()
            }
          }
          // #region debug-point A:enter-cooldown
          reportSquatDebug('A', 'majiang/index.ts:enter-cooldown', 'enter cooldown after count', {
            deltaY,
            now,
            lastCountTime: squatLastCountTime,
            nextState: 'cooldown',
          })
          // #endregion
          squatMotionState = 'cooldown'
          squatDownMinDelta = 0
        }
      }
    }

    wx.startAccelerometer({
      interval: 'game',
      success: () => {
        squatSensorStarted = true
        // #region debug-point E:start-accelerometer-success
        reportSquatDebug('E', 'majiang/index.ts:start-accelerometer-success', 'accelerometer started', {
          sensorStarted: squatSensorStarted,
        })
        // #endregion
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
    // #region debug-point E:stop-detect
    reportSquatDebug('E', 'majiang/index.ts:stopSquatDetect', 'stop squat detect', {
      sensorStarted: squatSensorStarted,
      hasHandler: Boolean(squatAccelerometerHandler),
      squatCount: this.data.squatCount,
    })
    // #endregion
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
      showFitnessRank: false,
      showGameLog: false,
      showFitnessLog: false,
      showUserGameLog: false,
      currentRankScene: 'wealth',
      currentHistoryScene: 'game',
      showDrawer: false,
      historyTitle: '奖池&账本',
      historyEmptyText: '',
      historyLoading: false,
      rankLoading: true,
      rankList: [],
      fitnessRankList: [],
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
      showFitnessRank: false,
      showGameLog: true,
      showFitnessLog: false,
      showUserGameLog: false,
      currentHistoryScene: 'game',
      showDrawer: false,
      historyTitle: '奖池&账本',
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

  openFitnessRank() {
    this.setData({
      showUserRank: false,
      showFitnessRank: true,
      showGameLog: false,
      showFitnessLog: false,
      showUserGameLog: false,
      currentRankScene: 'fitness',
      currentHistoryScene: 'fitness',
      showDrawer: false,
      historyTitle: '健身历史',
      historyEmptyText: '',
      historyLoading: false,
      rankLoading: true,
      rankList: [],
      currentUserId: 0,
      currentPage: 0,
      hasMoreData: true,
    }, () => {
      this.refreshFitnessRankPanel()
    })
  },

  openFitnessLog() {
    this.setData({
      showUserRank: false,
      showFitnessRank: false,
      showGameLog: false,
      showFitnessLog: true,
      showUserGameLog: false,
      currentHistoryScene: 'fitness',
      showDrawer: false,
      historyTitle: '健身历史',
      historyEmptyText: '',
      historyLoading: true,
      currentUserId: 0,
      gameList: [],
      currentPage: 0,
      hasMoreData: true,
      prizePoolInfo: null,
      prizePoolLoading: false,
    }, () => {
      this.refreshFitnessLogPanel()
    })
  },

  handleSwitchFitnessTab(e: any) {
    const tab = String(e.detail?.tab || '')
    if (tab === 'history') {
      this.openFitnessLog()
      return
    }
    if (tab === 'rank') {
      this.openFitnessRank()
    }
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
      showFitnessRank: false,
      showGameLog: false,
      showFitnessLog: false,
      showUserGameLog: true,
      historyTitle: this.data.currentRankScene === 'fitness'
        ? (username ? `${username}的健身历史` : '该玩家的健身历史')
        : (username ? `${username}的游戏历史` : '该玩家的游戏历史'),
      historyEmptyText: '',
      historyLoading: true,
      currentUserId: userId,
      userGameList: [],
      isLoadingMore: false,
      currentPage: 0,
      hasMoreData: true,
    }, () => {
      if (this.data.currentRankScene === 'fitness') {
        this.setData({ currentHistoryScene: 'fitness' })
        this.fetchUserFitnessList(userId, false)
      } else {
        this.setData({ currentHistoryScene: 'game' })
        this.fetchUserGameList(userId, false)
      }
    })
  },

  refreshData() {
    this.fetchUserInfo()
    this.fetchUserRank()
    this.fetchFitnessRank()
    if (this.data.showUserGameLog && this.data.currentUserId) {
      if (this.data.currentHistoryScene === 'fitness') {
        this.fetchUserFitnessList(this.data.currentUserId, false)
      } else {
        this.fetchUserGameList(this.data.currentUserId, false)
      }
      return
    }
    if (this.data.showFitnessLog) {
      this.fetchFitnessList(false)
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
