## GAS（Apps Script）公開手順（Webアプリ）

このリポジトリは元々「静的HTML（フォルダ分割）＋相対パス」で動作していました。  
GASのWebアプリでは同じ配信構造にできないため、**ポータルはGASテンプレート**、各様式は**Drive上のHTMLをGASが読み込んで配信**する方式にしています。

### 1. Apps Script プロジェクトを作成

- Google Driveで新規作成 →「その他」→「Google Apps Script」
- `gas/Code.gs` と `gas/Portal.html` をプロジェクトに作成して貼り付け

### 2. Drive上に「各様式HTML」「PDFテンプレ」「フォント」を置く

- 各様式のHTML（例: `1gou/index.html`）をDriveにアップロード（ファイルIDが必要）
- 各様式の `template.pdf` をDriveにアップロード（ファイルIDが必要）
- フォントは全様式共通のため **`font.ttf` を1つだけ** Driveにアップロードし、`CAFA_ASSET_MAP_JSON` の `_shared.fontTtfId` にそのファイルIDを設定します（後方互換で各様式の `fontTtfId` も使えます）
  - `shako_zu` のテンプレPDF（元は外部URL）もDriveに置くことを推奨

### 3. Script Properties を設定

Apps Script エディタで「プロジェクトの設定」→「スクリプト プロパティ」に以下を追加します。

#### `CAFA_TENANT_DISPLAY_NAME`（任意）

- **ポータル**（`?page=portal`）のサイドバーに表示する **「○○ 様」** の名前部分（例: `ASAKURA`）。
- **未設定または空**のときは **`Customer`** が使われます。
- **共有履歴ファイル ID**（`CAFA_APPLICATION_HISTORY_FILE_ID`）を設定していない場合、各ユーザーのマイドライブ（または `CAFA_HISTORY_PARENT_FOLDER_ID` 配下）に作られる履歴用フォルダ名は **`CAFAfor<この名前> - <メールアドレス>`** です（未設定時は **`CAFAforCustomer - …`**）。従来どおり **`CAFAforASAKURA`** にしたい場合は、このプロパティに **`ASAKURA`** を設定してください。
- ブラウザタブのタイトル・メイン見出しには `for ○○` は付きません。PDF 保存先とは無関係です。
- **移行の注意**: プロパティ未設定のままだと接頭辞は `CAFAforCustomer` のため、既存の **`CAFAforASAKURA - …`** フォルダとは**別フォルダ**が新規作成されます。既存データをそのまま使うならテナント名を明示設定してください。また、履歴フォルダ ID はユーザープロパティ（`CAFA_FOLDER_ID`）にキャッシュされるため、既にキャッシュ済みのユーザーは、有効な間は従来のフォルダを使い続けます。

#### `CAFA_PAGE_HTML_FILE_MAP_JSON`

各ページ（様式）に対応する**Drive上のHTMLファイルID**を設定します。

```json
{
  "1gou": "HTML_FILE_ID",
  "3gou": "HTML_FILE_ID",
  "3gou2": "HTML_FILE_ID",
  "3gou3": "HTML_FILE_ID",
  "senyo3": "HTML_FILE_ID",
  "keidai1gou": "HTML_FILE_ID",
  "keidai4gou": "HTML_FILE_ID",
  "keidai4gou3": "HTML_FILE_ID",
  "keisenn1": "HTML_FILE_ID",
  "keisenn2": "HTML_FILE_ID",
  "shako_houkoku": "HTML_FILE_ID",
  "shako_zu": "HTML_FILE_ID"
}
```

#### `CAFA_ASSET_MAP_JSON`

各様式が参照する**PDFテンプレ/フォントのDriveファイルID**を設定します。

- **必須:** 各様式の `templatePdfId`（その様式用の `template.pdf`）と、共通フォントの **`_shared.fontTtfId`**（リポジトリの `assets/font.ttf` をDriveに1本アップロードしたファイルID）。
- JSONの一部だけを上書きする場合も、マージ後に上記が揃うようにしてください。エラー内容はブラウザのアラート2行目以降に表示されます。
- **Drive上の各様式HTML**は、Gitの `index.html` を更新したあと、同じ内容でDriveのファイルを上書き（または差し替え）しないと、GAS側の修正が画面に反映されません。

```json
{
  "_shared": {"fontTtfId":"FONT_FILE_ID"},
  "1gou": {"templatePdfId":"PDF_FILE_ID"},
  "3gou": {"templatePdfId":"PDF_FILE_ID"},
  "3gou2": {"templatePdfId":"PDF_FILE_ID"},
  "3gou3": {"templatePdfId":"PDF_FILE_ID"},
  "senyo3": {"templatePdfId":"PDF_FILE_ID"},
  "keidai1gou": {"templatePdfId":"PDF_FILE_ID"},
  "keidai4gou": {"templatePdfId":"PDF_FILE_ID"},
  "keidai4gou3": {"templatePdfId":"PDF_FILE_ID"},
  "keisenn1": {"templatePdfId":"PDF_FILE_ID"},
  "keisenn2": {"templatePdfId":"PDF_FILE_ID"},
  "shako_houkoku": {"templatePdfId":"PDF_FILE_ID"},
  "shako_zu": {"templatePdfId":"PDF_FILE_ID"}
}
```

#### 申請履歴 JSON（`applicationHistory.json`）の場所（任意）

次のいずれかを使います。**両方未設定**のときは従来どおり、各ユーザーのマイドライブ直下に `CAFAforHIRANO - <メール>` フォルダを作り、その中の `applicationHistory.json` を読み書きします。

| スクリプト プロパティ | 内容 |
|----------------------|------|
| `CAFA_APPLICATION_HISTORY_FILE_ID` | **1つの JSON を全ユーザーで共有**するときに指定。**(A) その JSON ファイル自体の Drive ファイル ID**、または **(B) その JSON を入れたフォルダの ID** のどちらでも可。(B) のときはフォルダ内の **`applicationHistory.json`** を読み書きします。中身は **`[{...}, ...]` 形式の配列**（1件だけなら `{...}` 単体でも可）。**Drive に「アップロード」した .json / テキスト**を推奨。青いアイコンの **Googleドキュメント**で作成すると形式や権限で読めないことがあるため避けてください。Webアプリ利用者全員にファイルの**編集者**相当の権限が必要です。複数ユーザーが同時保存すると競合し得ます。 |
| `CAFA_HISTORY_PARENT_FOLDER_ID` | 上記 **未設定**のとき、ユーザー別フォルダ `CAFAforHIRANO - <email>` を **このフォルダの直下**に作ります（共有ドライブやチーム用の親フォルダを指定する用途）。 |

`CAFA_APPLICATION_HISTORY_FILE_ID` を設定した場合は `CAFA_HISTORY_PARENT_FOLDER_ID` は履歴には使われません（PDF保存先など他用途とは無関係）。

#### `CAFA_PDF_OUTPUT_FOLDER_ID` / `CAFA_PDF_OUTPUT_FOLDER_ID_DEFAULT`

- **どちらか一方は必須**です（両方ある場合は `CAFA_PDF_OUTPUT_FOLDER_ID` が優先）。
- **`CAFA_PDF_OUTPUT_FOLDER_ID_DEFAULT`** … 通常の完成 PDF の保存先フォルダの Drive ID（既定の保存先）。
- **`CAFA_PDF_OUTPUT_FOLDER_ID`** … 上記とは別のフォルダに保存したいときだけ指定（テナント別デプロイで上書きする用途など）。
- Webアプリが「アクセスしているユーザー」で実行される場合、**各ユーザーがそのフォルダにファイルを作成できる権限**（共有の編集者など）が必要です。

### 4. Webアプリとしてデプロイ

- 「デプロイ」→「新しいデプロイ」
- 種類: 「ウェブアプリ」
- 実行するユーザー: **アクセスしているユーザー**
  - 履歴をユーザー（Googleアカウント）単位で保存するため
- アクセスできるユーザー: 運用方針に合わせて選択

### 5. 動作のポイント（実装側の仕組み）

- **各様式のHTMLはDriveから読み込み**、返却時に「注入スクリプト」を追加しています。
  - `fetch('template.pdf')` / `fetch('../assets/font.ttf')`（従来の `font.ttf` も可）→ `getAssetBase64(formId, ...)` へ自動転送
  - `localStorage.setItem('applicationHistory', ...)` → `saveHistory(lastRecord)` を自動呼び出し
- 申請履歴は、Script Properties の `CAFA_APPLICATION_HISTORY_FILE_ID` で指定した JSON ファイル、または `CAFA_HISTORY_PARENT_FOLDER_ID` 配下（未設定時は各ユーザーのマイドライブ直下）の `CAFAforHIRANO - <email>` / `applicationHistory.json` に保存・読み取りされます。
- 完成PDFは、上記とは別に **`CAFA_PDF_OUTPUT_FOLDER_ID`（優先）または `CAFA_PDF_OUTPUT_FOLDER_ID_DEFAULT` で指定したフォルダ**に保存されます。

