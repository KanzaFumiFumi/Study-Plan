# 学習ワークフロー管理PWA（個人用）

問題集の「周回」と単語帳などの「暗記」を、定期考査・模試・資格・共通テスト、さらに大会・旅行・趣味などの「予定」に向けて
同じ手順で回すための個人用ToDo。利用者は1人。スマホ（ホーム画面のPWA）とPCの両方で使う。**UIの文言はすべて日本語。**

## 見た目（v0.2〜）
- テーマカラーは黒。落ち着いたモノトーン（`stone` 系の灰色）。色を使うのは「遅れ」（赤）と「残りの印」（琥珀）だけ。
- テーマカラーと背景は `src/index.css` の `@theme`（`--color-ink` / `--color-paper`）で定義し、`bg-ink` `text-ink` などで使う。
  PWA の色は `vite.config.ts`・`index.html`・`public/icon.svg`（`npm run icons` で再生成）に同じ値を書いている。
- 部品と動き（v0.6〜）：見出し・カード・ボタンは `components/ui.tsx`（`ScreenTitle`・`SectionHeader`・`Button`・`IconButton` など）にそろえる。
  カードは白に細い線（`ring-stone-200/80`）、角は `rounded-2xl`〜`rounded-3xl`。動きは `index.css` の `--animate-*`（rise・sheet-up・fade-in・pop）を
  必ず `motion-safe:` つきで使う。数字は `num` クラス（桁そろえ）。線の矢印・＋は `Chevron`・`PlusIcon`（文字の矢印は端末で色がつく）。
- 画面：ホーム・リスト・本棚・アーカイブ・設定（タブ）＋ 使い方（`GuideScreen`、ホームの「?」と設定から開く。勉強の流れの図つき）。
  v0.6 で「今日」と「予定」を「ホーム」にまとめた（古い `#today`・`#exams` は `Shell` でホームに読み替える）。
- **スマホ版・PC版（v0.5〜）**：ホームの画面の上の `LayoutSwitch` で切り替える（`hooks/useLayout.ts`、端末ごとに localStorage）。
  中身・データ・機能は同じで、**並べ方だけ**を変える（片方にしかない機能を作らない）。
  - スマホ版：下のタブ（`TabBar`）・1列。PC版：左のメニュー（`SideNav`）・2列。入力のシートは PC版では画面の中央。
  - `<html data-layout="pc">` をつけているので、小さな違いは CSS の `pc:` で書く（`index.css` の `@custom-variant`）。
    並びが大きく変わる画面（ホーム・リスト・アーカイブ）は `useIsPc()` で組み立てを分ける。
- 周回系・復習系の単元のタスク（first / cycle / exam）は、画面では「何周目か」（一周目・二周目…）で表示する（`labels.ts` の `taskLabel`）。
  完了済みは完了したときの周（`lap`）で表示する。
- ホーム（v0.6〜、`HomeScreen`、部品は `screens/home/`）：上から 日付と進み具合の輪／次の予定（タップで `EventsSheet`）／
  カレンダー（`WeekCalendar`：ふだんは週の帯、「月」で月表示。PC版は最初から月）／今日提出の課題／今日のチェックリスト。
  日付をタップすると `DaySheet`（その日の予定・タスク・暗記。予定の追加、暗記の割り当てと取り消し）。追加は右下の「＋」（`AddMenu`）1つ。
  - チェックリスト：四角を押すと完了（残りの印の数が要る単元は `CompleteSheet`、暗記と単元のない課題は即完了）。
    今日完了したものはチェック済みで残し、四角でチェックを外せる・「アーカイブへ」で消せる（`TaskCheck.tsx` の `useTaskActions`）。
  - 今日提出の課題：締切が今日の課題を、未完了・完了済み・アーカイブ済みすべて（`assignmentsDueOn`）。
- リスト（v0.3〜、`ListsScreen`）：上の欄（縦スクロール）でリストを選び、下にカードを出す（`lists.ts` の `tasksByList`）。
  リストは 提出物（課題）／周回系・復習系（一周目・二周目・三周目・四周目以降・解き直し）／暗記系（暗記）。
  カードの四角で完了、タップはホームと同じ `CompleteSheet`、「今日やる」でホームのチェックリストに入れる。
  完了済みはホームと同じく、チェック済みで残る（`doneTasksByList`）。
- 本棚（v0.4〜）：周回系・復習系・暗記系。「並べ替え」で ↑↓、「教科別にまとめる」（端末ごとの好みとして localStorage）。
  暗記の範囲は周回を点で表示（`LapDots`）、タップで名前とやる日の追加・取り消し（`ItemEditSheet`）。アーカイブした教材はアーカイブの画面で見る。
- アーカイブ（v0.5〜、`ArchiveScreen`）：リストごとの完了済みタスク（`archivedTasksByList`）と、解き終えた教材（＝本棚でアーカイブした教材）。
  v0.6〜：タスクの「未完了に戻す」（`uncompleteTask`、すべての完了済みと照らし合わせる）、教材の「本棚に戻す」。

## 最重要の設計原則
- **入力はToDoの「完了」操作1か所に集約する。** 完了すると単元・範囲の記録が更新され、周回系・復習系は次のタスクが自動で作られる
  （暗記系は v0.6〜、いつやるかをカレンダーで決める）。
- 問題ごとの印（○△×）は紙に書く。アプリは「問題集×単元」の単位でだけ記録する。
- 勉強時間ではなく「単元が何周目で、印がいくつ残っているか」を管理する。

## 技術構成
TypeScript + React + Vite / Tailwind CSS v4（`@tailwindcss/vite`、設定ファイルなし） / Firebase Auth（Googleのみ） /
Cloud Firestore（永続キャッシュ） / Firebase Hosting / vite-plugin-pwa / Vitest。
Sparkプランの範囲で動かす（Cloud Functions など有料機能は使わない）。

## コマンド
| コマンド | 内容 |
|---|---|
| `npm run dev:emu` | Firebase Emulator に接続して開発（`npm run emulators` を別に起動しておく） |
| `npm run emulators` | Auth / Firestore のエミュレータを起動（プロジェクトID `demo-study-plan`） |
| `npm run dev` | `.env` の本番Firebaseに接続して開発 |
| `npm test` | タスク生成ロジックの単体テスト（`src/domain/**/*.test.ts`） |
| `npm run test:rules` | セキュリティルールのテスト（エミュレータを自動起動） |
| `npm run build` | 型チェック＋本番ビルド |
| `npm run icons` | `public/icon.svg` から PWA アイコンを生成 |
| `npm run deploy` | ビルドして Hosting と Firestore ルールをデプロイ（初回の準備は README） |

Windows で Node / Java を winget で入れた直後は、シェルの PATH を読み直すこと。
エミュレータは `scripts/firebase-emu.mjs` 経由で起動する（ユーザー名に空白があると Java が一時ソケットを作れないため、
`-Djdk.net.unixdomain.tmpdir` を `.emulator-tmp/` に向けている）。
エミュレータ接続中はログイン画面に「テスト用アカウント alice / bob」ボタンが出る（`signInWithCredential` に署名なしトークン）。
開発中にオフラインを試すときは、ブラウザのコンソールで `__studyPlanDebug.goOffline()` / `goOnline()`。

## ディレクトリ
- `src/domain/` … **Firestoreに依存しない純粋関数**（タスク生成ロジック）とテスト。UI・保存処理を入れない。
  - 関数は「今の状態＋入力＋今日の日付」を受け取り、`ChangeSet`（作る/更新する/消すタスク、単元・範囲・予定の更新）を返す。
- `src/data/` … Firestore の読み書き。`onSnapshot` で全データをメモリに保持し、`ChangeSet` を `writeBatch` で保存する。
- `src/screens/` … ホーム・リスト・本棚・アーカイブ・設定・使い方・ログインの各画面。`src/components/` … 共通部品。
- 「予定」は v0.1 の「試験」を広げたもの。**保存先・型・関数名は互換のため exam のまま**（`exams` コレクション、`Exam`、`examIds`、
  入力のシートは `screens/exams/ExamFormSheet.tsx`）。画面の文言だけ「予定」。タスク種別 `exam` の表示名は「仕上げ」。
  v0.6 で「予定」のタブはホームにまとめた（一覧は `screens/home/EventsSheet.tsx`）。

## 実装上の約束
- **日付は日本時間（Asia/Tokyo）。** 期限などの日付は `YYYY-MM-DD` 文字列で保存・計算する（`src/domain/date.ts`）。`Date` の現地時刻は使わない。
- **オフラインで動くこと。** トランザクションはオフラインで失敗するので使わず `writeBatch` を使う。
  `batch.commit()` はサーバーに届くまで resolve しないので、**UIで await しない**（ローカルキャッシュには即反映される）。
- 購読するのは 教材・単元・範囲・予定・設定 と **未完了のタスク**、それに **今日（日本時間）完了したタスク**（v0.4〜、チェックリスト用。
  `completedAt >= 今日0時` だけで絞るので複合インデックスは不要）。
  それより前の完了済みは、アーカイブの画面を開いているあいだ（`status == done`）と JSON 書き出しのときだけ読む。
  今日提出の課題は、ホームを開いているあいだ `dueDate == 今日` で読む（`data/queries.ts`。どちらも1フィールドなので複合インデックスは不要）。
- Firestore の Timestamp（`createdAt`, `completedAt`）は domain 側ではミリ秒の数値で扱い、data 層で変換する。
- Firebase の接続設定は `.env`（`VITE_FIREBASE_*`）から読む。コミットするのは `.env.example` だけ。
- セキュリティルール：`users/{uid}` 以下は本人だけ読み書きでき、それ以外はすべて拒否（`firestore.rules`）。

## データモデル（すべて `users/{uid}/` の下）
- `materials/{id}` 教材：`name, subject, kind('cycle'|'review'|'memorize'), archived, order, targetLaps, createdAt`
  - `review`（復習系、v0.4〜）は周回系と同じ仕組み（単元・残りの印）。単元を持つかは `hasUnits(kind)` で判定する。
  - `targetLaps`（v0.6〜）は暗記系の目標の周回数（1〜20、ないときは3）。周回系・復習系では使わない。
  - `order`（v0.4〜）は本棚の並び順。ないとき（v0.3 まで）は createdAt を使う。並べ替えると 0, 1, 2… を保存し、新しい教材は作った時刻。
- `materials/{id}/units/{id}` 周回系・復習系の単元：`name, order, lapCount, remainingMarks|null, graduated, lastDoneAt|null`
- `materials/{id}/ranges/{id}` 暗記系の範囲：`label, order, lapCount, lastDoneAt|null`（v0.6〜）
  - v0.5 までの `started, step, nextReviewAt, lastResult` はデータに残るが読まない（`lapCount` がない範囲は0周から）。
- `exams/{id}` 予定（試験・大会・旅行・趣味など）：`name, category, date, unitRefs{materialId,unitId}[]`,
  `rangeRefs{materialId,rangeId}[]`（v0.2〜、暗記の範囲）, `leadDays|null`（v0.2〜、何日前までに仕上げるか。null なら設定の値）
  - v0.1 のデータには後の2つがないので、読み込み時に `[]` / `null` で補う（`src/data/converters.ts`）。
- `tasks/{id}` タスク：`type('first'|'cycle'|'exam'|'redo'|'memorize'|'assignment'), title, materialId, unitId, rangeId, examIds[], dueDate, status('open'|'done'), completedAt, createdAt, result`
  - 仕様に対する追加：`createdAt`（同順位の並びを安定させる）、`result`（完了時の入力値。周回の履歴として JSON に残る）、
    `plannedFor|null`（v0.4〜、「今日やる」と選んだ日。期限は変えず、その日だけ今日のチェックリストに出す）
  - v0.5〜：`lap|null`（完了したのが何周目か）、`before|null`（完了する前の単元・範囲の記録。チェックを外すときに戻す）、
    `createdBy|null`（そのタスクを自動で作った完了のタスクID）、`archived`（アーカイブへ送った）。
    v0.4 までのタスクにはないので、読み込み時に null / false で補う。lap のない古い完了は、同じ単元の完了した順に数えて補う（`withLaps`）。
- `settings/main` 設定：`cycleIntervalDays(7), examLeadDays(3)`（v0.6 で `memorizeIntervals` をなくした。古い値は読まない）

## タスク生成ルール（詳細は src/domain のコメントとテスト）
- **1単元につき未完了タスクは常に1つ**（どの作り方でも。暗記の範囲は v0.6〜、目標の周回数まで別の日に入れられる）。すでにあるときは新規に作らず既存タスクにまとめ、期限は早い方にする。
  - 学校課題を単元に紐づけたとき既存タスクがあれば、そのタスクを課題に切り替える（タイトル反映、examIds は保持）。
- 周回系の完了（first/cycle/exam/redo/単元つきassignment）：残りの印の数を入力 → `lapCount+1`、0なら卒業、
  1以上なら `今日+cycleIntervalDays` の cycle タスク（他に未完了タスクがなければ）。
- 予定の登録・編集：範囲内の単元ごとに、卒業済みは何もしない／未着手は first／周回中は exam（仕上げ）。
  期限は `予定の日 - (leadDays ?? examLeadDays)`。
  - その期限が今日より前なら今日にする。**予定の日がすでに過ぎていればタスクを作らない。**
  - 範囲の暗記の範囲：カレンダーに入れた memorize があれば、そのすべての examIds に足すだけ（日付は変えない）。
    なければ単元と同じ期限の memorize を1つ作る（目標の周回数を終えた範囲は何もしない）。
  - 範囲から外した・予定を削除した → 未完了タスクの examIds から外すだけ（タスクは消さない、期限も変えない）。
  - 単元・範囲を削除したら、予定の unitRefs / rangeRefs からも外す。
- 暗記（v0.6〜、`src/domain/memorize.ts`）：間隔を広げる復習はなくした。教材ごとの目標の周回数と、カレンダーで決めた日で回す。
  - 割り当て（`scheduleRanges`）：選んだ日に、範囲ごとにその日期限の memorize を作る。その日にすでにある範囲と、
    残りの周回数（目標 − lapCount）まで予定が入っている範囲には作らない。外す（`unscheduleTask`）はその日のタスクを消すだけ。
  - 完了（`completeMemorizeTask`）：入力なし。範囲の `lapCount+1`・`lastDoneAt=今日`、タスクに `lap` と `before`。次のタスクは作らない。
- チェックを外す（v0.5〜）／アーカイブから未完了に戻す（v0.6〜）（`archive.ts` の `uncompleteTask`）：タスクを未完了に戻し、単元・範囲を `before` に戻し、
  `createdBy` がそのタスクの未完了タスク（完了で自動に作った次の周回・復習）を消す（そこについた予定は引き継ぐ）。
  同じ単元・範囲をそのあとにも完了した／あとから別のタスクを足した（課題に切り替えた）／単元の `before` がない ときは戻せない。
  v0.5 までの暗記の完了（`before.range` に lapCount がない）は、範囲は変えずにタスクだけ戻す。
- 完了済みの置き場所（v0.5〜）：完了した日（日本時間）のうちは、リストと今日のチェックリストにチェック済みで残る（`isDoneInList`）。
  次の日になるか「アーカイブへ」（`archived = true`）で、アーカイブに入る（`isInArchive`）。
- 今日の一覧：期限が今日以前の未完了 ＋ `plannedFor` が今日のもの。順番は assignment(締切順) → first → exam(予定の日順) → memorize → cycle → redo。
  期限が今日より前なら「遅れ」。アーカイブした教材のタスクは出さない。
  先の日のタスクは、ホームのカレンダーで日付をタップして見る（`tasksDueOn`）。タップすれば前倒しで完了できる。

## MVPの範囲外（実装しない）
共通テストからの逆算・週ノルマ・週次照合・予備日 / 周回タスクを混ぜて解く支援 / グラフ・統計 / 通知 /
勉強時間・タイマー / SNS・共有 / 問題ごとの印の管理 / JSONの読み込み（復元） / バーコード登録
（完了の取り消しは v0.5 で「チェックを外す」として追加。完了した日のうちだけ）

## 進め方
段階ごとに動く状態で日本語のメッセージでコミットする。ライブラリの書き方は実装前に公式ドキュメントで確認する。

## バージョン管理
- リモートは GitHub（`origin` = https://github.com/KanzaFumiFumi/Study-Plan.git）、ブランチは `main`。
- コミットのメールは GitHub の noreply アドレス（`232763851+KanzaFumiFumi@users.noreply.github.com`）を使う。
  個人のメールだと GitHub のメール保護（GH007）で push が拒否される。このリポジトリには `git config user.email` で設定済み。
- バージョンは `package.json` の `version`・Git の注釈付きタグ `vX.Y.Z`・`CHANGELOG.md` の3つをそろえる。
  機能の追加・変更は 2つめ（0.1.0 → 0.2.0）、不具合の修正だけなら 3つめ（→ 0.1.1）を上げる。
- リリースの手順：`CHANGELOG.md` に追記 → `package.json` の `version` を上げる → コミット →
  `git tag -a vX.Y.Z -m "…"` → `git push origin main --follow-tags`。
- バージョンはビルド時に `__APP_VERSION__` として埋め込まれ、設定画面の一番下に表示される。
