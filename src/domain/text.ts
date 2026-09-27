/** 改行区切りで貼り付けた単元名・範囲名を1行ずつに分ける（前後の空白と空行は除く） */
export function parseLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}
