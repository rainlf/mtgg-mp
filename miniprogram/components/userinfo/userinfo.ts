declare const wx: any

Component({
  properties: {
    username: {
      type: String,
      value: '游客',
    },
    points: {
      type: Number,
      value: 0,
    },
    avatar: {
      type: String,
      value: '',
    },
    totalGames: {
      type: Number,
      value: 0,
    },
    winCount: {
      type: Number,
      value: 0,
    },
    winRate: {
      type: Number,
      value: 0,
    },
  },

  data: {
    winRateText: '0%',
    winRateNegative: false,
  },

  observers: {
    'winRate,totalGames,winCount'(winRate: number, totalGames: number, winCount: number) {
      const self = this as any
      let normalizedRate = Number(winRate) || 0
      const isNegativeRate = normalizedRate < 0

      if (!isNegativeRate && normalizedRate <= 0 && totalGames > 0) {
        normalizedRate = winCount / totalGames
      }

      if (Math.abs(normalizedRate) > 1) {
        normalizedRate = normalizedRate / 100
      }

      const safeRate = Math.max(-1, Math.min(normalizedRate, 1))
      const percentage = safeRate * 100
      const winRateText =
        percentage % 1 === 0 ? `${percentage.toFixed(0)}%` : `${percentage.toFixed(1)}%`
      self.setData({
        winRateText,
        winRateNegative: percentage < 0,
      })
    },
  },

  methods: {
    onSettingsClick() {
      const self = this as any
      self.triggerEvent('settingsclick')
    },
    onShopClick() {
      wx.showToast({
        title: '正在建设中，请股东们稍稍等待...',
        icon: 'none',
      })
    },
  },
})
