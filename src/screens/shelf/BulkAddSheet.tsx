import { useState } from 'react'
import { addChildrenToMaterial } from '../../data/commands.ts'
import { useData } from '../../data/store.tsx'
import { parseLines } from '../../domain/text.ts'
import { hasUnits, type Material } from '../../domain/types.ts'
import { Sheet } from '../../components/Sheet.tsx'
import { useToast } from '../../components/Toast.tsx'
import { Button, Field, inputClass } from '../../components/ui.tsx'

/** 単元・範囲を改行区切りでまとめて追加する */
export function BulkAddSheet({ material, startOrder, onClose }: { material: Material; startOrder: number; onClose: () => void }) {
  const { uid } = useData()
  const toast = useToast()
  const [text, setText] = useState('')
  const lines = parseLines(text)
  const childLabel = hasUnits(material.kind) ? '単元' : '範囲'

  function handleAdd() {
    addChildrenToMaterial(uid, material.id, material.kind, lines, startOrder)
    toast(`${childLabel}を${lines.length}件追加しました`)
    onClose()
  }

  return (
    <Sheet
      title={`${childLabel}をまとめて追加`}
      onClose={onClose}
      footer={
        <Button className="w-full" disabled={lines.length === 0} onClick={handleAdd}>
          {lines.length ? `${lines.length}件を追加` : '追加'}
        </Button>
      }
    >
      <Field label={`${childLabel}（1行に1つ）`} hint="目次などをそのまま貼り付けられます。空行は無視します。">
        <textarea
          className={`${inputClass} min-h-56`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          placeholder={hasUnits(material.kind) ? '第4章 三角関数\n第5章 指数関数と対数関数' : 'No.301-400\nNo.401-500'}
        />
      </Field>
    </Sheet>
  )
}
