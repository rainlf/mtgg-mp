export const MAX_NICKNAME_LENGTH = 4

export const normalizeNicknameInput = (value: string): string => {
  return Array.from(value || '').slice(0, MAX_NICKNAME_LENGTH).join('')
}

export const getTrimmedNickname = (value: string): string => {
  return (value || '').trim()
}

export const validateNickname = (value: string): string | null => {
  const trimmed = getTrimmedNickname(value)
  if (!trimmed) {
    return '请输入昵称'
  }

  if (Array.from(trimmed).length > MAX_NICKNAME_LENGTH) {
    return `昵称最多${MAX_NICKNAME_LENGTH}个字`
  }

  return null
}
