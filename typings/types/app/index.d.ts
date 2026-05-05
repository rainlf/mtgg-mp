interface IAppOption {
  globalData: {}
}

// 用户基本信息（对应后端 UserWithStatsDTO）
interface User {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  points: number;
  totalGames: number;
  winCount: number;
  winRate: number;
  lastTags: string[];
  createdTime: string;
  updatedTime: string;
  // 前端辅助字段
  selected: boolean;
  lastSelected: boolean;
  gameInfo: UserGameInfo;
}

// 记分面板中的用户游戏信息
interface UserGameInfo {
  basePoints: number;
  winTypes: string[];
  multi: number;
}

// 对局记录（前端展示模型，从后端GameDTO转换而来）
interface MajiangLog {
  id: number;
  type: string;
  typeCode: number;
  status: number;
  player1: User;
  player2: User;
  player3: User;
  player4: User;
  createdTime: string;
  updatedTime: string;
  winners: MajiangLogItem[];
  losers: MajiangLogItem[];
  recorder: MajiangLogItem;
  jackpotEvent?: MajiangJackpotEvent | null;
  deleteIcon: string;
  forOnePlayer: boolean;
  playerWin: boolean;
  remark: string;
}

interface MajiangJackpotEvent {
  user: User;
  points: number;
}

// 对局记录中的玩家条目
interface MajiangLogItem {
  user: User;
  points: number;
  poolContribution?: number;
  tags: string[];
}

// 牌桌玩家信息（对应后端 PlayerSummaryDTO）
interface MajiangPlayers {
  currentPlayers: User[];
  allPlayers: User[];
}

// 后端返回的原始 GameDTO
interface GameDTO {
  id: number;
  type: string;
  type_code: number;
  status: number;
  remark: string;
  created_at: string;
  settled_at: string;
  created_by: UserDTO;
  players: GamePlayerDTO[];
}

// 后端返回的原始 GamePlayerDTO
interface GamePlayerDTO {
  id: number;
  seat: number;
  role: string;
  role_code: number;
  base_points: number;
  final_points: number;
  user: UserDTO;
  win_types: WinTypeDTO[];
}

// 后端返回的用户 DTO
interface UserDTO {
  id: number;
  nickname: string;
  avatar_url: string;
  tags?: string[];
  open_id: string;
  total_points: number;
  total_games: number;
  win_count: number;
  win_rate: number;
  created_at: string;
  updated_at: string;
}

// 番型 DTO
interface WinTypeDTO {
  code: string;
  name: string;
  multiplier: number;
}

// API 响应结构
interface ApiResponse<T> {
  success: boolean;
  data: T;
  code?: number;
  message?: string;
}

// 登录响应
interface LoginResponse {
  user_id: number;
}

// 牌桌玩家响应
interface PlayersResponse {
  current_players: UserDTO[];
  all_players: UserDTO[];
}

interface PrizePoolDTO {
  pool_type: string;
  balance: number;
}

interface PrizePoolContributorDTO {
  user: UserDTO;
  contributed_points: number;
}

interface PrizePoolJackpotEventDTO {
  game_id: number;
  user: UserDTO;
  points: number;
  created_at: string;
}

interface PrizePoolDetailDTO {
  pool_type: string;
  contributors: PrizePoolContributorDTO[];
  jackpot_events: PrizePoolJackpotEventDTO[];
}

interface PrizePoolContributorItem {
  user: User;
  contributedPoints: number;
}

interface PrizePoolJackpotEventItem {
  gameId: number;
  user: User;
  points: number;
  createdTime: string;
}

// 记录对局请求
interface RecordMaJiangGameRequest {
  gameType: number;
  players: number[];
  recorderId: number;
  winners: RecordWinnerDTO[];
  losers: number[];
  remark?: string;
}

interface RecordWinnerDTO {
  userId: number;
  basePoints: number;
  winTypes: string[];
}
