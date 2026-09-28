# 学習ワークフロー管理PWA（個人用）

問題集の「周回」と単語帳などの「暗記」を、定期考査・模試・資格・共通テスト、さらに大会・旅行・趣味などの「予定」に向けて
同じ手順で回すための個人用ToDo。利用者は1人。スマホ（ホーム画面のPWA）とPCの両方で使う。**UIの文言はすべて日本語。**

## 見た目（v0.2〜）
- テーマカラーは黒。落ち着いたモノトーン（`stone` 系の灰色）。色を使うのは「遅れ」（赤）と「残りの印」（琥珀）だけ。
- テーマカラーと背景は `src/index.css` の `@theme`（`--color-ink` / `--color-paper`）で定義し、`bg-ink` `text-ink` などで使う。
  PWA の色は `vite.config.ts`・`index.html`・`public/icon.svg`（`npm run icons` で再生成）に同じ値を書いている。
- 画面：今日・リスト・本棚・予定・設定（タブ）＋ 使い方（`GuideScreen`、今日の「?」と設定から開く。勉強の流れの図つき）。
- リスト（v0.3〜、`ListsScreen`）：Trello のボードのように、未完了タスクを種類別のリストで横に並べる（`tasksByType`）。
  系統（周回系・暗記系・提出物）は `TASK_GROUP` で決め、上のボタンの区切りと各リストの見出しに出す。
  カードのタップは今日と同じ `CompleteSheet`、リスト下の追加は今日と同じ追加シートを使う（新しい保存処理は持たない）。

## 最重要の設計原則
- **入力はToDoの「完了」操作1か所に集約する。** 完了すると単元・範囲の記録が更新され、次のタスクが自動で作られる。
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
- `src/screens/` … 今日・リスト・本棚・予定・設定・使い方・ログインの各画面。`src/components/` … 共通部品。
- 「予定」は v0.1 の「試験」を広げたもの。**保存先・型・関数名は互換のため exam のまま**（`exams` コレクション、`Exam`、`examIds`、
  `ExamsScreen`、タブのキー `exams`）。画面の文言だけ「予定」。タスク種別 `exam` の表示名は「仕上げ」。

## 実装上の約束
- **日付は日本時間（Asia/Tokyo）。** 期限などの日付は `YYYY-MM-DD` 文字列で保存・計算する（`src/domain/date.ts`）。`Date` の現地時刻は使わない。
- **オフラインで動くこと。** トランザクションはオフラインで失敗するので使わず `writeBatch` を使う。
  `batch.commit()` はサーバーに届くまで resolve しないので、**UIで await しない**（ローカルキャッシュには即反映される）。
- 購読するのは 教材・単元・範囲・予定・設定 と **未完了のタスクだけ**。完了済みタスクは JSON 書き出し時だけ読む。
- Firestore の Timestamp（`createdAt`, `completedAt`）は domain 側ではミリ秒の数値で扱い、data 層で変換する。
- Firebase の接続設定は `.env`（`VITE_FIREBASE_*`）から読む。コミットするのは `.env.example` だけ。
- セキュリティルール：`users/{uid}` 以下は本人だけ読み書きでき、それ以外はすべて拒否（`firestore.rules`）。

## データモデル（すべて `users/{uid}/` の下）
- `materials/{id}` 教材：`name, subject, kind('cycle'|'memorize'), archived, createdAt`
- `materials/{id}/units/{id}` 周回系の単元：`name, order, lapCount, remainingMarks|null, graduated, lastDoneAt|null`
- `materials/{id}/ranges/{id}` 暗記系の範囲：`label, order, started, step, nextReviewAt|null, lastResult{known,half,unknown}|null`
- `exams/{id}` 予定（試験・大会・旅行・趣味など）：`name, category, date, unitRefs{materialId,unitId}[]`,
  `rangeRefs{materialId,rangeId}[]`（v0.2〜、暗記の範囲）, `leadDays|null`（v0.2〜、何日前までに仕上げるか。null なら設定の値）
  - v0.1 のデータには後の2つがないので、読み込み時に `[]` / `null` で補う（`src/data/converters.ts`）。
- `tasks/{id}` タスク：`type('first'|'cycle'|'exam'|'redo'|'memorize'|'assignment'), title, materialId, unitId, rangeId, examIds[], dueDate, status('open'|'done'), completedAt, createdAt, result`
  - 仕様に対する追加：`createdAt`（同順位の並びを安定させる）、`result`（完了時の入力値。周回の履歴として JSON に残る）
- `settings/main` 設定：`cycleIntervalDays(7), examLeadDays(3), memorizeIntervals([1,3,7,14,30])`

## タスク生成ルール（詳細は src/domain のコメントとテスト）
- **1単元につき未完了タスクは常に1つ**（どの作り方でも）。すでにあるときは新規に作らず既存タスクにまとめ、期限は早い方にする。
  - 学校課題を単元に紐づけたとき既存タスクがあれば、そのタスクを課題に切り替える（タイトル反映、examIds は保持）。
- 周回系の完了（first/cycle/exam/redo/単元つきassignment）：残りの印の数を入力 → `lapCount+1`、0なら卒業、
  1以上なら `今日+cycleIntervalDays` の cycle タスク（他に未完了タスクがなければ）。
- 予定の登録・編集：範囲内の単元ごとに、卒業済みは何もしない／未着手は first／周回中は exam（仕上げ）。
  期限は `予定の日 - (leadDays ?? examLeadDays)`。
  - その期限が今日より前なら今日にする。**予定の日がすでに過ぎていればタスクを作らない。**
  - 範囲の暗記の範囲：未完了の memorize があれば examIds に足すだけ（復習日は変えない）。なければ開始して今日期限の memorize。
  - 範囲から外した・予定を削除した → 未完了タスクの examIds から外すだけ（タスクは消さない、期限も変えない）。
  - 単元・範囲を削除したら、予定の unitRefs / rangeRefs からも外す。
- 暗記：開始で今日期限の memorize。完了で 知/半知/未知 を入力し、`半知+未知==0` なら step+1。
  `nextReviewAt = 今日 + memorizeIntervals[min(step, 最後)]`。判定は `src/domain/memorize.ts` の1か所。
- 今日の一覧：期限が今日以前の未完了。順番は assignment(締切順) → first → exam(予定の日順) → memorize → cycle → redo。
  期限が今日より前なら「遅れ」。アーカイブした教材のタスクは出さない。
  その下に「これからの7日間」（`upcomingTasks`）を折りたたみで出す。タップすれば前倒しで完了できる。

## MVPの範囲外（実装しない）
共通テストからの逆算・週ノルマ・週次照合・予備日 / 周回タスクを混ぜて解く支援 / グラフ・統計 / 通知 /
勉強時間・タイマー / SNS・共有 / 問題ごとの印の管理 / JSONの読み込み（復元） / バーコード登録 / 完了の取り消し

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
