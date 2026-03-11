/**
 * CAFAforHIRANO - Apps Script Web App entry.
 *
 * Routing model:
 *   /exec?page=portal
 *   /exec?page=1gou
 *   /exec?page=3gou
 *   ...
 */

const APP = {
  title: '自動車申請書 作成ポータル for HIRANO',
  defaultPage: 'portal',
  pages: {
    portal: { file: 'Portal' },
    '1gou': { drive: true },
    '3gou': { drive: true },
    '3gou2': { drive: true },
    '3gou3': { drive: true },
    'senyo3': { drive: true },
    'keidai1gou': { drive: true },
    'keidai4gou': { drive: true },
    'keidai4gou3': { drive: true },
    'keisenn1': { drive: true },
    'keisenn2': { drive: true },
    'shako_houkoku': { drive: true },
    'shako_zu': { drive: true },
  },
};

/**
 * Page HTML file mapping.
 * Set Script Properties key `CAFA_PAGE_HTML_FILE_MAP_JSON` with JSON like:
 * {
 *   "1gou": "DRIVE_FILE_ID_OF_1GOU_HTML",
 *   "3gou": "..."
 * }
 */
const PAGE_HTML_FILE_MAP_DEFAULT = {
  '1gou': '',
  '3gou': '',
  '3gou2': '',
  '3gou3': '',
  'senyo3': '',
  'keidai1gou': '',
  'keidai4gou': '',
  'keidai4gou3': '',
  'keisenn1': '',
  'keisenn2': '',
  'shako_houkoku': '',
  'shako_zu': '',
};

/**
 * Asset mapping.
 *
 * Recommended: set Script Properties key `CAFA_ASSET_MAP_JSON` with JSON like:
 * {
 *   "1gou": {"templatePdfId":"...","fontTtfId":"..."},
 *   "shako_zu": {"templatePdfId":"..."}
 * }
 */
const ASSET_MAP_DEFAULT = {
  '1gou': { templatePdfId: '', fontTtfId: '' },
  '3gou': { templatePdfId: '', fontTtfId: '' },
  '3gou2': { templatePdfId: '', fontTtfId: '' },
  '3gou3': { templatePdfId: '', fontTtfId: '' },
  'senyo3': { templatePdfId: '', fontTtfId: '' },
  'keidai1gou': { templatePdfId: '', fontTtfId: '' },
  'keidai4gou': { templatePdfId: '', fontTtfId: '' },
  'keidai4gou3': { templatePdfId: '', fontTtfId: '' },
  'keisenn1': { templatePdfId: '', fontTtfId: '' },
  'keisenn2': { templatePdfId: '', fontTtfId: '' },
  'shako_houkoku': { templatePdfId: '', fontTtfId: '' },
  'shako_zu': { templatePdfId: '' },
};

function doGet(e) {
  const page = String((e && e.parameter && e.parameter.page) || APP.defaultPage || 'portal');
  const route = APP.pages[page] || APP.pages[APP.defaultPage];

  if (route.drive) {
    return _renderDriveHtmlPage_(page);
  }

  const tmpl = HtmlService.createTemplateFromFile(route.file);
  tmpl.APP_TITLE = APP.title;
  tmpl.PAGE_ID = page;

  return tmpl
    .evaluate()
    .setTitle(APP.title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

/**
 * HTML include helper for templating.
 * Usage: <?!= include('Shared_Whatever'); ?>
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Build route URL for a page id.
 * Available from templates: <?= getUrlFor('1gou') ?>
 */
function getUrlFor(page) {
  const base = ScriptApp.getService().getUrl();
  const p = encodeURIComponent(String(page || APP.defaultPage || 'portal'));
  return base + '?page=' + p;
}

function _getAssetMap() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('CAFA_ASSET_MAP_JSON');
  if (!raw) return ASSET_MAP_DEFAULT;
  try {
    const parsed = JSON.parse(raw);
    return Object.assign({}, ASSET_MAP_DEFAULT, parsed);
  } catch (e) {
    throw new Error('Script Properties の `CAFA_ASSET_MAP_JSON` が不正なJSONです。' + (e && e.message ? (' ' + e.message) : ''));
  }
}

function _readDriveFileBase64(fileId) {
  if (!fileId) throw new Error('DriveファイルIDが未設定です。');
  const blob = DriveApp.getFileById(fileId).getBlob();
  return Utilities.base64Encode(blob.getBytes());
}

function _getRequiredScriptProperty_(key) {
  const props = PropertiesService.getScriptProperties();
  const v = props.getProperty(key);
  if (!v) throw new Error('Script Properties に `' + key + '` を設定してください。');
  return v;
}

/**
 * Client API: get asset base64 bytes.
 * @param {string} formId e.g. '1gou'
 * @param {string} assetType 'template' | 'font'
 * @returns {string} base64
 */
function getAssetBase64(formId, assetType) {
  const fid = String(formId || '').trim();
  const at = String(assetType || '').trim();
  const map = _getAssetMap();
  const entry = map[fid];
  if (!entry) throw new Error('未対応のformIdです: ' + fid);

  if (at === 'template') return _readDriveFileBase64(entry.templatePdfId);
  if (at === 'font') return _readDriveFileBase64(entry.fontTtfId);
  throw new Error('未対応のassetTypeです: ' + at);
}

/**
 * shako_zu map image provider.
 * - If center is "lat,lng" => use directly
 * - Else => Geocoding API to resolve address -> lat,lng
 * Then fetch Static Maps API and return base64 png + resolved center.
 *
 * Script Properties:
 * - CAFA_MAPS_API_KEY : Google Maps Platform API key
 */
function getStaticMap(center, zoom) {
  const apiKey = _getRequiredScriptProperty_('CAFA_MAPS_API_KEY');

  const rawCenter = String(center || '').trim();
  if (!rawCenter) throw new Error('center が空です。');
  const z = Math.max(1, Math.min(20, Number(zoom || 18) || 18));

  // Determine lat/lng
  const coordMatch = rawCenter.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  let latLngStr = '';
  if (coordMatch) {
    latLngStr = coordMatch[1] + ',' + coordMatch[2];
  } else {
    // Geocode
    const geocodeUrl =
      'https://maps.googleapis.com/maps/api/geocode/json?address=' +
      encodeURIComponent(rawCenter) +
      '&key=' +
      encodeURIComponent(apiKey);
    const geocodeRes = UrlFetchApp.fetch(geocodeUrl, { muteHttpExceptions: true });
    const geocodeCode = geocodeRes.getResponseCode();
    const geocodeText = geocodeRes.getContentText('utf-8');
    if (geocodeCode !== 200) {
      throw new Error('Geocoding API が失敗しました。HTTP ' + geocodeCode + ': ' + geocodeText);
    }
    const geocodeJson = JSON.parse(geocodeText);
    if (geocodeJson.status !== 'OK' || !geocodeJson.results || !geocodeJson.results.length) {
      throw new Error('Geocoding API が住所を解決できませんでした。status=' + geocodeJson.status);
    }
    const loc = geocodeJson.results[0].geometry && geocodeJson.results[0].geometry.location;
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
      throw new Error('Geocoding API の結果が不正です。');
    }
    latLngStr = String(loc.lat) + ',' + String(loc.lng);
  }

  // Static map (PNG)
  // Size must match canvas-ish aspect; keep moderate to reduce payload.
  const size = '708x681';
  const staticUrl =
    'https://maps.googleapis.com/maps/api/staticmap?center=' +
    encodeURIComponent(latLngStr) +
    '&zoom=' +
    encodeURIComponent(String(z)) +
    '&size=' +
    encodeURIComponent(size) +
    '&maptype=roadmap&scale=2&format=png&key=' +
    encodeURIComponent(apiKey);

  const imgRes = UrlFetchApp.fetch(staticUrl, { muteHttpExceptions: true });
  const imgCode = imgRes.getResponseCode();
  const imgBlob = imgRes.getBlob();
  if (imgCode !== 200) {
    const errText = imgBlob.getDataAsString('utf-8');
    throw new Error('Static Maps API が失敗しました。HTTP ' + imgCode + ': ' + errText);
  }
  const pngBase64 = Utilities.base64Encode(imgBlob.getBytes());
  return { pngBase64: pngBase64, mapCenter: latLngStr };
}

function _getPageHtmlFileMap_() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('CAFA_PAGE_HTML_FILE_MAP_JSON');
  if (!raw) return PAGE_HTML_FILE_MAP_DEFAULT;
  try {
    const parsed = JSON.parse(raw);
    return Object.assign({}, PAGE_HTML_FILE_MAP_DEFAULT, parsed);
  } catch (e) {
    throw new Error('Script Properties の `CAFA_PAGE_HTML_FILE_MAP_JSON` が不正なJSONです。' + (e && e.message ? (' ' + e.message) : ''));
  }
}

function _renderDriveHtmlPage_(pageId) {
  const page = String(pageId || '').trim();
  const map = _getPageHtmlFileMap_();
  const fileId = map[page];
  if (!fileId) {
    return HtmlService.createHtmlOutput(
      '<div style="font-family: sans-serif; padding: 18px;">' +
        '<h2>ページ設定が未完了です</h2>' +
        '<p>Script Properties に <code>CAFA_PAGE_HTML_FILE_MAP_JSON</code> を設定し、' +
        'ページ <code>' + page + '</code> に対応するDrive上のHTMLファイルIDを指定してください。</p>' +
        '<p><a href="' + getUrlFor('portal') + '">ポータルへ戻る</a></p>' +
      '</div>'
    ).setTitle(APP.title);
  }

  const html = DriveApp.getFileById(fileId).getBlob().getDataAsString('utf-8');
  const injected = _injectAdapters_(html, page);
  return HtmlService.createHtmlOutput(injected).setTitle(APP.title).addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function _injectAdapters_(html, formId) {
  const portalUrl = getUrlFor('portal');
  const serviceUrl = ScriptApp.getService().getUrl();
  const safeFormId = String(formId || '').replace(/[^\w\-]/g, '');

  const adapter = [
    '<script>',
    '(function(){',
    "  window.__CAFA_FORM_ID = '" + safeFormId + "';",
    "  window.__CAFA_PORTAL_URL = '" + portalUrl + "';",
    "  window.__CAFA_SERVICE_URL = '" + serviceUrl + "';",
    "  function b64ToBytes(b64){",
    "    const bin = atob(b64);",
    "    const len = bin.length;",
    "    const bytes = new Uint8Array(len);",
    "    for(let i=0;i<len;i++) bytes[i]=bin.charCodeAt(i);",
    "    return bytes;",
    "  }",
    "  function b64ToBlob(b64, mime){",
    "    const bytes = b64ToBytes(b64);",
    "    return new Blob([bytes], { type: mime || 'application/octet-stream' });",
    "  }",
    "  function arrayBufferToBase64(buf){",
    "    const bytes = new Uint8Array(buf);",
    "    let bin = '';",
    "    const chunk = 0x8000;",
    "    for(let i=0;i<bytes.length;i+=chunk){",
    "      bin += String.fromCharCode.apply(null, bytes.subarray(i, i+chunk));",
    "    }",
    "    return btoa(bin);",
    "  }",
    "  const origFetch = window.fetch ? window.fetch.bind(window) : null;",
    "  var assetCache_ = {};",
    "  function fetchAsset_(assetType){",
    "    if(assetCache_[assetType]) return assetCache_[assetType];",
    "    var p = new Promise(function(resolve, reject){",
    "      if(!window.google || !google.script || !google.script.run){ reject(new Error('google.script.run が利用できません')); return; }",
    "      google.script.run.withSuccessHandler(function(b64){",
    "        try{ resolve(b64ToBytes(b64).buffer); } catch(e){ reject(e); }",
    "      }).withFailureHandler(function(e){ reject(e); }).getAssetBase64(window.__CAFA_FORM_ID, assetType);",
    "    });",
    "    assetCache_[assetType] = p;",
    "    return p;",
    "  }",
    "  async function fetchStaticMap_(center, zoom){",
    "    return await new Promise((resolve, reject)=>{",
    "      if(!window.google || !google.script || !google.script.run){ reject(new Error('google.script.run が利用できません')); return; }",
    "      google.script.run.withSuccessHandler((data)=>resolve(data)).withFailureHandler((e)=>reject(e)).getStaticMap(center, zoom);",
    "    });",
    "  }",
    "  if(origFetch){",
    "    window.fetch = function(resource, init){",
    "      const url = (typeof resource === 'string') ? resource : (resource && resource.url ? resource.url : '');",
    "      const isTemplate = url === 'template.pdf' || /shozaizu-haichizu\\.pdf$/.test(url);",
    "      const isFont = url === 'font.ttf';",
    "      const isStaticMap = url && (url.indexOf('/api/staticmap?') === 0 || url.indexOf('api/staticmap?') === 0);",
    "      if(isTemplate || isFont){",
    "        const type = isFont ? 'font' : 'template';",
    "        return fetchAsset_(type).then((buf)=>({ ok:true, arrayBuffer: async ()=>buf }));",
    "      }",
    "      if(isStaticMap){",
    "        try{",
    "          const u = new URL(url, window.location.href);",
    "          const center = u.searchParams.get('center') || '';",
    "          const zoom = u.searchParams.get('zoom') || '18';",
    "          return fetchStaticMap_(center, zoom).then((data)=>{",
    "            const blob = b64ToBlob(data && data.pngBase64 ? data.pngBase64 : '', 'image/png');",
    "            const headers = { get: function(k){ return String(k).toLowerCase()==='x-map-center' ? (data && data.mapCenter ? data.mapCenter : '') : null; } };",
    "            return { ok:true, blob: async ()=>blob, headers: headers };",
    "          });",
    "        } catch(e){",
    "          return Promise.reject(e);",
    "        }",
    "      }",
    "      return origFetch(resource, init);",
    "    };",
    "  }",
    "  try{ fetchAsset_('template'); fetchAsset_('font'); } catch(e){}",
    "  try{",
    "    const ls = window.localStorage;",
    "    if(ls && ls.setItem){",
    "      const origSet = ls.setItem.bind(ls);",
    "      ls.setItem = function(key, value){",
    "        try{",
    "          if(key === 'applicationHistory'){",
    "            const arr = JSON.parse(value||'[]');",
    "            const last = Array.isArray(arr) && arr.length ? arr[arr.length-1] : null;",
    "            if(last && window.google && google.script && google.script.run){",
    "              google.script.run.withFailureHandler(function(e){ console.warn('履歴保存(サーバ)失敗', e); }).saveHistory(last);",
    "            }",
    "          }",
    "        } catch(e){}",
    "        return origSet(key, value);",
    "      };",
    "    }",
    "  } catch(e){}",
    "  (function(){",
    "    var overlay = document.createElement('div');",
    "    overlay.id = 'cafa-overlay';",
    "    overlay.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:99999;justify-content:center;align-items:center;';",
    "    var box = document.createElement('div');",
    "    box.style.cssText = 'background:#fff;border-radius:16px;padding:40px 48px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,0.25);min-width:260px;';",
    "    var spinnerEl = document.createElement('div');",
    "    spinnerEl.id = 'cafa-spinner';",
    "    spinnerEl.style.cssText = 'width:48px;height:48px;border:5px solid #e5e7eb;border-top-color:#2563eb;border-radius:50%;margin:0 auto 18px;animation:cafaSpin 0.8s linear infinite;';",
    "    var msgEl = document.createElement('div');",
    "    msgEl.id = 'cafa-msg';",
    "    msgEl.style.cssText = 'font-size:16px;font-weight:600;color:#333;';",
    "    msgEl.textContent = '送信中...';",
    "    box.appendChild(spinnerEl);",
    "    box.appendChild(msgEl);",
    "    overlay.appendChild(box);",
    "    var styleTag = document.createElement('style');",
    "    styleTag.textContent = '@keyframes cafaSpin{to{transform:rotate(360deg)}}';",
    "    document.head.appendChild(styleTag);",
    "    if(document.body) document.body.appendChild(overlay);",
    "    document.addEventListener('click', function(e){",
    "      var btn = e.target.closest ? e.target.closest('button') : e.target;",
    "      if(btn && btn.tagName === 'BUTTON' && (btn.textContent||'').trim() === 'データ送信'){",
    "        msgEl.textContent = '送信中...';",
    "        msgEl.style.color = '#333';",
    "        spinnerEl.style.display = 'block';",
    "        overlay.style.display = 'flex';",
    "      }",
    "    }, true);",
    "    function showOverlay(msg){",
    "      msgEl.textContent = msg || '送信中...';",
    "      spinnerEl.style.display = 'block';",
    "      overlay.style.display = 'flex';",
    "    }",
    "    function showResult(msg, isError){",
    "      spinnerEl.style.display = 'none';",
    "      msgEl.textContent = msg;",
    "      msgEl.style.color = isError ? '#dc2626' : '#16a34a';",
    "      setTimeout(function(){ overlay.style.display = 'none'; msgEl.style.color = '#333'; }, 2500);",
    "    }",
    "    function hideOverlay(){ overlay.style.display = 'none'; }",
    "    const origClick = HTMLAnchorElement && HTMLAnchorElement.prototype && HTMLAnchorElement.prototype.click;",
    "    if(!origClick) return;",
    "    HTMLAnchorElement.prototype.click = function(){",
    "      const self = this;",
    "      const fallback = function(){ hideOverlay(); return origClick.call(self); };",
    "      try{",
    "        const href = self.href || '';",
    "        const name = (self.download || '').trim();",
    "        const isPdfName = /\\.pdf$/i.test(name);",
    "        const isBlob = /^blob:/i.test(href);",
    "        const isDataPdf = /^data:application\\/pdf;base64,/i.test(href);",
    "        const canRun = !!(window.google && google.script && google.script.run);",
    "        if(!((isBlob || isDataPdf) && isPdfName && canRun)) return fallback();",
    "",
    "        showOverlay('送信中...');",
    "        const fileName = name || ('output_' + Date.now() + '.pdf');",
    "        var b64Promise;",
    "        if(isDataPdf){ b64Promise = Promise.resolve(href.split(',')[1]); }",
    "        else { b64Promise = fetch(href).then(function(r){return r.arrayBuffer();}).then(function(buf){return arrayBufferToBase64(buf);}); }",
    "        b64Promise.then(function(pdfBase64){",
    "          google.script.run",
    "            .withSuccessHandler(function(res){",
    "              try{ URL.revokeObjectURL(href); } catch(e){}",
    "              showResult('送信完了');",
    "            })",
    "            .withFailureHandler(function(err){",
    "              console.error('Drive保存に失敗', err);",
    "              showResult('送信に失敗しました', true);",
    "              setTimeout(function(){ fallback(); }, 2600);",
    "            })",
    "            .savePdfToDrive({ formId: window.__CAFA_FORM_ID, fileName: fileName, pdfBase64: pdfBase64 });",
    "        }).catch(function(e){",
    "          console.error('PDF読み取りに失敗', e);",
    "          showResult('送信に失敗しました', true);",
    "          setTimeout(function(){ fallback(); }, 2600);",
    "        });",
    "        return;",
    "      } catch(e){",
    "        console.error('クリック処理の差し替えに失敗', e);",
    "        return fallback();",
    "      }",
    "    };",
    "  })();",
    "  (function(){",
    "    var runCount = 0;",
    "    function replaceSaveButtons(){",
    "      try{",
    "        var texts = ['保存（PDFダウンロード）','保存（ダウンロード）','PDFダウンロード','PDFを作成してダウンロード','完成PDF保存'];",
    "        document.querySelectorAll('button').forEach(function(b){",
    "          var t = (b.textContent||'').trim();",
    "          if(!t) return;",
    "          var isMatch = texts.some(function(x){ return t.indexOf(x) >= 0; });",
    "          if(!isMatch && t.indexOf('保存')>=0 && (t.indexOf('PDF')>=0 || t.indexOf('ダウンロード')>=0)) isMatch = true;",
    "          if(isMatch) b.textContent = 'データ送信';",
    "        });",
    "      } catch(e){}",
    "    }",
    "    function runWhenReady(){",
    "      try{",
    "        if(!document.getElementById('cafa-portal-back')){",
    "          var btn = document.createElement('a');",
    "          btn.id = 'cafa-portal-back';",
    "          btn.href = window.__CAFA_PORTAL_URL;",
    "          btn.setAttribute('target', '_top');",
    "          btn.textContent = '← ポータルに戻る';",
    "          btn.style.cssText = 'position:fixed;left:12px;top:12px;z-index:9999;padding:8px 10px;background:#2563eb;color:#fff;border-radius:8px;font-size:12px;text-decoration:none;box-shadow:0 4px 10px rgba(0,0,0,.12);';",
    "          if(document.body) document.body.appendChild(btn);",
    "        }",
    "      } catch(e){}",
    "      replaceSaveButtons();",
    "      runCount++;",
    "      if(runCount === 1) setTimeout(runWhenReady, 100);",
    "    }",
    "    if(document.readyState === 'loading'){",
    "      document.addEventListener('DOMContentLoaded', runWhenReady);",
    "    } else {",
    "      runWhenReady();",
    "    }",
    "    var modalEl = document.getElementById('confirmModal');",
    "    if(modalEl && window.MutationObserver){",
    "      var obs = new MutationObserver(function(mutations){",
    "        if(modalEl.classList && modalEl.classList.contains('active')) replaceSaveButtons();",
    "      });",
    "      obs.observe(modalEl, { attributes: true, attributeFilter: ['class'] });",
    "    }",
    "  })();",
    '})();',
    '</script>',
  ].join('');

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, adapter + '</body>');
  }
  return html + adapter;
}

// ---------------------------
// History (per Google account)
// ---------------------------

const HISTORY = {
  folderName: 'CAFAforHIRANO',
  fileName: 'applicationHistory.json',
  maxRecords: 2000,
};

function _getExecutorEmail() {
  const email = (Session.getEffectiveUser && Session.getEffectiveUser().getEmail && Session.getEffectiveUser().getEmail()) || '';
  if (!email) {
    // Usually happens when the web app is deployed as "execute as me" or outside Workspace domain.
    throw new Error('ユーザーのメールアドレスを取得できません。Webアプリの「実行するユーザー」を「アクセスしているユーザー」に設定してください。');
  }
  return email;
}

function _getOrCreateUserFolder_() {
  // Cache folder id in user properties (per executor).
  const up = PropertiesService.getUserProperties();
  const cachedId = up.getProperty('CAFA_FOLDER_ID');
  if (cachedId) {
    try {
      return DriveApp.getFolderById(cachedId);
    } catch (e) {
      // fall through
    }
  }

  const email = _getExecutorEmail();
  const root = DriveApp.getRootFolder();
  const name = HISTORY.folderName + ' - ' + email;

  const it = root.getFoldersByName(name);
  const folder = it.hasNext() ? it.next() : root.createFolder(name);
  up.setProperty('CAFA_FOLDER_ID', folder.getId());
  return folder;
}

function _getOrCreateHistoryFile_() {
  const folder = _getOrCreateUserFolder_();
  const it = folder.getFilesByName(HISTORY.fileName);
  if (it.hasNext()) return it.next();
  return folder.createFile(HISTORY.fileName, '[]', MimeType.PLAIN_TEXT);
}

function _readHistoryArray_() {
  const file = _getOrCreateHistoryFile_();
  const text = file.getBlob().getDataAsString('utf-8') || '[]';
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function _writeHistoryArray_(arr) {
  const file = _getOrCreateHistoryFile_();
  const out = JSON.stringify(arr);
  file.setContent(out);
}

function _getOrCreatePdfFolder_() {
  const folder = _getOrCreateUserFolder_();
  const it = folder.getFoldersByName('PDF');
  return it.hasNext() ? it.next() : folder.createFolder('PDF');
}

/**
 * Save generated PDF to user's Google Drive.
 * @param {{formId?:string, fileName:string, pdfBase64:string}} payload
 * @returns {{ok:boolean, fileId:string, fileUrl:string}}
 */
function savePdfToDrive(payload) {
  const p = payload || {};
  const fileName = String(p.fileName || '').trim() || ('output_' + new Date().toISOString().replace(/[:.]/g, '-') + '.pdf');
  const b64 = String(p.pdfBase64 || '').trim();
  if (!b64) throw new Error('pdfBase64 が空です。');

  const bytes = Utilities.base64Decode(b64);
  const blob = Utilities.newBlob(bytes, MimeType.PDF, fileName);
  const folder = _getOrCreatePdfFolder_();
  const file = folder.createFile(blob);
  return { ok: true, fileId: file.getId(), fileUrl: file.getUrl() };
}

/**
 * Save one history record for current user.
 * @param {Object} record {id,savedAt,savedDateKey,applicantName,documentName,formSnapshot}
 * @returns {{ok:boolean}}
 */
function saveHistory(record) {
  const rec = record || {};
  if (!rec.id) rec.id = String(new Date().getTime());
  if (!rec.savedAt) rec.savedAt = new Date().toISOString();

  const list = _readHistoryArray_();
  list.push(rec);
  // keep most recent N
  if (list.length > HISTORY.maxRecords) {
    const excess = list.length - HISTORY.maxRecords;
    list.splice(0, excess);
  }
  _writeHistoryArray_(list);
  return { ok: true };
}

/**
 * List history records for current user.
 * @returns {Array}
 */
function listHistory() {
  return _readHistoryArray_();
}

/**
 * Get history record by id.
 * @param {string} id
 * @returns {Object|null}
 */
function getHistoryById(id) {
  const key = String(id || '');
  const list = _readHistoryArray_();
  for (let i = list.length - 1; i >= 0; i--) {
    if (String(list[i] && list[i].id) === key) return list[i];
  }
  return null;
}

