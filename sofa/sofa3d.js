// 家具 3D 檢視＋換色＋連到家具空間配置（共用程式）。
// 每一款家具是一個資料夾（裡面有 model.json 和模型檔），跟這支檔案放在同一層；新增款式不用改這支程式。
// 用法：<div id="sofa3d" data-models="沙發建模-雷內,沙發建模-花瓣"></div> 再載入這支檔案（type="module"）。

// 色票：目前是示意色，拿到實際布樣的色卡後把名稱和色碼換掉就好（各款共用；某一款要用自己的色票，在它的 model.json 加 "colors"）
const COLORS = [
  ['米白', '#dedad4'], ['淺灰', '#b9b8b4'], ['深灰', '#6d6f73'], ['炭黑', '#3a3b3e'],
  ['奶油', '#d9cdb8'], ['淺駝', '#c4b6a7'], ['駝色', '#b8a797'], ['奶茶', '#c9b49a'], ['焦糖', '#a5623c'], ['磚紅', '#9a4a2a'],
  ['乾燥玫瑰', '#cf9a9a'],
  ['芥末黃', '#d49a2e'], ['霧藍', '#7f95a6'], ['海軍藍', '#232b45'], ['墨綠', '#4f6355'],
];
const VIEWER = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.3.1/dist/model-viewer.min.js';

const base = new URL('.', import.meta.url);
const SEAM = 0.86;   // 車線比布色暗一點
const SIZE_MIN = 0.7, SIZE_MAX = 1.4;   // 尺寸最多可以調到原本的幾成（太誇張模型會變形得很怪）
let PRODUCTS = [], saved = {}, CONFIG = null, state = null;                 // 讀進來的款式、每一款的選擇、目前看的那一款
const colorsOf = () => (CONFIG && CONFIG.colors) || COLORS;
const hexOf = name => (colorsOf().find(c => c[0] === name) || colorsOf()[0])[1];
// 讀每個資料夾的 model.json。資料夾名稱寫在 data-models（逗號分隔），位置跟這支檔案同一層
async function loadModels(root) {
  const dirs = (root.dataset.models || '').split(',').map(s => s.trim()).filter(Boolean);
  const got = await Promise.all(dirs.map(async id => {
    const dir = new URL(id + '/', base);
    try { const r = await fetch(new URL('model.json', dir)); if (!r.ok) throw 0; return { ...(await r.json()), id, dir }; } catch { console.warn('sofa3d：讀不到 ' + id + '/model.json'); return null; }
  }));
  PRODUCTS = got.filter(Boolean);
  saved = Object.fromEntries(PRODUCTS.map(p => [p.id, { side: p.side || Object.keys(p.files)[0], bend: p.bend ? p.bend.pick : 0, size: p.size ? { ...p.size } : null, colors: Object.fromEntries(p.parts.map(q => [q.key, q.pick])) }]));
  CONFIG = PRODUCTS[0] || null; state = CONFIG && saved[CONFIG.id];
}
const darker = (hex, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');

const CSS = `
.sofa3d{--s-ink:var(--ink,#1E1914);--s-ink2:var(--ink-2,#6B6259);--s-line:var(--line-2,rgba(40,28,18,.18));--s-surface:var(--surface,#fff);--s-group:var(--group,#ECE8E2);--s-accent:var(--amber,#E3A14B);
  font-family:var(--sans,-apple-system,BlinkMacSystemFont,"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif);color:var(--s-ink);max-width:640px;margin:0 auto}
.sofa3d *{box-sizing:border-box}
.sofa3d .s3-stage{position:relative;border-radius:18px;overflow:hidden;background:radial-gradient(120% 90% at 50% 20%,#fbfaf8 0%,#ebe7e0 100%)}
.sofa3d model-viewer{display:block;width:100%;height:auto;aspect-ratio:4/3;--poster-color:transparent;--progress-bar-color:var(--s-accent)}
.sofa3d .s3-hint{position:absolute;left:12px;bottom:10px;font-size:12px;color:var(--s-ink2);pointer-events:none}
.sofa3d .s3-ar{position:absolute;right:10px;bottom:10px;border:0;border-radius:999px;padding:9px 14px;font:inherit;font-size:13px;font-weight:600;background:var(--s-ink);color:#fff;cursor:pointer}
.sofa3d .s3-head{margin:16px 2px 4px}
.sofa3d .s3-name{font-family:var(--serif-tc,"Noto Serif TC","Songti TC",serif);font-size:22px;font-weight:600;line-height:1.3;margin:0}
.sofa3d .s3-spec{font-size:13px;color:var(--s-ink2);margin:4px 0 0;line-height:1.5}
.sofa3d .s3-row{display:flex;align-items:flex-start;gap:12px;padding:12px 2px;border-top:1px solid var(--line,rgba(40,28,18,.09))}
.sofa3d .s3-row:first-of-type{margin-top:12px}
.sofa3d .s3-lab{flex:0 0 5.2em;font-size:14px;padding-top:7px}
.sofa3d .s3-lab small{display:block;font-size:12px;color:var(--s-ink2);margin-top:1px}
.sofa3d .s3-opts{display:flex;flex-wrap:wrap;gap:8px;flex:1;min-width:0}
.sofa3d .s3-sw{width:34px;height:34px;border-radius:50%;border:1px solid var(--s-line);padding:0;cursor:pointer;position:relative;background:var(--c)}
.sofa3d .s3-sw[aria-pressed=true]{outline:2px solid var(--s-ink);outline-offset:2px}
.sofa3d .s3-seg{border:1px solid var(--s-line);background:var(--s-surface);color:var(--s-ink);border-radius:999px;padding:7px 16px;font:inherit;font-size:14px;cursor:pointer}
.sofa3d .s3-dim{display:flex;align-items:center;gap:6px;font-size:14px}
.sofa3d .s3-dim input{width:4.6em;height:34px;border:1px solid var(--s-line);border-radius:10px;background:var(--s-surface);color:var(--s-ink);font:inherit;font-size:16px;padding:0 8px;text-align:right}
.sofa3d .s3-dim input:focus-visible{outline:2px solid var(--s-accent);outline-offset:1px}
.sofa3d .s3-range{flex:1;min-width:0;height:34px;margin:0;accent-color:var(--s-ink)}
.sofa3d .s3-seg[aria-pressed=true]{background:var(--s-ink);color:#fff;border-color:var(--s-ink)}
.sofa3d button:focus-visible{outline:2px solid var(--s-accent);outline-offset:2px}
.sofa3d .s3-cta{display:block;width:100%;margin-top:14px;border:0;border-radius:14px;padding:14px;font:inherit;font-size:16px;font-weight:600;background:var(--s-ink);color:#fff;cursor:pointer}
.sofa3d .s3-plan{display:block;margin-top:10px;border:1px solid var(--s-line);border-radius:14px;padding:13px;font-size:16px;font-weight:600;text-align:center;text-decoration:none;color:var(--s-ink);background:var(--s-surface)}
.sofa3d .s3-plan:focus-visible{outline:2px solid var(--s-accent);outline-offset:2px}
.sofa3d .s3-note{font-size:12px;color:var(--s-ink2);margin:10px 2px 0;line-height:1.6}
.sofa3d .s3-toast{font-size:13px;color:var(--amber-ink,#8E5A1B);margin:8px 2px 0;min-height:1.4em}
`;

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

async function mount(root, productId) {
  if (!PRODUCTS.length) await loadModels(root);
  if (!CONFIG) { root.textContent = '找不到家具款式：請確認 data-models 寫的資料夾名稱，和資料夾裡的 model.json。'; return; }
  const want = productId || root.dataset.product; if (want && PRODUCTS.some(p => p.id === want)) { CONFIG = PRODUCTS.find(p => p.id === want); state = saved[CONFIG.id]; }
  if (!document.getElementById('sofa3d-css')) { const s = el('style'); s.id = 'sofa3d-css'; s.textContent = CSS; document.head.appendChild(s); }
  if (!customElements.get('model-viewer') && !document.querySelector('script[data-sofa3d-mv]')) {
    const s = el('script'); s.type = 'module'; s.src = VIEWER; s.dataset.sofa3dMv = '1'; document.head.appendChild(s);
  }
  root.classList.add('sofa3d'); root.replaceChildren();

  const stage = el('div', 's3-stage'), mv = el('model-viewer');
  const attrs = { alt: CONFIG.name + ' 3D 模型', 'camera-controls': '', 'touch-action': 'pan-y', 'interaction-prompt': 'none', 'shadow-intensity': '1', 'shadow-softness': '0.9', exposure: '0.55', 'tone-mapping': 'neutral',
    'camera-orbit': '-28deg 70deg auto', 'max-camera-orbit': 'auto 88deg auto', 'min-field-of-view': '12deg', ar: '', 'ar-modes': 'webxr scene-viewer quick-look', 'ar-scale': 'fixed', 'ar-placement': 'floor' };
  for (const [k, v] of Object.entries(attrs)) mv.setAttribute(k, v);
  const ar = el('button', 's3-ar', '放到我家看看'); ar.slot = 'ar-button'; mv.appendChild(ar);
  stage.append(mv, el('div', 's3-hint', '用手指拖曳旋轉・兩指縮放'));

  const head = el('div', 's3-head'); head.append(el('h3', 's3-name', CONFIG.name), el('p', 's3-spec', CONFIG.spec));
  const rows = el('div');

  if (PRODUCTS.length > 1) {                                               // 有兩款以上才出現「款式」這一排
    const row = el('div', 's3-row'), opts = el('div', 's3-opts'); row.append(el('div', 's3-lab', '款式'), opts);
    for (const p of PRODUCTS) {
      const b = el('button', 's3-seg', p.name); b.type = 'button'; b.dataset.product = p.id; b.setAttribute('aria-pressed', p.id === CONFIG.id);
      b.onclick = async () => { if (p.id !== CONFIG.id) { await mount(root, p.id); root.dispatchEvent(new CustomEvent('sofa3d:change', { bubbles: true, detail: choice() })); } };
      opts.appendChild(b);
    }
    rows.appendChild(row);
  }
  const sideRow = el('div', 's3-row'), sideOpts = el('div', 's3-opts');
  sideRow.append(el('div', 's3-lab', CONFIG.sideLabel || '方向'), sideOpts);
  for (const [id, text] of Object.entries(CONFIG.sides || {})) {
    const b = el('button', 's3-seg', text); b.type = 'button'; b.dataset.side = id;
    b.onclick = () => { state.side = id; load(); sync(); emit('change'); };
    sideOpts.appendChild(b);
  }
  if (CONFIG.sides) rows.appendChild(sideRow);                             // 沒有左右之分的家具（例如茶几）不會出現這一排
  if (CONFIG.bend) {                                                       // 這一款可以手動凹（花瓣綻放）才出現拉桿
    const row = el('div', 's3-row'), lab = el('div', 's3-lab', CONFIG.bend.label), cur = el('small'), opts = el('div', 's3-opts'), rg = el('input', 's3-range');
    lab.appendChild(cur); cur.dataset.bend = '1';
    rg.type = 'range'; rg.min = 0; rg.max = 100; rg.step = 1; rg.value = state.bend; rg.id = 'sofa3d-bend'; rg.setAttribute('aria-label', CONFIG.bend.label);
    rg.oninput = () => { state.bend = +rg.value; bend(); sync(); };
    rg.onchange = () => emit('change');
    opts.appendChild(rg); row.append(lab, opts); rows.appendChild(row);
  }

  if (CONFIG.size) {                                                       // 尺寸可以手動調：寬、深、高各一格（公分），模型會跟著拉伸
    const row = el('div', 's3-row'), lab = el('div', 's3-lab', '尺寸'), opts = el('div', 's3-opts'), reset = el('button', 's3-seg', '還原');
    lab.appendChild(el('small', '', '公分'));
    for (const [k, name] of [['w', '寬'], ['d', '深'], ['h', '高']]) {
      const wrap = el('label', 's3-dim'), inp = el('input'), b0 = CONFIG.size[k];
      inp.type = 'number'; inp.inputMode = 'decimal'; inp.step = 1; inp.min = Math.round(b0 * SIZE_MIN); inp.max = Math.round(b0 * SIZE_MAX); inp.value = state.size[k]; inp.id = 'sofa3d-size-' + k; inp.dataset.size = k;
      inp.onchange = () => { const n = Math.min(+inp.max, Math.max(+inp.min, +inp.value || b0)); state.size[k] = n; inp.value = n; resize(); emit('change'); };
      wrap.append(el('span', '', name), inp); opts.appendChild(wrap);
    }
    reset.type = 'button'; reset.onclick = () => { state.size = { ...CONFIG.size }; for (const i of opts.querySelectorAll('input')) i.value = state.size[i.dataset.size]; resize(); emit('change'); };
    opts.appendChild(reset); row.append(lab, opts); rows.appendChild(row);
  }

  for (const part of CONFIG.parts) {
    const row = el('div', 's3-row'), lab = el('div', 's3-lab', part.label), cur = el('small'), opts = el('div', 's3-opts');
    lab.appendChild(cur); cur.dataset.cur = part.key;
    for (const [name, hex] of colorsOf()) {
      const b = el('button', 's3-sw'); b.type = 'button'; b.style.setProperty('--c', hex); b.title = name; b.setAttribute('aria-label', part.label + '：' + name);
      b.dataset.part = part.key; b.dataset.color = name;
      b.onclick = () => { state.colors[part.key] = name; paint(); sync(); emit('change'); };
      opts.appendChild(b);
    }
    row.append(lab, opts); rows.appendChild(row);
  }

  const cta = el('button', 's3-cta', '我喜歡這個配色'); cta.type = 'button';
  const toast = el('div', 's3-toast'); toast.setAttribute('role', 'status');
  cta.onclick = async () => {
    if (!emit('pick')) return;                                            // 網站有接手（preventDefault）就不做預設動作
    try { await navigator.clipboard.writeText(summary()); toast.textContent = '已複製配色內容，可以直接貼上傳送。'; }
    catch { toast.textContent = summary(); }
  };
  root.append(stage, head, rows, cta);
  if (CONFIG.planner) {
    const a = el('a', 's3-plan', '到平面圖擺擺看'); a.href = CONFIG.planner; a.target = '_blank'; a.rel = 'noopener';
    root.appendChild(a);
  }
  root.append(toast, el('p', 's3-note', '螢幕顏色為示意，實際以布樣為準。' + (CONFIG.size ? '調整尺寸是把整體拉伸來示意比例，實際可訂製的尺寸請再確認。' : '') + (CONFIG.planner ? '平面圖會另開「家具空間配置」，沙發已先擺好，可以改成自己家的尺寸。' : '')));

  function load() { const src = new URL(CONFIG.files[state.side], CONFIG.dir).href; if (mv.getAttribute('src') !== src) mv.setAttribute('src', src); }
  function paint() {
    if (!mv.model) return;
    for (const m of mv.model.materials) {
      const key = m.name.replace('_seam', ''); if (!(key in state.colors)) continue;
      const hex = hexOf(state.colors[key]);
      m.pbrMetallicRoughness.setBaseColorFactor(m.name.endsWith('_seam') ? darker(hex, SEAM) : hex);
    }
  }
  function resize() {                                                       // 照輸入的尺寸把模型的寬（x）、高（y）、深（z）各自拉伸
    if (!CONFIG.size || !mv.loaded) return;                                 // 模型載入後才能改比例
    const s = state.size, b = CONFIG.size; mv.setAttribute('scale', `${s.w / b.w} ${s.h / b.h} ${s.d / b.d}`);
    if (mv.updateFraming) Promise.resolve(mv.updateFraming()).catch(() => {});   // 重新對焦；這個版本的檢視器對焦完會丟一個不影響畫面的錯誤，接住不理
  }
  function bend() {                                                         // 模型裡有一段 0→1 秒的動畫 bend：時間 0＝完全綻放、1＝立起來，停在拉桿對應的位置
    if (!CONFIG.bend || !mv.loaded || !(mv.availableAnimations || []).includes('bend')) return;
    const t = Math.min(0.999, 1 - state.bend / 100);                        // 剛好等於結尾會跳回開頭，所以最多到 0.999
    if (mv.dataset.bendSrc !== mv.src) {                                    // 每個模型檔先啟動一次動畫再停住，之後才能指定時間；剛啟動那一刻指定會被吃掉，所以稍後再指定一次
      mv.animationName = 'bend'; mv.play(); mv.pause(); mv.dataset.bendSrc = mv.src;
      setTimeout(() => { mv.currentTime = Math.min(0.999, 1 - state.bend / 100); }, 150);
    }
    mv.currentTime = t;
  }
  function sync() {
    for (const b of root.querySelectorAll('.s3-seg[data-side]')) b.setAttribute('aria-pressed', b.dataset.side === state.side);
    for (const s of root.querySelectorAll('[data-bend]')) s.textContent = state.bend >= 100 ? '完全綻放' : state.bend <= 0 ? '立起來' : state.bend + '%';
    for (const b of root.querySelectorAll('.s3-sw')) b.setAttribute('aria-pressed', state.colors[b.dataset.part] === b.dataset.color);
    for (const s of root.querySelectorAll('[data-cur]')) s.textContent = state.colors[s.dataset.cur];
  }
  function emit(type) { return root.dispatchEvent(new CustomEvent('sofa3d:' + type, { bubbles: true, cancelable: true, detail: choice() })); }
  mv.addEventListener('load', () => { paint(); bend(); resize(); });
  load(); sync();
}

function choice() {
  if (!CONFIG) return null;
  return { id: CONFIG.id, name: CONFIG.name, spec: CONFIG.spec, size: state.size ? { ...state.size } : null, side: CONFIG.sides ? CONFIG.sides[state.side] : '',
    colors: Object.fromEntries(CONFIG.parts.map(p => [p.label, state.colors[p.key]])), text: summary() };
}
function summary() {
  const tags = [CONFIG.sides && CONFIG.sides[state.side], CONFIG.bend && CONFIG.bend.label + ' ' + state.bend + '%'].filter(Boolean);
  const s = state.size, b = CONFIG.size, sized = s && (s.w !== b.w || s.d !== b.d || s.h !== b.h) ? `、尺寸：寬 ${s.w} × 深 ${s.d} × 高 ${s.h} cm` : '';   // 有改過尺寸才寫出來
  return CONFIG.name + (tags.length ? `（${tags.join('、')}）` : '') + sized + CONFIG.parts.map(p => `、${p.label}：${state.colors[p.key]}`).join('');
}

window.Sofa3D = { get: choice, mount };
// 頁面上有 <div id="sofa3d"> 就自動載入；加上 data-lazy 則等網站自己呼叫 Sofa3D.mount(元素)（例如客人點開家具卡時才載入）
const auto = document.getElementById('sofa3d'); if (auto && !('lazy' in auto.dataset)) mount(auto);
