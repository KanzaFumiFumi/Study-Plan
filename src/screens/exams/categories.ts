/** 予定の種類（ボタンで選ぶ）。保存するのは文字列なので、あとから増やしても既存のデータに影響しない */
export const EVENT_CATEGORIES = ['定期考査', '模試', '資格', '共通テスト', '大会', '旅行', '趣味', 'その他']

const PLACEHOLDERS: Record<string, string> = {
  定期考査: '例：2学期期末考査',
  模試: '例：第2回全統模試',
  資格: '例：英検2級',
  共通テスト: '例：共通テスト本番',
  大会: '例：県大会',
  旅行: '例：修学旅行',
  趣味: '例：ピアノ発表会',
}

export function namePlaceholder(category: string): string {
  return PLACEHOLDERS[category] ?? '例：〇〇の日'
}
