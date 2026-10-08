import { useState } from 'react'
import { addMaterial, updateMaterial } from '../../data/commands.ts'
import { useData } from '../../data/store.tsx'
import { parseLines } from '../../domain/text.ts'
import { isValidTargetLaps } from '../../domain/settings.ts'
import { DEFAULT_TARGET_LAPS, hasUnits, type Material, type MaterialKind } from '../../domain/types.ts'
import { Sheet } from '../../components/Sheet.tsx'
import { useToast } from '../../components/Toast.tsx'
import { Button, ChoiceChips, Field, inputBaseClass, inputClass } from '../../components/ui.tsx'

const DEFAULT_SUBJECTS = ['数学', '英語', '国語', '理科', '社会', '情報']

const KIND_OPTIONS: { value: MaterialKind; label: string; description: string }[] = [
  { value: 'cycle', label: '周回系', description: '問題集など。単元ごとに周回し、残った印の数を記録する' },
  { value: 'review', label: '復習系', description: '教科書・ノート・プリントなど。周回系と同じく、単元ごとに残った印の数で回す' },
  { value: 'memorize', label: '暗記系', description: '単語帳など。目標の周回数を決め、範囲ごとにいつやるかをカレンダーで決める' },
]

/** 教材の追加（material なし）と編集（material あり） */
export function MaterialFormSheet({
  material,
  defaultKind,
  onClose,
  onAdded,
}: {
  material?: Material
  defaultKind: MaterialKind
  onClose: () => void
  /** 追加したあと、その教材の画面を開くため */
  onAdded?: (materialId: string) => void
}) {
  const { uid, materials } = useData()
  const toast = useToast()
  const [name, setName] = useState(material?.name ?? '')
  const [subject, setSubject] = useState(material?.subject ?? '')
  const [kind, setKind] = useState<MaterialKind>(material?.kind ?? defaultKind)
  const [linesText, setLinesText] = useState('')
  const [targetLaps, setTargetLaps] = useState(String(material?.targetLaps ?? DEFAULT_TARGET_LAPS))

  const subjects = [...new Set([...materials.map((m) => m.subject).filter(Boolean), ...DEFAULT_SUBJECTS])]
  const lines = parseLines(linesText)
  const childLabel = hasUnits(kind) ? '単元' : '範囲'
  const laps = /^\d+$/.test(targetLaps) ? Number(targetLaps) : NaN
  const lapsOk = hasUnits(kind) || isValidTargetLaps(laps)

  function handleSave() {
    const trimmed = { name: name.trim(), subject: subject.trim() }
    // 目標の周回数は暗記系だけ使う（周回系・復習系は初期値のまま保存する）
    const lapsValue = kind === 'memorize' ? laps : (material?.targetLaps ?? DEFAULT_TARGET_LAPS)
    if (material) {
      updateMaterial(uid, material.id, { ...trimmed, targetLaps: lapsValue })
      toast('保存しました')
    } else {
      const id = addMaterial(uid, { ...trimmed, kind, targetLaps: lapsValue }, lines)
      toast(`「${trimmed.name}」を追加しました${lines.length ? `（${childLabel}${lines.length}件）` : ''}`)
      onAdded?.(id)
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
      subtitle={material ? material.name : '本棚'}
      onClose={onClose}
      footer={
        <Button className="w-full" disabled={!name.trim() || !lapsOk} onClick={handleSave}>
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
              <legend className="mb-1 text-sm font-medium text-stone-700">種類</legend>
              <div className="grid gap-2">
                {KIND_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className={`flex cursor-pointer gap-3 rounded-xl p-3 ring-1 ${
                      kind === o.value ? 'bg-stone-100 ring-2 ring-ink' : 'ring-stone-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="kind"
                      className="mt-1 accent-ink"
                      checked={kind === o.value}
                      onChange={() => setKind(o.value)}
                    />
                    <span>
                      <span className="block text-sm font-semibold">{o.label}</span>
                      <span className="block text-xs text-stone-500">{o.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {kind === 'memorize' && <TargetLapsField value={targetLaps} onChange={setTargetLaps} />}
            <Field label={`${childLabel}（1行に1つ。あとから追加もできます）`} hint={lines.length ? `${lines.length}件` : undefined}>
              <textarea
                className={`${inputClass} min-h-40`}
                value={linesText}
                onChange={(e) => setLinesText(e.target.value)}
                placeholder={hasUnits(kind) ? '第1章 式と証明\n第2章 複素数と方程式\n第3章 図形と方程式' : 'No.1-100\nNo.101-200\nNo.201-300'}
              />
            </Field>
          </>
        )}

        {material?.kind === 'memorize' && <TargetLapsField value={targetLaps} onChange={setTargetLaps} />}

        {material && (
          <div className="rounded-2xl bg-white p-3.5 ring-1 ring-stone-200/80">
            {material.archived ? (
              <Button variant="secondary" className="w-full" onClick={() => handleArchive(false)}>
                アーカイブを解除
              </Button>
            ) : (
              <>
                <Button variant="secondary" className="w-full" onClick={() => handleArchive(true)}>
                  アーカイブする
                </Button>
                <p className="mt-2 text-xs text-stone-500">
                  解き終えた教材を「アーカイブ」へしまいます。タスクはホームに出なくなります（データは残り、アーカイブの「本棚に戻す」でいつでも戻せます）。
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </Sheet>
  )
}

const LAP_CHOICES = [1, 2, 3, 4, 5]

/** 暗記系の目標の周回数（v0.6〜）。よく使う数はボタンで、それ以外は入力 */
function TargetLapsField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const n = Number(value)
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-stone-700">目標の周回数</p>
      <div className="flex flex-wrap items-center gap-2">
        <ChoiceChips value={LAP_CHOICES.includes(n) ? n : null} onChange={(v) => onChange(String(v))} options={LAP_CHOICES.map((v) => ({ value: v, label: `${v}周` }))} />
        <span className="flex items-center gap-1.5">
          <input
            className={`${inputBaseClass} num w-16 text-right`}
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="目標の周回数"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
          />
          <span className="text-sm text-stone-600">周</span>
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
        範囲ごとに、この回数まわしたら完了（1〜20周）。いつやるかは、ホームのカレンダーで日付を選んで決めます。
      </p>
    </div>
  )
}
