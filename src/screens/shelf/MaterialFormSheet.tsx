import { useState } from 'react'
import { addMaterial, updateMaterial } from '../../data/commands.ts'
import { useData } from '../../data/store.tsx'
import { parseLines } from '../../domain/text.ts'
import type { Material, MaterialKind } from '../../domain/types.ts'
import { Sheet } from '../../components/Sheet.tsx'
import { useToast } from '../../components/Toast.tsx'
import { Button, Field, inputClass } from '../../components/ui.tsx'

const DEFAULT_SUBJECTS = ['数学', '英語', '国語', '理科', '社会', '情報']

const KIND_OPTIONS: { value: MaterialKind; label: string; description: string }[] = [
  { value: 'cycle', label: '周回系', description: '問題集など。単元ごとに周回し、残った印の数を記録する' },
  { value: 'memorize', label: '暗記系', description: '単語帳など。範囲ごとに、間隔を広げながら復習する' },
]

/** 教材の追加（material なし）と編集（material あり） */
export function MaterialFormSheet({
  material,
  defaultKind,
  onClose,
}: {
  material?: Material
  defaultKind: MaterialKind
  onClose: () => void
}) {
  const { uid, materials } = useData()
  const toast = useToast()
  const [name, setName] = useState(material?.name ?? '')
  const [subject, setSubject] = useState(material?.subject ?? '')
  const [kind, setKind] = useState<MaterialKind>(material?.kind ?? defaultKind)
  const [linesText, setLinesText] = useState('')

  const subjects = [...new Set([...materials.map((m) => m.subject).filter(Boolean), ...DEFAULT_SUBJECTS])]
  const lines = parseLines(linesText)
  const childLabel = kind === 'cycle' ? '単元' : '範囲'

  function handleSave() {
    const trimmed = { name: name.trim(), subject: subject.trim() }
    if (material) {
      updateMaterial(uid, material.id, trimmed)
      toast('保存しました')
    } else {
      addMaterial(uid, { ...trimmed, kind }, lines)
      toast(`「${trimmed.name}」を追加しました${lines.length ? `（${childLabel}${lines.length}件）` : ''}`)
    }
    onClose()
  }

  function handleArchive(archived: boolean) {
    if (!material) return
    updateMaterial(uid, material.id, { archived })
    toast(archived ? 'アーカイブしました' : 'アーカイブを解除しました')
    onClose()
  }

  return (
    <Sheet
      title={material ? '教材を編集' : '教材を追加'}
      onClose={onClose}
      footer={
        <Button className="w-full" disabled={!name.trim()} onClick={handleSave}>
          {material ? '保存' : '追加'}
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="教材名">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="例：青チャート数学II" />
        </Field>
        <Field label="科目">
          <input
            className={inputClass}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            list="subject-options"
            placeholder="例：数学"
          />
          <datalist id="subject-options">
            {subjects.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>

        {!material && (
          <>
            <fieldset>
              <legend className="mb-1 text-sm font-medium text-slate-700">種類</legend>
              <div className="grid gap-2">
                {KIND_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className={`flex cursor-pointer gap-3 rounded-xl p-3 ring-1 ${
                      kind === o.value ? 'bg-indigo-50 ring-indigo-400' : 'ring-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="kind"
                      className="mt-1 accent-indigo-600"
                      checked={kind === o.value}
                      onChange={() => setKind(o.value)}
                    />
                    <span>
                      <span className="block text-sm font-semibold">{o.label}</span>
                      <span className="block text-xs text-slate-500">{o.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label={`${childLabel}（1行に1つ。あとから追加もできます）`} hint={lines.length ? `${lines.length}件` : undefined}>
              <textarea
                className={`${inputClass} min-h-40`}
                value={linesText}
                onChange={(e) => setLinesText(e.target.value)}
                placeholder={kind === 'cycle' ? '第1章 式と証明\n第2章 複素数と方程式\n第3章 図形と方程式' : 'No.1-100\nNo.101-200\nNo.201-300'}
              />
            </Field>
          </>
        )}

        {material && (
          <div className="rounded-xl bg-slate-50 p-3">
            {material.archived ? (
              <Button variant="secondary" className="w-full" onClick={() => handleArchive(false)}>
                アーカイブを解除
              </Button>
            ) : (
              <>
                <Button variant="secondary" className="w-full" onClick={() => handleArchive(true)}>
                  アーカイブする
                </Button>
                <p className="mt-2 text-xs text-slate-500">
                  使い終わった教材を本棚の下にしまいます。タスクは「今日」に出なくなります（データは残り、いつでも戻せます）。
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </Sheet>
  )
}
