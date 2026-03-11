## GAS（Apps Script）公開手順（Webアプリ）

このリポジトリは元々「静的HTML（フォルダ分割）＋相対パス」で動作していました。  
GASのWebアプリでは同じ配信構造にできないため、**ポータルはGASテンプレート**、各様式は**Drive上のHTMLをGASが読み込んで配信**する方式にしています。

### 1. Apps Script プロジェクトを作成

- Google Driveで新規作成 →「その他」→「Google Apps Script」
- `gas/Code.gs` と `gas/Portal.html` をプロジェクトに作成して貼り付け

### 2. Drive上に「各様式HTML」「PDFテンプレ」「フォント」を置く

- 各様式のHTML（例: `1gou/index.html`）をDriveにアップロード（ファイルIDが必要）
- 各様式の `template.pdf` と `font.ttf` もDriveにアップロード（ファイルIDが必要）
  - `shako_zu` のテンプレPDF（元は外部URL）もDriveに置くことを推奨

### 3. Script Properties を設定

Apps Script エディタで「プロジェクトの設定」→「スクリプト プロパティ」に以下を追加します。

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

```json
{
  "1gou": {"templatePdfId":"PDF_FILE_ID","fontTtfId":"FONT_FILE_ID"},
  "3gou": {"templatePdfId":"PDF_FILE_ID","fontTtfId":"FONT_FILE_ID"},
  "3gou2": {"templatePdfId":"PDF_FILE_ID","fontTtfId":"FONT_FILE_ID"},
  "3gou3": {"templatePdfId":"PDF_FILE_ID","fontTtfId":"FONT_FILE_ID"},
  "senyo3": {"templatePdfId":"PDF_FILE_ID","fontTtfId":"FONT_FILE_ID"},
  "keidai1gou": {"templatePdfId":"PDF_FILE_ID","fontTtfId":"FONT_FILE_ID"},
  "keidai4gou": {"templatePdfId":"PDF_FILE_ID","fontTtfId":"FONT_FILE_ID"},
  "keidai4gou3": {"templatePdfId":"PDF_FILE_ID","fontTtfId":"FONT_FILE_ID"},
  "keisenn1": {"templatePdfId":"PDF_FILE_ID","fontTtfId":"FONT_FILE_ID"},
  "keisenn2": {"templatePdfId":"PDF_FILE_ID","fontTtfId":"FONT_FILE_ID"},
  "shako_houkoku": {"templatePdfId":"PDF_FILE_ID","fontTtfId":"FONT_FILE_ID"},
  "shako_zu": {"templatePdfId":"PDF_FILE_ID"}
}
```

### 4. Webアプリとしてデプロイ

- 「デプロイ」→「新しいデプロイ」
- 種類: 「ウェブアプリ」
- 実行するユーザー: **アクセスしているユーザー**
  - 履歴をユーザー（Googleアカウント）単位で保存するため
- アクセスできるユーザー: 運用方針に合わせて選択

### 5. 動作のポイント（実装側の仕組み）

- **各様式のHTMLはDriveから読み込み**、返却時に「注入スクリプト」を追加しています。
  - `fetch('template.pdf')` / `fetch('font.ttf')` → `getAssetBase64(formId, ...)` へ自動転送
  - `localStorage.setItem('applicationHistory', ...)` → `saveHistory(lastRecord)` を自動呼び出し
- 申請履歴は、各ユーザーのDrive直下に `CAFAforHIRANO - <email>` フォルダを作り、その中の `applicationHistory.json` に保存されます。

