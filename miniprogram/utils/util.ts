import { getServer } from '../services/request-service'

export const formatTime = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return (
    [year, month, day].map(formatNumber).join('/') +
    ' ' +
    [hour, minute, second].map(formatNumber).join(':')
  )
}

const formatNumber = (n: number) => {
  const s = n.toString()
  return s[1] ? s : '0' + s
}

const normalizeAssetURL = (url?: string): string => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  if (url.startsWith('/')) {
    return `${getServer()}${url}`
  }
  return url
}

// 从缓存中更新头像
export const updateAvatarFromCache = (userId: number, avatars: any[]): string | null => {
  if (!avatars || avatars.length === 0) return null
  const userInfo = avatars.find((item: any) => item.id === userId)
  return userInfo ? normalizeAssetURL(userInfo.avatar) : null
}

// 将后端 UserDTO 转为前端 User 结构
export const convertUserDTO = (dto: UserDTO): User => {
  return {
    id: dto.id,
    username: dto.nickname || '',
    nickname: dto.nickname || '',
    avatar: normalizeAssetURL(dto.avatar_url),
    points: dto.total_points || 0,
    totalGames: dto.total_games || 0,
    winCount: dto.win_count || 0,
    winRate: typeof dto.win_rate === 'number' ? dto.win_rate : 0,
    lastTags: Array.isArray(dto.tags) ? dto.tags : [],
    createdTime: dto.created_at || '',
    updatedTime: dto.updated_at || '',
    selected: false,
    lastSelected: false,
    gameInfo: { basePoints: 0, winTypes: [], multi: 1 },
  }
}

// 将后端 GameDTO 转为前端 MajiangLog 结构
export const convertGameDTO = (dto: GameDTO, currentUserId: number): MajiangLog => {
  const dtoPlayers = Array.isArray(dto.players) ? dto.players : []
  const isSquatRedeem = dto.type_code === 6
  
  // 如果数据异常少于4人，用空用户补齐，避免前端渲染出错
  const emptyUser: User = {
    id: 0, username: '', nickname: '', avatar: '', points: 0,
    totalGames: 0, winCount: 0, winRate: 0, lastTags: [], createdTime: '', updatedTime: '',
    selected: false, lastSelected: false,
    gameInfo: { basePoints: 0, winTypes: [], multi: 1 },
  }

  const allParticipants = dtoPlayers.filter(p => p.role_code === 1 || p.role_code === 2 || p.role_code === 3 || p.role_code === 4 || p.role_code === 5)
  const playerList = allParticipants.sort((a, b) => a.seat - b.seat)

  const player1 = playerList[0] ? convertUserDTO(playerList[0].user) : emptyUser
  const player2 = playerList[1] ? convertUserDTO(playerList[1].user) : emptyUser
  const player3 = playerList[2] ? convertUserDTO(playerList[2].user) : emptyUser
  const player4 = playerList[3] ? convertUserDTO(playerList[3].user) : emptyUser

  // 构建赢家列表
  const winners: MajiangLogItem[] = dtoPlayers
    .filter(p => isSquatRedeem ? p.role_code === 5 : p.role_code === 1)
    .map(p => ({
      user: convertUserDTO(p.user),
      points: p.final_points,
      tags: isSquatRedeem
        ? []
        : (p.win_types ? p.win_types.map(wt => wt.name) : []),
    }))

  // 构建输家列表
  const losers: MajiangLogItem[] = dtoPlayers
    .filter(p => p.role_code === 2)
    .map(p => ({
      user: convertUserDTO(p.user),
      points: p.final_points,
      tags: p.win_types ? p.win_types.map(wt => wt.name) : [],
    }))

  // 找到记录者
  // 兼容两种来源：
  // 1) 后端新增独立 RoleRecorder(3) 行承载“记录者奖励分”
  // 2) 旧逻辑仅能通过 created_by + 玩家列表里同 user_id 的行推断
  const recorderPlayer = dtoPlayers.find(p => p.role_code === 3) ||
    dtoPlayers.find(p => p.user && dto.created_by && p.user.id === dto.created_by.id)
  const recorderUser = dto.created_by
    ? convertUserDTO(dto.created_by)
    : (recorderPlayer && recorderPlayer.user ? convertUserDTO(recorderPlayer.user) : emptyUser)

  const recorder: MajiangLogItem = {
    user: recorderUser,
    points: recorderPlayer ? recorderPlayer.final_points : 0,
    poolContribution: recorderPlayer ? recorderPlayer.base_points : 0,
    tags: [],
  }

  const jackpotEvent: MajiangJackpotEvent | null = recorderPlayer && recorderPlayer.final_points > 0
    ? {
      user: recorderUser,
      points: recorderPlayer.final_points,
    }
    : null

  // 删除图标：本人显示可删除图标，其他人显示灰色禁用图标
  const deleteIcon = (recorderUser.id === currentUserId) ? '/images/delete.png' : '/images/delete2.png'

  // 是否为当前用户的个人视图下的对局
  const currentPlayerInGame = dtoPlayers.find(p => p.user && p.user.id === currentUserId)
  const playerWin = currentPlayerInGame ? currentPlayerInGame.role_code === 1 || currentPlayerInGame.role_code === 5 : false

  return {
    id: dto.id,
    type: dto.type,
    typeCode: dto.type_code,
    status: dto.status,
    player1,
    player2,
    player3,
    player4,
    createdTime: dto.created_at,
    updatedTime: dto.settled_at || dto.created_at,
    winners,
    losers,
    recorder,
    jackpotEvent,
    deleteIcon,
    forOnePlayer: false,
    playerWin,
    remark: dto.remark || '',
  }
}
