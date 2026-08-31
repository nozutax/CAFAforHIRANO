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
  "kei2rin1gou": "HTML_FILE_ID",
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
- **異体字（IVS）対応:** PDFで「辻󠄀」など一点しんにょうを出すには、**PUA入りの `assets/font.ttf`** をDriveに差し替え、あわせて **`_shared.pdfIvsJsId`** に `assets/pdf-ivs.js` のDriveファイルIDを設定します（GASがHTMLへインライン注入します）。任意で `_shared.ivsMapJsonId`（`ivs-map.json`）も置けます。
- JSONの一部だけを上書きする場合も、マージ後に上記が揃うようにしてください。エラー内容はブラウザのアラート2行目以降に表示されます。
- **Drive上の各様式HTML**は、Gitの `index.html` を更新したあと、同じ内容でDriveのファイルを上書き（または差し替え）しないと、GAS側の修正が画面に反映されません。

```json
{
  "_shared": {
    "fontTtfId": "FONT_FILE_ID",
    "pdfIvsJsId": "PDF_IVS_JS_FILE_ID",
    "ivsMapJsonId": "IVS_MAP_JSON_FILE_ID"
  },
  "1gou": {"templatePdfId":"PDF_FILE_ID"},
  "3gou": {"templatePdfId":"PDF_FILE_ID"},
  "3gou2": {"templatePdfId":"PDF_FILE_ID"},
  "3gou3": {"templatePdfId":"PDF_FILE_ID"},
  "senyo3": {"templatePdfId":"PDF_FILE_ID"},
  "kei2rin1gou": {"templatePdfId":"PDF_FILE_ID"},
  "keidai1gou": {"templatePdfId":"PDF_FILE_ID"},
  "keidai4gou": {"templatePdfId":"PDF_FILE_ID"},
  "keidai4gou3": {"templatePdfId":"PDF_FILE_ID"},
  "keisenn1": {"templatePdfId":"PDF_FILE_ID"},
  "keisenn2": {"templatePdfId":"PDF_FILE_ID"},
  "shako_houkoku": {"templatePdfId":"PDF_FILE_ID"},
  "shako_zu": {"templatePdfId":"PDF_FILE_ID"}
}
```

#### 異体字フォントの再生成（任意）

リポジトリの `assets/font.ttf` は IVS（異体字セレクタ）用の PUA マッピング入りです。再生成する場合:

```bash
python3 scripts/build-ivs-font.py
```

出力: `assets/font.ttf` / `assets/ivs-map.json` / `assets/pdf-ivs.js`

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

### 4. 様式を追加したとき（例: 軽二輪第1号 `kei2rin1gou`）

ポータルにカードを足すだけでは足りません。**コードと Script Properties の両方**を更新します。

| 手順 | 作業内容 |
|------|----------|
| 1 | リポジトリの `kei2rin1gou/index.html` と `kei2rin1gou/template.pdf` を Drive にアップロード（既存フォルダに置くか新規作成） |
| 2 | Drive 上の **HTML ファイルID** と **template.pdf のファイルID** を控える |
| 3 | `gas/Code.gs` の `APP.pages` / `PAGE_HTML_FILE_MAP_DEFAULT` / `ASSET_MAP_DEFAULT` に `'kei2rin1gou'` を追加（リポジトリ側は済） |
| 4 | `gas/Portal.html` にカードを追加（リポジトリ側は済） |
| 5 | Script Properties の **`CAFA_PAGE_HTML_FILE_MAP_JSON`** に `"kei2rin1gou": "<HTMLのDriveファイルID>"` を追記 |
| 6 | Script Properties の **`CAFA_ASSET_MAP_JSON`** に `"kei2rin1gou": {"templatePdfId":"<PDFのDriveファイルID>"}` を追記（フォントは既存の `_shared.fontTtfId` を共用） |
| 7 | Apps Script に最新の `Code.gs` / `Portal.html` を反映し、**ウェブアプリを再デプロイ**（新バージョン） |
| 8 | 以後 Git で `kei2rin1gou/index.html` を直したら、**Drive 上の同HTMLも同じ内容で上書き**する |

JSON を編集するときは、既存キーを消さないよう注意してください。エディタでプロパティ値を開いて追記し、保存後にポータルから「軽二輪 第1号様式」→作成する、で PDF 出力まで確認します。

**既存環境への追記例（差分イメージ）:**

```json
"kei2rin1gou": "HTML_FILE_ID_OF_kei2rin1gou_index.html"
```

```json
"kei2rin1gou": {"templatePdfId":"PDF_FILE_ID_OF_kei2rin1gou_template.pdf"}
```

### 5. Webアプリとしてデプロイ

- 「デプロイ」→「新しいデプロイ」
- 種類: 「ウェブアプリ」
- 実行するユーザー: **アクセスしているユーザー**
  - 履歴をユーザー（Googleアカウント）単位で保存するため
- アクセスできるユーザー: 運用方針に合わせて選択

### 6. 本番環境への移行手順（IVS / 既存GASの更新）

対象は **すでに公開済みの Apps Script Webアプリ**（Drive 上の HTML・フォント・Script Properties を使っている環境）です。  
GitHub への push / PR マージだけでは本番は変わりません。下表を順に実施してください。

#### 前提

- リポジトリの最新（IVS対応コミット）を手元に用意する（`main` マージ後、または作業ブランチ）
- 本番の Apps Script プロジェクトと、その Script Properties / Drive ファイルに編集権限があること
- 差し替え対象ファイルの **既存 Drive ファイルID** を控えておく（`CAFA_ASSET_MAP_JSON` / `CAFA_PAGE_HTML_FILE_MAP_JSON`）

#### チェックリスト

| 順 | 作業 | 詳細 |
|----|------|------|
| 1 | **共有フォント差し替え** | リポジトリの `assets/font.ttf`（PUA入り）で、Drive 上の共有フォントを**同じファイルとして上書き**する。ファイルIDが変わらないよう「新しいバージョンで置き換え」または同名上書きを使う。新規アップロードしてIDが変わったら、手順3で `_shared.fontTtfId` も更新する。 |
| 2 | **`pdf-ivs.js` を Drive に置く** | `assets/pdf-ivs.js` を Drive にアップロード（初回）または既存ファイルを上書き。**ファイルIDを控える**。 |
| 3 | **Script Properties 更新** | Apps Script →「プロジェクトの設定」→「スクリプト プロパティ」で `CAFA_ASSET_MAP_JSON` を開き、`_shared` に少なくとも次を入れる（既存の `fontTtfId`・各様式の `templatePdfId` は消さない）。 |
| 4 | **各様式 HTML を上書き** | 下の「HTML 更新対象」一覧の Drive 上 HTML を、Git の同パス `index.html` の内容で上書きする。ポータルを使う場合は `gas/Portal.html` も Apps Script 側に反映。 |
| 5 | **`Code.gs` を反映** | Apps Script エディタの `Code.gs` をリポジトリの `gas/Code.gs` 全文で置き換えて保存。 |
| 6 | **ウェブアプリを再デプロイ** | 「デプロイ」→「デプロイを管理」→編集（鉛筆）→ **新バージョン** を作成してデプロイ。URL は変えずにバージョンだけ上げる運用を推奨。 |
| 7 | **動作確認** | ポータルから任意様式（例: 軽二輪第1号）を開き、氏名などに **「辻󠄀」**（点1つの辻）を入力して PDF を出力。PDF 上でも点1つであることを確認する。通常の「辻」も従来どおり出ること。 |

#### 手順3: `CAFA_ASSET_MAP_JSON` の追記例

既存 JSON の `_shared` だけを次のように拡張する（他キーはそのまま）。

```json
"_shared": {
  "fontTtfId": "（既存の共有フォントID。差し替えでIDが変わった場合は新ID）",
  "pdfIvsJsId": "（手順2で控えた pdf-ivs.js のDriveファイルID）"
}
```

任意で `ivs-map.json` も Drive に置き、`"ivsMapJsonId": "..."` を追加できる。`pdf-ivs.js` にマップが埋め込み済みのため、通常は省略可。

#### HTML 更新対象（Drive 上の各様式）

`CAFA_PAGE_HTML_FILE_MAP_JSON` に載っている様式のうち、IVS対応で `index.html` を更新したもの:

- `1gou` / `3gou` / `3gou2` / `3gou3` / `senyo3`
- `kei2rin1gou` / `keidai1gou` / `keidai4gou` / `keidai4gou3`
- `keisenn1` / `keisenn2`

（`shako_houkoku` / `shako_zu` は今回の IVS 描画変更対象外。ポータルや `Code.gs` だけ更新すれば足りる。）

#### 確認時の注意

- Drive の HTML を古いままにすると、画面は旧版のまま（`pdf-ivs.js` 未読込・旧 `drawText`）になる
- フォントだけ新しくして HTML / `Code.gs` が古いと、IVS は正規化されず従来どおり点2つになる
- `pdfIvsJsId` 未設定だと、GAS は相対パスの `../assets/pdf-ivs.js` を読めないため異体字変換が動かない
- ブラウザの強いキャッシュが残る場合はシークレットウィンドウ、またはデプロイ後の URL で再確認する

#### ロールバック（問題が出たとき）

1. Drive の `font.ttf` を変更前のファイルに戻す（バックアップを取っておく）
2. 各様式 HTML / `Code.gs` を直前バージョンに戻す
3. ウェブアプリを**再デプロイ**（旧版のままだとキャッシュや実行バージョンが残ることがある）
4. 急ぎなら `_shared.pdfIvsJsId` を消しても、旧 HTML では未使用のため実害は小さい（新 HTML のままなら異体字だけ無効化される）

### 7. 動作のポイント（実装側の仕組み）

- **各様式のHTMLはDriveから読み込み**、返却時に「注入スクリプト」を追加しています。
  - `fetch('template.pdf')` / `fetch('../assets/font.ttf')`（従来の `font.ttf` も可）→ `getAssetBase64(formId, ...)` へ自動転送
  - `_shared.pdfIvsJsId` がある場合、`<script src="...pdf-ivs.js">` を Drive 上の内容で**インライン置換**する
  - `fetch('ivs-map.json')`（任意）→ `getAssetBase64(formId, 'ivsMap')` へ転送可能
  - `localStorage.setItem('applicationHistory', ...)` → `saveHistory(lastRecord)` を自動呼び出し
- 申請履歴は、Script Properties の `CAFA_APPLICATION_HISTORY_FILE_ID` で指定した JSON ファイル、または `CAFA_HISTORY_PARENT_FOLDER_ID` 配下（未設定時は各ユーザーのマイドライブ直下）の `CAFAforHIRANO - <email>` / `applicationHistory.json` に保存・読み取りされます。
- 完成PDFは、上記とは別に **`CAFA_PDF_OUTPUT_FOLDER_ID`（優先）または `CAFA_PDF_OUTPUT_FOLDER_ID_DEFAULT` で指定したフォルダ**に保存されます。
