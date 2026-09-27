# 学習ワークフロー（個人用 PWA）

問題集の「周回」と単語帳などの「暗記」を、定期考査・模試・資格・共通テストのどれでも同じ手順で回すための ToDo アプリです。
タスクを「完了」するときに数字を1つ入れるだけで、単元の記録が更新され、次のタスクが自動で作られます。

- スマホ（ホーム画面に追加）と PC の両方で使え、データは Firebase で同期されます
- 電波がなくても完了操作ができ、つながったときに同期されます
- 自分の Google アカウントでログインし、データは本人しか読み書きできません

仕様とルールの要点は [CLAUDE.md](CLAUDE.md) にまとめています。

---

## はじめて公開するまでの手順

上から順に行ってください。Firebase の無料プラン（Spark）の範囲で動きます。料金プランの変更やクレジットカードの登録は不要です。

### 0. 必要なもの

- Google アカウント
- Node.js 22.12 以降（公式サイトの LTS 版で OK）
- このリポジトリを置いたフォルダで、一度だけ `npm install` を実行しておく

```bash
npm install
```

> **Windows の PowerShell で「このシステムではスクリプトの実行が無効になっているため…」と出たとき**
> `npx` を `npx.cmd`、`npm` を `npm.cmd` に置き換えて実行してください（例：`npx.cmd firebase login`、`npm.cmd run deploy`）。
> PowerShell の実行ポリシー（セキュリティ設定）を変える必要はありません。

### 1. Firebase プロジェクトを作る

1. [Firebase コンソール](https://console.firebase.google.com/) を開き、Google アカウントでログインする
2. 「プロジェクトを作成」（または「プロジェクトを追加」）を押す
3. プロジェクト名を入れる（例：`study-plan`）。下に表示される **プロジェクト ID**（例：`study-plan-1a2b3`）を控えておく
4. Google アナリティクスは使わないので、オフにして作成する

### 2. ウェブアプリを登録して、設定値を控える

1. プロジェクトのトップ（「プロジェクトの概要」）で、ウェブのアイコン `</>` を押す
2. アプリのニックネームを入れる（例：`study-plan-web`）。「Firebase Hosting も設定する」のチェックは**不要**（あとでコマンドで行う）
3. 「アプリを登録」を押すと `firebaseConfig` が表示されるので、`apiKey` などの値を控える
   （あとから「プロジェクトの設定」→「全般」→「マイアプリ」でも確認できます）

### 3. Google ログインを有効にする

1. 左のメニューから **Authentication**（「Security」の中）を開き、「始める」を押す
2. 「Sign-in method（ログイン方法）」タブで **Google** を選ぶ
3. 「有効にする」をオンにし、「プロジェクトのサポートメール」に自分のメールアドレスを選んで「保存」する
4. 「設定」タブの「承認済みドメイン」に、`<プロジェクトID>.firebaseapp.com` と `<プロジェクトID>.web.app` があることを確認する（最初から入っています）

### 4. Firestore（データベース）を作る

1. 左のメニューから **Firestore**（「Databases & Storage」の中）を開き、「データベースを作成」を押す
2. エディションを聞かれたら **Standard** を選ぶ
3. ロケーションは **`asia-northeast1`（東京）** を選ぶ（**あとから変更できません**）
4. セキュリティルールは **「本番環境モード（Production mode）」** を選んで作成する
   （ルールは、このリポジトリの `firestore.rules` を手順 7 でデプロイして上書きします）

コンソールで作らなくても、手順 7 のデプロイで自動的に作られます（`firebase.json` に場所 `asia-northeast1` を指定済み）。

### 5. `.env` を作る

`.env.example` をコピーして `.env` という名前にし、手順 2 で控えた値を入れます。

```bash
cp .env.example .env
```

```ini
VITE_FIREBASE_API_KEY=（apiKey）
VITE_FIREBASE_AUTH_DOMAIN=<プロジェクトID>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<プロジェクトID>
VITE_FIREBASE_STORAGE_BUCKET=（storageBucket）
VITE_FIREBASE_MESSAGING_SENDER_ID=（messagingSenderId）
VITE_FIREBASE_APP_ID=（appId）
```

- `.env` は Git にコミットされません（`.gitignore` 済み）
- **`VITE_FIREBASE_AUTH_DOMAIN` は、アプリを開く URL のドメインと同じにします。**
  このアプリは `https://<プロジェクトID>.firebaseapp.com` で開く前提です（手順 8）。
  アプリと同じドメインのときは、ログインをリダイレクト方式で行います。iPhone のホーム画面アプリでは、この方式でないと Google ログインから戻ってこられません。

### 6. Firebase CLI にログインして、プロジェクトを選ぶ

Firebase CLI は `npm install` で一緒に入っています（`npx firebase` で使えます）。

```bash
npx firebase login
```

ブラウザが開くので、手順 1 と同じ Google アカウントでログインして許可します。続けて、使うプロジェクトを選びます。

```bash
npx firebase use --add
```

一覧から手順 1 のプロジェクトを選び、別名（alias）を聞かれたら `default` と入れます（`.firebaserc` が作られます）。

### 7. デプロイする

```bash
npm run deploy
```

型チェックとビルドのあと、次の2つをまとめてデプロイします。

- **Hosting**：アプリ本体（`dist/`）
- **Firestore**：セキュリティルール（`firestore.rules`）とインデックス

最後に `Hosting URL: https://<プロジェクトID>.web.app` のように表示されれば完了です。

### 8. スマホのホーム画面に追加する

**`https://<プロジェクトID>.firebaseapp.com`** を開きます（`.web.app` ではなく、`.env` の `AUTH_DOMAIN` と同じドメイン）。

- **iPhone / iPad（Safari）**：共有ボタン →「ホーム画面に追加」
- **Android（Chrome）**：右上のメニュー →「アプリをインストール」（または「ホーム画面に追加」）

ホーム画面のアイコンから開くと、アドレスバーのない全画面で起動します。PC でも同じ URL をブラウザで開いて使えます。

### 9. 動作を確認する

- [ ] ホーム画面のアイコンから全画面で起動する
- [ ] スマホで完了したタスクが、PC で開くと反映されている（逆も同様）
- [ ] 機内モードで完了操作ができ、電波が戻ると同期される（画面上部に「オフライン」と出て、同期が終わると消える）
- [ ] 別の Google アカウントでログインすると、何もない状態で表示される（自分のデータは見えない）
- [ ] 「設定」→「全データを JSON で書き出す」でファイルが保存される

---

## 更新するとき

```bash
git pull
npm install
npm run deploy
```

アプリは次に開いたときに自動で新しい版に切り替わります（すぐに反映されないときは、一度閉じて開き直してください）。

## GitHub にバックアップする

GitHub で空のリポジトリ（Private 推奨）を作り、表示された URL で次を実行します。

```bash
git remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git
git push -u origin main
```

`.env` と `.firebaserc` はコミットされないので、別の PC で使うときは手順 5・6 をもう一度行ってください。

---

## 開発のしかた

Firebase Emulator（PC の中だけで動く、偽のログインとデータベース）を使うと、本番のデータに触れずに試せます。**Java 21 以降**が必要です。

```bash
# ターミナル1：エミュレータを起動（http://127.0.0.1:4000 で中身を見られます）
npm run emulators

# ターミナル2：エミュレータにつないで開発サーバーを起動（http://localhost:5173）
npm run dev:emu
```

- ログイン画面に「テスト用アカウント alice / bob でログイン」が出ます（エミュレータ接続時だけ）
- ブラウザの開発者ツールのコンソールで、次の動作確認用の関数が使えます
  - `__studyPlanDebug.goOffline()` / `__studyPlanDebug.goOnline()`：Firestore の通信を止める／戻す
  - `__studyPlanDebug.setToday('2026-10-04')`：「今日」の日付を差し替える（`setToday()` で元に戻す）
- エミュレータのデータは、止めると消えます

| コマンド | 内容 |
|---|---|
| `npm test` | タスク生成ロジックの単体テスト（Vitest） |
| `npm run test:rules` | セキュリティルールのテスト（エミュレータを自動で起動・終了） |
| `npm run typecheck` | 型チェック |
| `npm run build` | 本番用ビルド（`dist/`） |
| `npm run dev` | `.env` の本番 Firebase につないで開発サーバーを起動 |
| `npm run icons` | `public/icon.svg` から PWA 用アイコンを作り直す |

## 困ったとき

| 症状 | 確認すること |
|---|---|
| 画面に「Firebase の設定がありません」と出る | `.env` を作ってから `npm run deploy`（またはビルド）し直す |
| ログインで `auth/unauthorized-domain` | Authentication →「設定」→「承認済みドメイン」に、開いている URL のドメインを追加する |
| iPhone のホーム画面アプリでログインできない | `https://<プロジェクトID>.firebaseapp.com` から追加したか、`.env` の `AUTH_DOMAIN` と同じドメインか |
| デプロイで Firestore のルールが失敗する | 手順 4 でデータベースを作ってあるか |
| `npm run emulators` で Firestore が起動しない | Java 21 以降が入っているか（`java -version`） |

## 構成

- TypeScript + React + Vite / Tailwind CSS v4 / vite-plugin-pwa
- Firebase Authentication（Google）/ Cloud Firestore（オフライン用の永続キャッシュ）/ Firebase Hosting
- `src/domain/`：タスク生成ロジック（Firestore に依存しない純粋関数とテスト）
- `src/data/`：Firestore の読み書き
- `src/screens/`・`src/components/`：画面
