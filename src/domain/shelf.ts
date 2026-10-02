import type { Material } from './types.ts'

// 本棚（v0.4〜）：教材の並べ替えと、教科別のまとめ

/** 本棚の並び順（order の小さい順、同じなら作った順） */
export function sortMaterials(materials: Material[]): Material[] {
  return [...materials].sort((a, b) => a.order - b.order || a.createdAt - b.createdAt || a.id.localeCompare(b.id))
}

/**
 * ids の中で id を1つ上（-1）か下（+1）へ動かした新しい並びを返す。
 * sameGroup を渡すと、同じグループ（教科別にまとめているときの同じ教科）の中だけで動かす。
 * 動かせないとき（端にあるなど）は元の並びをそのまま返す。
 */
export function moveWithin(
  ids: string[],
  id: string,
  direction: -1 | 1,
  sameGroup: (a: string, b: string) => boolean = () => true,
): string[] {
  const from = ids.indexOf(id)
  if (from < 0) return ids
  for (let to = from + direction; to >= 0 && to < ids.length; to += direction) {
    if (!sameGroup(id, ids[to])) continue
    const next = [...ids]
    next[from] = ids[to]
    next[to] = id
    return next
  }
  return ids
}

/** 教科まとめのときの教科名（空は「教科なし」） */
export function subjectOf(material: Pick<Material, 'subject'>): string {
  return material.subject.trim() || '教科なし'
}

/** 教科ごとにまとめる。教科の順は、その教科の教材がいちばん上に出てくる順 */
export function groupBySubject(materials: Material[]): { subject: string; materials: Material[] }[] {
  const groups = new Map<string, Material[]>()
  for (const m of materials) {
    const subject = subjectOf(m)
    groups.set(subject, [...(groups.get(subject) ?? []), m])
  }
  return [...groups].map(([subject, list]) => ({ subject, materials: list }))
}

/** 教科まとめのとき、教科ごと上下に動かした新しい並び（教材のIDの並び）を返す */
export function moveSubjectGroup(materials: Material[], subject: string, direction: -1 | 1): string[] {
  const groups = groupBySubject(materials)
  const from = groups.findIndex((g) => g.subject === subject)
  const to = from + direction
  if (from >= 0 && to >= 0 && to < groups.length) [groups[from], groups[to]] = [groups[to], groups[from]]
  return groups.flatMap((g) => g.materials.map((m) => m.id))
}
