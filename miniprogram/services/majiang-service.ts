import { request } from './request-service'
import { convertUserDTO } from '../utils/util'

let cachedMajiangPlayers: MajiangPlayers | null = null
let majiangPlayersPromise: Promise<MajiangPlayers> | null = null

// 获取全局对局记录
export const getGameList = (limit: number, offset: number): Promise<GameDTO[]> => {
  return request<GameDTO[]>({
    url: '/api/game/recent',
    method: 'GET',
    data: { limit, offset },
  })
}

// 获取用户个人对局记录
export const getGameListByUser = (userId: number, limit: number, offset: number): Promise<GameDTO[]> => {
  return request<GameDTO[]>({
    url: '/api/game/user/list',
    method: 'GET',
    data: { userId, limit, offset },
  })
}

// 取消/删除对局记录
export const cancelGame = (gameId: number): Promise<any> => {
  return request<any>({
    url: '/api/game/cancel',
    method: 'POST',
    data: { game_id: gameId },
    header: { 'content-type': 'application/json' },
  })
}

// 获取牌桌玩家
export const getPlayers = (): Promise<PlayersResponse> => {
  return request<PlayersResponse>({
    url: '/api/game/players',
    method: 'GET',
  })
}

export const getPrizePool = (): Promise<PrizePoolDTO> => {
  return request<PrizePoolDTO>({
    url: '/api/game/prize-pool',
    method: 'GET',
  })
}

export const getPrizePoolDetail = (): Promise<PrizePoolDetailDTO> => {
  return request<PrizePoolDetailDTO>({
    url: '/api/game/prize-pool/detail',
    method: 'GET',
  })
}

const fetchMajiangPlayers = (): Promise<MajiangPlayers> => {
  return getPlayers().then((res) => ({
    currentPlayers: (res.current_players || []).map((item: UserDTO) => convertUserDTO(item)),
    allPlayers: (res.all_players || []).map((item: UserDTO) => convertUserDTO(item)),
  }))
}

export const clearMajiangPlayersCache = () => {
  cachedMajiangPlayers = null
  majiangPlayersPromise = null
}

export const getMajiangPlayers = (forceRefresh: boolean = false): Promise<MajiangPlayers> => {
  if (forceRefresh) {
    clearMajiangPlayersCache()
  }
  if (cachedMajiangPlayers) {
    return Promise.resolve(cachedMajiangPlayers)
  }
  if (majiangPlayersPromise) {
    return majiangPlayersPromise
  }

  majiangPlayersPromise = fetchMajiangPlayers()
    .then((players) => {
      cachedMajiangPlayers = players
      return players
    })
    .finally(() => {
      majiangPlayersPromise = null
    })

  return majiangPlayersPromise
}

export const preloadMajiangPlayers = (): Promise<MajiangPlayers> => {
  return getMajiangPlayers()
}

// 更新牌桌玩家
export const updatePlayers = (userId: number, userIds: number[]): Promise<any> => {
  return request<any>({
    url: '/api/game/players',
    method: 'POST',
    data: { user_id: userId, user_ids: userIds },
    header: { 'content-type': 'application/json' },
  }).then((res) => {
    clearMajiangPlayersCache()
    return res
  })
}

// 记录一局麻将
export const recordMaJiangGame = (data: RecordMaJiangGameRequest): Promise<any> => {
  return request<any>({
    url: '/api/game/record',
    method: 'POST',
    data: data,
    header: { 'content-type': 'application/json' },
  })
}

export const saveMaJiangGame = (data: RecordMaJiangGameRequest): Promise<any> => {
  return recordMaJiangGame(data)
}

export const redeemSquat = (data: RedeemSquatRequest): Promise<any> => {
  return request<any>({
    url: '/api/game/squat/redeem',
    method: 'POST',
    data,
    header: { 'content-type': 'application/json' },
  })
}

export const deleteMajiangLog = (gameId: number, _userId: number): Promise<any> => {
  return cancelGame(gameId)
}
