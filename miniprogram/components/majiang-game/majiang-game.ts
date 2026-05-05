import { getMajiangPlayers, saveMaJiangGame, updatePlayers } from '../../services/majiang-service'

Component({
  properties: {
    showDrawer: {
      type: Boolean,
      value: true,
    },
  },
  data: {
    gameType: '胡牌', // 默认选中胡牌
    allPlayers: [] as User[],
    currentTablePlayers: [] as any[],
    winPlayers: [] as User[],
    losePlayers: [] as User[],
    changingPlayers: false,
    selectUserToPlayList: [] as number[],
    showSubmitConfirm: false,
    submitGameType: 0,
    submitGameTypeLabel: '',
    submitWinners: [] as any[],
    submitLosers: [] as any[],
    submitWinnerSummary: [] as any[],
    submitLoserSummary: [] as any[],

    // 底分
    points: [
      { name: 3, point: 3, selected: false },
      { name: 4, point: 4, selected: false },
      { name: 5, point: 5, selected: false },
      { name: 6, point: 6, selected: false },
      { name: 7, point: 7, selected: false },
      { name: 8, point: 8, selected: false },
      { name: 9, point: 9, selected: false },
      { name: '🍒', point: 10, selected: false },
    ],

    // 牌型
    winTypes: [
      { code: 'yi_tiao_long', name: '一条龙', multi: 2, selected: false },
      { code: 'da_diao_che', name: '大吊车', multi: 2, selected: false },
      { code: 'peng_peng_hu', name: '碰碰胡', multi: 2, selected: false },
      { code: 'men_qian_qing', name: '门前清', multi: 2, selected: false },
      { code: 'hun_yi_se', name: '混一色', multi: 2, selected: false },
      { code: 'qing_yi_se', name: '清一色', multi: 4, selected: false },
      { code: 'xiao_qi_dui', name: '小七对', multi: 4, selected: false },
      { code: 'long_qi_dui', name: '龙七对', multi: 8, selected: false },
      { code: 'gang_kai_hua', name: '杠开花', multi: 2, selected: false },
    ],
  },
  observers: {
    showDrawer(val) {
      if (val) {
        this.loadData()
      }
    },
  },
  methods: {
    getInitialPoints() {
      return [
        { name: 3, point: 3, selected: false },
        { name: 4, point: 4, selected: false },
        { name: 5, point: 5, selected: false },
        { name: 6, point: 6, selected: false },
        { name: 7, point: 7, selected: false },
        { name: 8, point: 8, selected: false },
        { name: 9, point: 9, selected: false },
        { name: '🍒', point: 10, selected: false },
      ]
    },

    getInitialWinTypes() {
      return [
        { code: 'yi_tiao_long', name: '一条龙', multi: 2, selected: false },
        { code: 'da_diao_che', name: '大吊车', multi: 2, selected: false },
        { code: 'peng_peng_hu', name: '碰碰胡', multi: 2, selected: false },
        { code: 'men_qian_qing', name: '门前清', multi: 2, selected: false },
        { code: 'hun_yi_se', name: '混一色', multi: 2, selected: false },
        { code: 'qing_yi_se', name: '清一色', multi: 4, selected: false },
        { code: 'xiao_qi_dui', name: '小七对', multi: 4, selected: false },
        { code: 'long_qi_dui', name: '龙七对', multi: 8, selected: false },
        { code: 'gang_kai_hua', name: '杠开花', multi: 2, selected: false },
      ]
    },

    resetFormState() {
      this.setData({
        gameType: '胡牌',
        winPlayers: [],
        losePlayers: [],
        changingPlayers: false,
        showSubmitConfirm: false,
        submitGameType: 0,
        submitGameTypeLabel: '',
        submitWinners: [],
        submitLosers: [],
        submitWinnerSummary: [],
        submitLoserSummary: [],
        points: this.getInitialPoints(),
        winTypes: this.getInitialWinTypes(),
      })
    },

    getWinTypeNameMap() {
      return this.getInitialWinTypes().reduce((map: Record<string, string>, item: any) => {
        map[item.code] = item.name
        return map
      }, {})
    },

    buildSubmitWinnerSummary(players: User[]) {
      const winTypeNameMap = this.getWinTypeNameMap()
      return players.map((player: User) => {
        const winTypeNames = (player.gameInfo.winTypes || []).map((code: string) => winTypeNameMap[code]).filter(Boolean)
        return {
          id: player.id,
          username: player.username,
          scoreText: `${player.gameInfo.basePoints * player.gameInfo.multi} 分`,
          detailText: `底${player.gameInfo.basePoints} x 倍${player.gameInfo.multi}`,
          winTypeText: winTypeNames.length > 0 ? winTypeNames.join(' / ') : '无牌型',
        }
      })
    },

    buildSubmitLoserSummary(players: User[]) {
      return players.map((player: User) => ({
        id: player.id,
        username: player.username,
      }))
    },

    hideSubmitConfirm() {
      this.setData({
        showSubmitConfirm: false,
        submitGameType: 0,
        submitGameTypeLabel: '',
        submitWinners: [],
        submitLosers: [],
        submitWinnerSummary: [],
        submitLoserSummary: [],
      })
    },

    noop() {},

    confirmSubmit() {
      this.submit(this.data.submitGameType, this.data.submitWinners as User[], this.data.submitLosers as User[])
    },

    buildTablePlayers(selectedIds: number[], preferredPlayers: User[] = []) {
      const playerMap = new Map<number, User>()
      preferredPlayers.forEach((player: User) => {
        playerMap.set(player.id, player)
      })
      this.data.allPlayers.forEach((player: User) => {
        if (!playerMap.has(player.id)) {
          playerMap.set(player.id, player)
        }
      })

      const selectedPlayers = selectedIds
        .map((id: number) => playerMap.get(id))
        .filter((player: User | undefined): player is User => !!player)

      const tablePlayers = selectedPlayers.map((player: User) => ({
        ...player,
        empty: false,
      }))

      while (tablePlayers.length < 4) {
        tablePlayers.push({
          id: 0,
          username: '空位',
          avatar: '',
          empty: true,
        })
      }

      return tablePlayers.slice(0, 4)
    },

    createGamePlayers(_gameType: string, players: User[], _allPlayers: User[]) {
      const winPlayers = players.map((player: User, index: number) => ({
        ...player,
        selected: false,
        // 默认激活第一个牌桌玩家，保证首次打开时记分面板可见
        lastSelected: index === 0,
        gameInfo: { basePoints: 0, winTypes: [], multi: 1 },
      }))

      const losePlayers = players
        .map((player: User) => ({
          ...player,
          selected: false,
          disabled: false,
        }))

      return { winPlayers, losePlayers }
    },

    // 数据初始化
    loadData() {
      this.resetFormState()
      getMajiangPlayers().then((res) => {
        const currentPlayers = res.currentPlayers
        const currentIds = currentPlayers.map((player: User) => player.id)
        const allPlayers = res.allPlayers.map((player: User) => {
          if (currentIds.includes(player.id)) {
            return { ...player, selected: true }
          } else {
            return { ...player, selected: false }
          }
        })

        const currentTablePlayers = this.buildTablePlayers(currentIds, currentPlayers)
        const activePlayers = currentTablePlayers.filter((player: any) => !player.empty) as User[]
        const { winPlayers, losePlayers } = this.createGamePlayers(this.data.gameType, activePlayers, allPlayers)

        this.setData({
          gameType: '胡牌',
          winPlayers,
          losePlayers,
          allPlayers,
          currentTablePlayers,
          selectUserToPlayList: currentIds,
          changingPlayers: false,
          points: this.getInitialPoints(),
          winTypes: this.getInitialWinTypes(),
        })
      })
    },

    // 清空按钮
    handleDelete(e: any) {
      const userId = e.currentTarget.dataset.id
      if (!userId || typeof userId !== 'number') {
        return
      }
      const winPlayers = this.data.winPlayers.map((player: User) => ({
        ...player,
        selected: false,
        lastSelected: player.id === userId,
        gameInfo: player.id === userId ? { basePoints: 0, winTypes: [], multi: 1 } : player.gameInfo,
      }))
      const losePlayers = this.data.losePlayers.map((player: User) => ({
        ...player,
        selected: false,
        disabled: false,
      }))
      const points = this.data.points.map((point: any) => ({ ...point, selected: false }))
      const winTypes = this.data.winTypes.map((winType: any) => ({ ...winType, selected: false }))

      this.setData({
        winPlayers,
        losePlayers,
        points,
        winTypes,
      })
    },

    selectBasePoints(e: any) {
      const name = e.currentTarget.dataset.name
      const point = e.currentTarget.dataset.point
      const userId = e.currentTarget.dataset.userid
      if (!userId || typeof userId !== 'number') {
        return
      }

      this.setData({
        points: this.data.points.map((item: any) => (item.name === name ? { ...item, selected: true } : { ...item, selected: false })),
        winPlayers: this.data.winPlayers.map((user: User) => {
          if (user.id === userId) {
            return { ...user, lastSelected: true, gameInfo: { ...user.gameInfo, basePoints: point } }
          } else {
            return { ...user, lastSelected: false }
          }
        }),
      })
    },
    handleDecrease(e: any) {
      const userId = e.currentTarget.dataset.userid
      if (!userId || typeof userId !== 'number') {
        return
      }

      const user = this.data.winPlayers.filter((x: User) => x.id === userId)[0]
      const target = user.gameInfo.basePoints - 1
      if (target < 0) {
        wx.showToast({
          title: '底分不能小于 0 呀 😏',
          icon: 'none',
          duration: 1000,
        })
        return
      }
      this.setData({
        winPlayers: this.data.winPlayers.map((player: User) => {
          if (player.id === userId) {
            return { ...player, lastSelected: true, gameInfo: { ...player.gameInfo, basePoints: target } }
          } else {
            return { ...player, lastSelected: false }
          }
        }),
        points: this.data.points.map((point: any) => ({ ...point, selected: point.point === target })),
      })
    },
    handleIncrease(e: any) {
      const userId = e.currentTarget.dataset.userid
      if (!userId || typeof userId !== 'number') {
        return
      }

      const user = this.data.winPlayers.filter((x: User) => x.id === userId)[0]
      const target = user.gameInfo.basePoints + 1
      if (target > 20) {
        wx.showToast({
          title: '底分是不是太大了呀 😏',
          icon: 'none',
          duration: 1000,
        })
        return
      }
      this.setData({
        winPlayers: this.data.winPlayers.map((player: User) => {
          if (player.id === userId) {
            return { ...player, lastSelected: true, gameInfo: { ...player.gameInfo, basePoints: target } }
          } else {
            return { ...player, lastSelected: false }
          }
        }),
        points: this.data.points.map((point: any) => ({ ...point, selected: point.point === target })),
      })
    },

    toggleWinType(e: any) {
      const name = e.currentTarget.dataset.name
      const code = e.currentTarget.dataset.code
      const multi = e.currentTarget.dataset.multi
      const selected = e.currentTarget.dataset.selected
      const userId = e.currentTarget.dataset.userid

      this.setData({
        winTypes: this.data.winTypes.map((type: any) => (type.code === code ? { ...type, selected: !type.selected } : type)),
        winPlayers: this.data.winPlayers.map((player: User) => {
          if (player.id === userId) {
            let totalMulti = player.gameInfo.multi
            let totalWinTypes = player.gameInfo.winTypes
            if (selected) {
              totalMulti /= multi
              totalWinTypes = totalWinTypes.filter((x: string) => x !== code)
            } else {
              totalMulti *= multi
              totalWinTypes = [...totalWinTypes, code]
            }
            return {
              ...player,
              lastSelected: true,
              gameInfo: { ...player.gameInfo, winTypes: totalWinTypes, multi: totalMulti },
            }
          } else {
            return { ...player, lastSelected: false }
          }
        }),
      })
    },

    selectWinType(e: any) {
      const type = e.currentTarget.dataset.type
      const data: any = {
        gameType: type,
        points: this.data.points.map((point: any) => ({ ...point, selected: false })),
        winTypes: this.data.winTypes.map((winType: any) => ({ ...winType, selected: false })),
      }

      const activePlayers = this.data.currentTablePlayers.filter((player: any) => !player.empty) as User[]
      const { winPlayers, losePlayers } = this.createGamePlayers(type, activePlayers, this.data.allPlayers)
      data.winPlayers = winPlayers
      data.losePlayers = losePlayers

      this.setData(data)
    },

    selectWinPlayer(e: any) {
      const playerId = e.currentTarget.dataset.id
      const selected = e.currentTarget.dataset.selected
      const lastSelected = e.currentTarget.dataset.lastselected

      if (this.data.gameType === '胡牌') {
        const selectedCount = this.data.winPlayers.filter((player: User) => player.selected).length
        if (!selected && selectedCount >= 3) {
          wx.showToast({
            title: '最多 3 个赢家 😏',
            icon: 'none',
            duration: 1000,
          })
          return
        }

        const shouldKeepSelected = selected && !lastSelected
        const nextSelected = shouldKeepSelected ? true : !selected
        const nextWinPlayers = this.data.winPlayers.map((player: User) => {
          if (player.id === playerId) {
            return {
              ...player,
              selected: nextSelected,
              lastSelected: true,
            }
          }
          return { ...player, lastSelected: false }
        })

        const nextSelectedPlayerIds = nextWinPlayers.filter((player: User) => player.selected).map((player: User) => player.id)
        const data: any = {
          winPlayers: nextWinPlayers,
          losePlayers: nextWinPlayers.map((player: User) => ({
            ...player,
            selected: nextSelectedPlayerIds.includes(player.id)
              ? false
              : !!this.data.losePlayers.find((losePlayer: any) => losePlayer.id === player.id && losePlayer.selected),
            disabled: nextSelectedPlayerIds.includes(player.id),
          })),
        }

        if (!selected || shouldKeepSelected) {
          const user = this.data.winPlayers.filter((x: User) => x.id === playerId)[0]
          const targetPoints = user.gameInfo.basePoints
          const targetWinTypes = user.gameInfo.winTypes
          data.points = this.data.points.map((point: any) => ({
            ...point,
            selected: point.point === targetPoints,
          }))
          data.winTypes = this.data.winTypes.map((winType: any) => ({
            ...winType,
            selected: targetWinTypes.includes(winType.code),
          }))
        }
        this.setData(data)
        return
      }

      if (this.data.gameType === '自摸' || this.data.gameType === '相公') {
        this.setData({
          winPlayers: this.data.winPlayers.map((player: User) =>
            player.id === playerId
              ? { ...player, selected: true, lastSelected: true }
              : { ...player, selected: false, lastSelected: false, gameInfo: { basePoints: 0, winTypes: [], multi: 1 } }
          ),
        })
        if (!lastSelected) {
          this.setData({
            points: this.data.points.map((point: any) => ({ ...point, selected: false })),
            winTypes: this.data.winTypes.map((winType: any) => ({ ...winType, selected: false })),
          })
        }
        const selectedPlayerId: number[] = this.data.winPlayers
          .map((player: User) => (player.id === playerId ? player.id : 0))
          .filter((id: number) => id > 0)
        this.setData({
          losePlayers: this.data.winPlayers.map((player: User) => ({
            ...player,
            selected: selectedPlayerId.includes(player.id)
              ? false
              : !!this.data.losePlayers.find((losePlayer: any) => losePlayer.id === player.id && losePlayer.selected),
            disabled: selectedPlayerId.includes(player.id),
          })),
        })
      }
    },
    selectLosePlayer(e: any) {
      const playerId = e.currentTarget.dataset.id
      const disabled = e.currentTarget.dataset.disabled
      const selected = e.currentTarget.dataset.selected

      if (disabled) {
        return
      }

      this.setData({
        losePlayers: this.data.losePlayers.map((player: User) => {
          if (player.id === playerId) {
            return { ...player, selected: !selected }
          } else {
            return { ...player, selected: false }
          }
        }),
      })
    },
    selectPlayerToPlay(e: any) {
      const playerId = e.currentTarget.dataset.id
      const selected = e.currentTarget.dataset.selected

      if (selected === false && this.data.selectUserToPlayList.length >= 4) {
        wx.showToast({
          title: '最多 4 人 PLAY 😏',
          icon: 'none',
          duration: 1000,
        })
        return
      }
      let nextSelectedIds = [...this.data.selectUserToPlayList]
      if (this.data.selectUserToPlayList.includes(playerId)) {
        nextSelectedIds.splice(this.data.selectUserToPlayList.indexOf(playerId), 1)
      } else {
        nextSelectedIds = [...nextSelectedIds, playerId]
      }
      const currentTablePlayers = this.buildTablePlayers(nextSelectedIds)
      this.setData({
        selectUserToPlayList: nextSelectedIds,
        currentTablePlayers,
        allPlayers: this.data.allPlayers.map((player: User) => {
          if (player.id === playerId) {
            return { ...player, selected: !player.selected }
          } else {
            return player
          }
        }),
      })
    },
    startChangePlayers() {
      this.setData({
        changingPlayers: true,
      })
    },
    cancelChangePlayers() {
      this.loadData()
    },
    saveCurrentPlayers() {
      const selectedIds = this.data.selectUserToPlayList
      const currentUser = wx.getStorageSync('user')
      if (selectedIds.length !== 4) {
        wx.showToast({
          title: '游戏需要 4 名玩家哦 😏',
          icon: 'none',
          duration: 1000,
        })
        return
      }
      if (!currentUser || !currentUser.id) {
        wx.showToast({
          title: '用户信息异常',
          icon: 'none',
          duration: 1000,
        })
        return
      }
      wx.showLoading({ title: '保存中...' })
      updatePlayers(currentUser.id, selectedIds).then(() => {
        wx.hideLoading()
        wx.showToast({
          title: '牌桌人员已更新',
          icon: 'success',
          duration: 1200,
        })
        this.loadData()
      }).catch((err) => {
        wx.hideLoading()
        wx.showToast({
          title: typeof err === 'string' ? err : '保存失败',
          icon: 'none',
          duration: 1200,
        })
      })
    },

    closeDrawer() {
      this.resetFormState()
      this.setData({
        showDrawer: false,
      })
      this.triggerEvent('closeDrawer')
    },

    showSubmit() {
      let winners: User[] = []
      let losers: User[] = []
      if (this.data.gameType === '胡牌' || this.data.gameType === '自摸') {
        winners = this.data.winPlayers.filter((player: User) => player.selected)
        losers = this.data.losePlayers.filter((player: User) => player.selected)
      }
      if (this.data.gameType === '相公') {
        winners = this.data.winPlayers.filter((player: User) => !player.selected)
        losers = this.data.winPlayers.filter((player: User) => player.selected)
        winners.forEach((player: User) => {
          player.gameInfo.basePoints = 1
        })
        losers.forEach((player: User) => {
          player.gameInfo.basePoints = 3
        })
      }
      let exit = false
      winners.forEach((player: User) => {
        if (player.gameInfo.basePoints <= 0) {
          exit = true
        }
      })
      if (exit) {
        wx.showToast({
          title: '赢家得分必须大于 0 哦 🍑',
          icon: 'none',
          duration: 1000,
        })
        return
      }

      if (this.data.gameType === '胡牌') {
        if (winners.length < 1) {
          wx.showToast({
            title: '请至少选择一个赢家 🥕',
            icon: 'none',
            duration: 1000,
          })
          return
        }
        if (losers.length !== 1) {
          wx.showToast({
            title: '请选择一个输家 🍌',
            icon: 'none',
            duration: 1000,
          })
          return
        }
      }
      if (this.data.gameType === '自摸') {
        if (winners.length !== 1) {
          wx.showToast({
            title: '请选择一个赢家 🥕',
            icon: 'none',
            duration: 1000,
          })
          return
        }
        losers = this.data.losePlayers.filter((player: User) => player.id !== winners[0].id)
      }
      if (this.data.gameType === '相公') {
        if (losers.length !== 1) {
          wx.showToast({
            title: '是谁相公了呀 🦆',
            icon: 'none',
            duration: 1000,
          })
          return
        }
      }

      let gameType = 1
      if (this.data.gameType === '胡牌') {
        if (winners.length === 1) {
          gameType = 1
        } else if (winners.length === 2) {
          gameType = 3
        } else if (winners.length === 3) {
          gameType = 4
        }
      } else if (this.data.gameType === '自摸') {
        gameType = 2
      } else if (this.data.gameType === '相公') {
        gameType = 5
      }

      this.setData({
        showSubmitConfirm: true,
        submitGameType: gameType,
        submitGameTypeLabel: this.data.gameType,
        submitWinners: winners,
        submitLosers: losers,
        submitWinnerSummary: this.buildSubmitWinnerSummary(winners),
        submitLoserSummary: this.buildSubmitLoserSummary(losers),
      })
    },

    submit(gameType: number, winners: User[], losers: User[]) {
      const data = {
        gameType: gameType,
        players: this.data.winPlayers.map((player: User) => player.id),
        recorderId: wx.getStorageSync('user').id,
        winners: winners.map((player: User) => ({
          userId: player.id,
          basePoints: player.gameInfo.basePoints,
          winTypes: player.gameInfo.winTypes,
        })),
        losers: losers.map((player: User) => player.id),
      }
      saveMaJiangGame(data as any).then(() => {
        this.hideSubmitConfirm()
        this.closeDrawer()
        wx.showToast({
          title: '提交成功',
          icon: 'success',
          duration: 1500,
        })
        try {
          this.triggerEvent(
            'refreshData',
            {
              from: 'component',
            },
            {
              bubbles: true,
              composed: true,
            }
          )
        } catch (e) {
          console.error(e)
        }
      })
    },
  },
})
