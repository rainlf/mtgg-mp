declare const Component: any

Component({
  properties: {
    listData: {
      type: Array,
      value: [],
    },
    isInitialLoading: {
      type: Boolean,
      value: false,
    },
    rankScene: {
      type: String,
      value: 'wealth',
    },
    fitnessTab: {
      type: String,
      value: 'rank',
    },
  },

  data: {
    isRefreshing: false,
    rankMode: 'points',
    displayList: [] as any[],
    worstUser: null as any,
    expandedTagUserIds: [] as number[],
  },

  observers: {
    listData() {
      ;(this as any).updateDisplayList()
    },
  },

  lifetimes: {
    attached() {
      ;(this as any).updateDisplayList()
    },
  },

  methods: {
    updateDisplayList() {
      const self = this as any
      const list = Array.isArray(self.properties.listData) ? [...(self.properties.listData as any[])] : []
      const rankScene = String(self.properties.rankScene || 'wealth')
      if (rankScene === 'fitness') {
        const sortedList = list.sort((a, b) => {
          if ((b.fitnessPoints || 0) !== (a.fitnessPoints || 0)) {
            return (b.fitnessPoints || 0) - (a.fitnessPoints || 0)
          }
          if ((b.fitnessCount || 0) !== (a.fitnessCount || 0)) {
            return (b.fitnessCount || 0) - (a.fitnessCount || 0)
          }
          return (a.id || 0) - (b.id || 0)
        }).map((item) => ({
          ...item,
          showNoBattleTag: false,
          isTagsExpanded: false,
          canToggleTags: false,
          displayTags: [],
          hiddenTagCount: 0,
          rankMetricText: String(item.fitnessPoints || 0),
          rankMetricLabel: '次',
          rankMetricPositive: true,
          fitnessCountText: String(item.fitnessCount || 0),
          fitnessTitleText: `健身 ${item.fitnessCount || 0} 次`,
        }))
        self.setData({
          displayList: sortedList,
          worstUser: null,
        })
        return
      }
      const rankMode = self.data.rankMode
      const expandedTagUserIds = Array.isArray(self.data.expandedTagUserIds) ? self.data.expandedTagUserIds : []
      const compareParticipation = (a: any, b: any) => {
        const aHasGames = (a.totalGames || 0) > 0
        const bHasGames = (b.totalGames || 0) > 0
        if (aHasGames !== bHasGames) {
          return aHasGames ? -1 : 1
        }
        return 0
      }
      const worstSortedList = [...list].sort((a, b) => {
        if ((a.points || 0) !== (b.points || 0)) {
          return (a.points || 0) - (b.points || 0)
        }
        if ((a.winRate || 0) !== (b.winRate || 0)) {
          return (a.winRate || 0) - (b.winRate || 0)
        }
        return (a.totalGames || 0) - (b.totalGames || 0)
      })
      const worstUser = worstSortedList.length > 0
        ? {
            ...worstSortedList[0],
            worstPointsText: String(worstSortedList[0].points || 0),
            worstWinRateText: `${((((worstSortedList[0].winRate || 0) * 1000) / 10)).toFixed(1)}%`,
          }
        : null

      const sortedList = list.sort((a, b) => {
        const participationResult = compareParticipation(a, b)
        if (participationResult !== 0) {
          return participationResult
        }
        if (rankMode === 'winRate') {
          if ((b.winRate || 0) !== (a.winRate || 0)) {
            return (b.winRate || 0) - (a.winRate || 0)
          }
          if ((b.totalGames || 0) !== (a.totalGames || 0)) {
            return (b.totalGames || 0) - (a.totalGames || 0)
          }
        } else if ((b.points || 0) !== (a.points || 0)) {
          return (b.points || 0) - (a.points || 0)
        }
        return (b.winCount || 0) - (a.winCount || 0)
      }).map((item) => ({
        ...item,
        showNoBattleTag: (item.totalGames || 0) <= 0,
        isTagsExpanded: expandedTagUserIds.includes(item.id),
        canToggleTags: Array.isArray(item.lastTags) && item.lastTags.length > 3,
        displayTags: Array.isArray(item.lastTags)
          ? (expandedTagUserIds.includes(item.id) ? item.lastTags : item.lastTags.slice(0, 3))
          : [],
        hiddenTagCount: Array.isArray(item.lastTags) && !expandedTagUserIds.includes(item.id) && item.lastTags.length > 3
          ? item.lastTags.length - 3
          : 0,
        rankMetricText: rankMode === 'winRate'
          ? `${(((item.winRate || 0) * 1000) / 10).toFixed(1)}%`
          : String(item.points || 0),
        rankMetricLabel: rankMode === 'winRate' ? '胜率' : '金币',
        rankMetricPositive: rankMode === 'winRate' ? true : (item.points || 0) >= 0,
      }))

      self.setData({
        displayList: sortedList,
        worstUser,
      })
    },
    switchRankMode(e: any) {
      const self = this as any
      const mode = e.currentTarget.dataset.mode
      if (!mode || mode === self.data.rankMode) {
        return
      }
      self.setData({
        rankMode: mode,
      }, () => {
        self.updateDisplayList()
      })
    },
    switchFitnessTab(e: any) {
      const self = this as any
      const tab = String(e.currentTarget.dataset.tab || '')
      if (!tab || tab === self.properties.fitnessTab) {
        return
      }
      self.triggerEvent(
        'switchFitnessTab',
        { tab },
        {
          bubbles: true,
          composed: true,
        }
      )
    },
    toggleTags(e: any) {
      const self = this as any
      const userId = Number(e.currentTarget.dataset.id || 0)
      if (!userId) {
        return
      }
      const expandedTagUserIds = Array.isArray(self.data.expandedTagUserIds) ? [...self.data.expandedTagUserIds] : []
      const userIndex = expandedTagUserIds.indexOf(userId)
      if (userIndex >= 0) {
        expandedTagUserIds.splice(userIndex, 1)
      } else {
        expandedTagUserIds.push(userId)
      }
      self.setData({
        expandedTagUserIds,
      }, () => {
        self.updateDisplayList()
      })
    },
    onRefresh() {
      const self = this as any
      if (self.data.isRefreshing) {
        return
      }

      self.setData({
        isRefreshing: true,
      })

      self.loadData().finally(() => {
        self.setData({
          isRefreshing: false,
        })
      })
    },
    async loadData() {
      const self = this as any
      try {
        // 触发父页面方法（带参数）
        self.triggerEvent(
          'load',
          {
            from: 'component',
          },
          {
            bubbles: true, // 是否冒泡
            composed: true, // 是否跨越组件边界
          }
        )
      } catch (e) {
        console.error(e)
      }
    },
    clickUserAvatar(e: any) {
      const self = this as any
      const id = e.target.dataset.id
      const username = e.target.dataset.username
      try {
        // 触发父页面方法（带参数）
        self.triggerEvent(
          'clickUserAvatar',
          {
            from: 'component',
            userId: id,
            username,
          },
          {
            bubbles: true, // 是否冒泡
            composed: true, // 是否跨越组件边界
          }
        )
      } catch (e) {
        console.error(e)
      }
    },
  },
})
