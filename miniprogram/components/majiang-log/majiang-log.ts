import { deleteMajiangLog, getPrizePoolDetail } from '../../services/majiang-service'
import { convertUserDTO } from '../../utils/util'

Component({
  properties: {
    listData: {
      type: Array,
      value: [],
    },
    title: {
      type: String,
      value: '游戏历史',
    },
    emptyText: {
      type: String,
      value: '',
    },
    isInitialLoading: {
      type: Boolean,
      value: false,
    },
    hasMoreData: {
      type: Boolean,
      value: true,
    },
    prizePoolInfo: {
      type: Object,
      value: null,
    },
    prizePoolLoading: {
      type: Boolean,
      value: false,
    },
  },
  data: {
    isRefreshing: false,
    isLoadingMore: false,
    showPrizePoolDetail: false,
    prizePoolDetailLoading: false,
    prizePoolContributors: [] as PrizePoolContributorItem[],
    prizePoolJackpotEvents: [] as PrizePoolJackpotEventItem[],
  },

  // 记录加载开始的时间戳，用于超时检测
  loadingStartTime: 0,
  methods: {
    togglePrizePoolDetail() {
      if (this.data.prizePoolLoading || !this.properties.prizePoolInfo) {
        return
      }

      const nextShowPrizePoolDetail = !this.data.showPrizePoolDetail
      this.setData({
        showPrizePoolDetail: nextShowPrizePoolDetail,
      })

      if (nextShowPrizePoolDetail) {
        this.loadPrizePoolDetail()
      }
    },

    loadPrizePoolDetail() {
      this.setData({
        prizePoolDetailLoading: true,
      })

      return getPrizePoolDetail()
        .then((detail) => {
          const contributors = Array.isArray(detail?.contributors)
            ? detail.contributors.map((item) => ({
              user: convertUserDTO(item.user),
              contributedPoints: item.contributed_points,
            }))
            : []
          const jackpotEvents = Array.isArray(detail?.jackpot_events)
            ? detail.jackpot_events.map((item) => ({
              gameId: item.game_id,
              user: convertUserDTO(item.user),
              points: item.points,
              createdTime: item.created_at,
            }))
            : []
          this.setData({
            prizePoolContributors: contributors,
            prizePoolJackpotEvents: jackpotEvents,
            prizePoolDetailLoading: false,
          })
        })
        .catch((err) => {
          console.error('获取奖池明细失败:', err)
          this.setData({
            prizePoolDetailLoading: false,
          })
        })
    },

    onRefresh() {
      if (this.data.isRefreshing) {
        return
      }

      this.setData({
        isRefreshing: true,
      })

      this.loadData().finally(() => {
        this.setData({
          isRefreshing: false,
        })
      })
    },
    async loadData() {
      try {
        // 触发父页面方法（带参数）
        this.triggerEvent(
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

    // 显示删除确认弹窗
    showDeleteConfirm(e: any) {
      const user: User = wx.getStorageSync('user')
      const recorderId = e.currentTarget.dataset.recorderid

      if (user.id === recorderId) {
        wx.showModal({
          title: '删除确认',
          content: '确定要删除这条对局记录吗？',
          confirmText: '确定',
          cancelText: '再想想',
          success: (res) => {
            if (res.confirm) {
              this.deleteRecord(e.currentTarget.dataset.id)
            }
          },
        })
      }
    },

    // 执行删除操作
    deleteRecord(gameId: number) {
      if (!gameId) return
      const user: User = wx.getStorageSync('user')
      if (user) {
        deleteMajiangLog(gameId, user.id).then(() => {
          this.setData({
            listData: this.data.listData.filter((item: any) => item.id !== gameId),
          })

          try {
            // 触发父页面方法（带参数）
            this.triggerEvent(
              'refreshData',
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
        })
      }
    },

    // 滚动到底部触发加载更多
    onScrollToLower() {
      console.log('滚动到底部，触发加载更多检查')
      console.log(`当前加载状态 - hasMoreData: ${this.data.hasMoreData}, isLoadingMore: ${this.data.isLoadingMore}`)

      if (!this.data.hasMoreData) {
        console.log('没有更多数据，停止加载')
        return
      }

      // 添加防死锁保护：如果isLoadingMore为true但3秒内没有更新，强制重置状态
      if (this.data.isLoadingMore) {
        if (this.loadingStartTime && Date.now() - this.loadingStartTime > 3000) {
          console.log('检测到加载超时，强制重置加载状态')
          this.setData({
            isLoadingMore: false,
          })
        } else {
          console.log('正在加载中，跳过此次触发')
          return
        }
      }

      // 记录开始加载的时间
      this.loadingStartTime = Date.now()

      this.setData({
        isLoadingMore: true,
      })

      console.log('触发父页面加载更多方法')
      // 触发父页面加载更多方法
      this.triggerEvent(
        'loadMore',
        {
          from: 'component',
        },
        {
          bubbles: true,
          composed: true,
        }
      )
    },

    // 加载更多完成后调用，更新加载状态
    loadMoreComplete() {
      this.setData({
        isLoadingMore: false,
      })
    },
  },
})
