import type { ReactNode } from 'react'
import { useData } from '../data/store.tsx'
import { BackButton, ScreenTitle } from '../components/ui.tsx'

// 図の色（テーマに合わせた黒と灰色）
const INK = '#1c1b19'
const MUTED = '#78716c'
const LINE = '#d6d3d1'
const SOFT = '#e7e5e4'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 border-l-2 border-ink pl-2.5 text-base font-bold tracking-wider">{title}</h2>
      {children}
    </section>
  )
}

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="rounded-2xl bg-white p-4 ring-1 ring-stone-200" role="img" aria-label={label}>
      {children}
    </figure>
  )
}

function Step({ n, x, y, title, sub }: { n: number; x: number; y: number; title: string; sub: string }) {
  return (
    <g>
      <rect x={x} y={y} width={288} height={50} rx={12} fill="#fff" stroke={INK} strokeWidth={1.25} />
      <circle cx={x + 20} cy={y + 25} r={11} fill={INK} />
      <text x={x + 20} y={y + 29.5} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff">
        {n}
      </text>
      <text x={x + 40} y={y + 21} fontSize={13.5} fontWeight={700} fill={INK}>
        {title}
      </text>
      <text x={x + 40} y={y + 39} fontSize={11} fill={MUTED}>
        {sub}
      </text>
    </g>
  )
}

/** 図1：問題集の周回（一周目 → 完了 → 二周目… をくり返し、印が0で卒業） */
function CycleFigure({ interval }: { interval: number }) {
  return (
    <svg viewBox="0 0 320 240" className="w-full" aria-hidden>
      <defs>
        <marker id="guide-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={INK} />
        </marker>
      </defs>
      <Step n={1} x={28} y={4} title="授業・課題で解く（一周目）" sub="紙の問題集に ○△× の印をつける" />
      <line x1={172} y1={54} x2={172} y2={76} stroke={INK} strokeWidth={1.5} markerEnd="url(#guide-arrow)" />
      <Step n={2} x={28} y={80} title="タスクを完了する" sub="残った印の数を入れる（例：4）" />

      <line x1={106} y1={130} x2={106} y2={168} stroke={INK} strokeWidth={1.5} markerEnd="url(#guide-arrow)" />
      <text x={112} y={154} fontSize={11} fill={MUTED}>
        1以上
      </text>
      <line x1={258} y1={130} x2={258} y2={168} stroke={INK} strokeWidth={1.5} markerEnd="url(#guide-arrow)" />
      <text x={264} y={154} fontSize={11} fill={MUTED}>
        0
      </text>

      <rect x={28} y={172} width={156} height={62} rx={12} fill="#fff" stroke={INK} strokeWidth={1.25} />
      <circle cx={48} cy={203} r={11} fill={INK} />
      <text x={48} y={207.5} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff">
        3
      </text>
      <text x={66} y={198} fontSize={13.5} fontWeight={700} fill={INK}>
        {interval}日後に周回
      </text>
      <text x={66} y={216} fontSize={11} fill={MUTED}>
        印の問題だけ解く
      </text>

      <rect x={200} y={172} width={116} height={62} rx={12} fill={INK} />
      <text x={258} y={200} textAnchor="middle" fontSize={15} fontWeight={700} fill="#fff">
        卒業
      </text>
      <text x={258} y={219} textAnchor="middle" fontSize={11} fill="#a8a29e">
        もう出てこない
      </text>

      {/* ③ から ② に戻る矢印 */}
      <path d="M28 203 H12 V105 H24" fill="none" stroke={INK} strokeWidth={1.5} markerEnd="url(#guide-arrow)" />
      <text x={18} y={156} fontSize={11} fill={MUTED}>
        くり返す
      </text>
    </svg>
  )
}

/** 図2：予定から逆算して仕上げる */
function EventFigure({ leadDays }: { leadDays: number }) {
  return (
    <svg viewBox="0 0 320 104" className="w-full" aria-hidden>
      <text x={117} y={34} textAnchor="middle" fontSize={11} fill={MUTED}>
        範囲の単元を解いて仕上げる
      </text>
      <line x1={16} y1={58} x2={304} y2={58} stroke={LINE} strokeWidth={2} />
      <rect x={24} y={52} width={186} height={12} rx={6} fill={SOFT} />
      <circle cx={24} cy={58} r={6} fill="#fff" stroke={INK} strokeWidth={2} />
      <circle cx={210} cy={58} r={6} fill={INK} />
      <line x1={296} y1={34} x2={296} y2={64} stroke={INK} strokeWidth={2} />
      <path d="M296 34 H312 L307 40 L312 46 H296 Z" fill={INK} />

      <text x={16} y={86} fontSize={11.5} fontWeight={700} fill={INK}>
        今日
      </text>
      <text x={210} y={86} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={INK}>
        {leadDays === 0 ? '当日が期限' : `${leadDays}日前が期限`}
      </text>
      <text x={306} y={86} textAnchor="end" fontSize={11.5} fontWeight={700} fill={INK}>
        予定の日
      </text>
    </svg>
  )
}

/** 図3：暗記は、目標の周回数ぶん、カレンダーでやる日を決める（v0.6〜） */
function MemorizeFigure() {
  const xs = [40, 120, 200]
  const labels = ['一周目', '二周目', '三周目']
  return (
    <svg viewBox="0 0 320 112" className="w-full" aria-hidden>
      <line x1={16} y1={52} x2={250} y2={52} stroke={LINE} strokeWidth={2} />
      {xs.map((x, i) => (
        <g key={x}>
          <rect x={x - 26} y={18} width={52} height={20} rx={6} fill={SOFT} />
          <text x={x} y={32} textAnchor="middle" fontSize={10.5} fill={MUTED}>
            カレンダー
          </text>
          <circle cx={x} cy={52} r={7} fill={INK} />
          <text x={x} y={78} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={INK}>
            {labels[i]}
          </text>
          <text x={x} y={95} textAnchor="middle" fontSize={10.5} fill={MUTED}>
            チェックだけ
          </text>
        </g>
      ))}
      <rect x={252} y={36} width={62} height={32} rx={10} fill={INK} />
      <text x={283} y={57} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">
        完了
      </text>
    </svg>
  )
}

const TIPS: [string, string][] = [
  ['授業で新しい範囲に進んだ', 'ホームの右下の ＋ →「授業の一周目」'],
  ['学校の課題が出た', '＋ →「学校課題」（単元に紐づけると周回の記録になる）'],
  ['卒業した単元をもう一度やりたい', '＋ →「解き直し」'],
  ['試験・大会・旅行・趣味の日が決まった', '＋ →「予定」で登録して範囲を選ぶ（カレンダーの日付からも追加できる）'],
  ['単語帳をいつやるか決めたい', 'ホームのカレンダーで日付をタップし、暗記の範囲を割り当てる'],
  ['間違えて完了した・アーカイブへ送った', 'チェックを外す／アーカイブの「未完了に戻す」'],
  ['解き終えた教材をしまいたい・戻したい', '本棚の「編集」→「アーカイブする」／アーカイブの「本棚に戻す」'],
]

/** 使い方（説明ページ） */
export function GuideScreen({ onBack }: { onBack: () => void }) {
  const { settings } = useData()
  return (
    <div className="pc:max-w-3xl">
      <BackButton onClick={onBack}>戻る</BackButton>
      <ScreenTitle>使い方</ScreenTitle>
      <p className="text-sm leading-relaxed text-stone-600">
        問題集は「単元が何周目で、印がいくつ残っているか」だけを記録します。入力はタスクを完了するときの数字1つだけ。次にやることは、アプリが自動でホームのチェックリストに並べます。
      </p>

      <Section title="毎日の使い方">
        <ol className="space-y-2">
          {[
            ['ホームを開く', 'チェックリストに、やることが優先順に並んでいます'],
            ['紙の問題集で解く', '間違えた問題に ○△× の印をつける'],
            ['四角を押して完了', '問題集は残った印の数を選ぶだけ。暗記はチェックだけ'],
          ].map(([title, sub], i) => (
            <li key={title} className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-stone-200">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
                {i + 1}
              </span>
              <span>
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-xs text-stone-500">{sub}</span>
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="問題集は、印がなくなるまで回す">
        <Figure label="問題集の周回の流れ">
          <CycleFigure interval={settings.cycleIntervalDays} />
        </Figure>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          印が残っていれば {settings.cycleIntervalDays}日後にまたホームのチェックリストに出てきます。0 になった単元は卒業です。
        </p>
      </Section>

      <Section title="予定に向けて仕上げる">
        <Figure label="予定から逆算してタスクを作る流れ">
          <EventFigure leadDays={settings.examLeadDays} />
        </Figure>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          試験・大会・旅行・趣味など、目標の日をホームの「＋」→「予定」で登録して範囲を選ぶと、まだ卒業していない単元にタスクができます（何周目かで表示）。何日前までに仕上げるかは予定ごとに選べます。範囲が重なる予定があっても、同じ単元のタスクは1つにまとまります。
        </p>
      </Section>

      <Section title="暗記は、決めた回数をカレンダーで">
        <Figure label="暗記の進め方">
          <MemorizeFigure />
        </Figure>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          単語帳などの暗記系は、教材ごとに「目標の周回数」を決めます。ホームのカレンダーで日付をタップして範囲を割り当てると、その日のチェックリストに出ます。1つの範囲に、目標の周回数まで先の日を入れておけます。終わったら四角を押すだけで、その範囲の周回数が1つ増え、目標に届けば完了です。
        </p>
      </Section>

      <Section title="こんなときは">
        <dl className="divide-y divide-stone-200 overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
          {TIPS.map(([when, what]) => (
            <div key={when} className="px-4 py-3">
              <dt className="text-sm font-semibold">{when}</dt>
              <dd className="mt-0.5 text-xs text-stone-500">{what}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  )
}
