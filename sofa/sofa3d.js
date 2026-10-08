// 雷內沙發 3D 檢視＋換色＋連到家具空間配置。用法：<div id="sofa3d"></div> 再載入這支檔案（type="module"）。
// 要改的東西都在下面這一段，其他不用動。

const CONFIG = {
  name: '雷內沙發',
  spec: '寬 308 × 貴妃深 150 cm・座高 40 cm・貓抓布',
  files: { left: 'rene-left.glb', right: 'rene-right.glb' },   // 貴妃在左／在右（面對沙發看）
  side: 'left',
  // 可以換色的三個部位：key 對應模型裡的材質名稱，不要改；pick 是一打開的預設顏色
  parts: [
    { key: 'main', label: '主座', pick: '米白' },
    { key: 'chaise', label: '圓貴妃', pick: '深灰' },
    { key: 'pillow', label: '圓抱枕', pick: '芥末黃' },
  ],
  // 色票：目前是示意色，拿到實際布樣的色卡後把名稱和色碼換掉就好
  colors: [
    ['米白', '#dedad4'], ['淺灰', '#b9b8b4'], ['深灰', '#6d6f73'], ['炭黑', '#3a3b3e'],
    ['奶茶', '#c9b49a'], ['焦糖', '#a8703f'], ['芥末黃', '#d49a2e'], ['霧藍', '#7f95a6'], ['墨綠', '#4f6355'],
  ],
  // 「到平面圖擺擺看」：開啟家具空間配置系統，沙發已經擺在空間裡（預設配色）。不要這顆按鈕就改成 ''
  planner: 'https://andytsai-000.github.io/furniture-planner/?openExternalBrowser=1#FP25HjNSiJG6qb8B80DJ1tDgdIAc4iLLX4bN8cRukmVFa4pFOKlV1QVLGO5aKm0FPSbRZ5qbpQq3Wih3DFxd5UUXx4IDTp7yqzfREuEEjeyJXBgE7Hhz99IensbA63LGucRV1v5FfPW4gax8oAEy1dNi947Rk5zZLqyFkU8M5HwOyxoZEp70gdJWrgfKZAFSjp5FkmrvY0LhdrSAzGTK92gXbw9V0wq6w5f0GbCKdsI3hTmRntazc5azyUNoOPyzKOkwWmRLTjd0LjozB1wKqX88lGNDeVJyT5L3WbxJKWEnGVJiVsIT2ZxFMmQH91H1WzDm2eUBwCaz01ypF1EleO5fE1KasZKochaJQDD0PzxEVOEI39TqwBBWZLt37Mlc5WZ12sFxNxdsInzFQV0KelUsWv6ZXOrum9joyEbGQ2yyJJJH9SxAgWuipMGBhGcq92UdXa6O3JeaQ2MyTBLT',
  viewer: 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.3.1/dist/model-viewer.min.js',
};

const base = new URL('.', import.meta.url);
const SEAM = 0.86;   // 車線比布色暗一點
const state = { side: CONFIG.side, colors: Object.fromEntries(CONFIG.parts.map(p => [p.key, p.pick])) };
const hexOf = name => (CONFIG.colors.find(c => c[0] === name) || CONFIG.colors[0])[1];
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
.sofa3d .s3-seg[aria-pressed=true]{background:var(--s-ink);color:#fff;border-color:var(--s-ink)}
.sofa3d button:focus-visible{outline:2px solid var(--s-accent);outline-offset:2px}
.sofa3d .s3-cta{display:block;width:100%;margin-top:14px;border:0;border-radius:14px;padding:14px;font:inherit;font-size:16px;font-weight:600;background:var(--s-ink);color:#fff;cursor:pointer}
.sofa3d .s3-plan{display:block;margin-top:10px;border:1px solid var(--s-line);border-radius:14px;padding:13px;font-size:16px;font-weight:600;text-align:center;text-decoration:none;color:var(--s-ink);background:var(--s-surface)}
.sofa3d .s3-plan:focus-visible{outline:2px solid var(--s-accent);outline-offset:2px}
.sofa3d .s3-note{font-size:12px;color:var(--s-ink2);margin:10px 2px 0;line-height:1.6}
.sofa3d .s3-toast{font-size:13px;color:var(--amber-ink,#8E5A1B);margin:8px 2px 0;min-height:1.4em}
`;

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

function mount(root) {
  if (!document.getElementById('sofa3d-css')) { const s = el('style'); s.id = 'sofa3d-css'; s.textContent = CSS; document.head.appendChild(s); }
  if (!customElements.get('model-viewer') && !document.querySelector('script[data-sofa3d-mv]')) {
    const s = el('script'); s.type = 'module'; s.src = CONFIG.viewer; s.dataset.sofa3dMv = '1'; document.head.appendChild(s);
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

  const sideRow = el('div', 's3-row'), sideOpts = el('div', 's3-opts');
  sideRow.append(el('div', 's3-lab', '貴妃方向'), sideOpts);
  for (const [id, text] of [['left', '貴妃在左'], ['right', '貴妃在右']]) {
    const b = el('button', 's3-seg', text); b.type = 'button'; b.dataset.side = id;
    b.onclick = () => { state.side = id; load(); sync(); emit('change'); };
    sideOpts.appendChild(b);
  }
  rows.appendChild(sideRow);

  for (const part of CONFIG.parts) {
    const row = el('div', 's3-row'), lab = el('div', 's3-lab', part.label), cur = el('small'), opts = el('div', 's3-opts');
    lab.appendChild(cur); cur.dataset.cur = part.key;
    for (const [name, hex] of CONFIG.colors) {
      const b = el('button', 's3-sw'); b.type = 'button'; b.style.setProperty('--c', hex); b.title = name; b.setAttribute('aria-label', part.label + '：' + name);
      b.dataset.part = part.key; b.dataset.color = name;
      b.onclick = () => { state.colors[part.key] = name; paint(); sync(); emit('change'); };
      opts.appendChild(b);
    }
    row.append(lab, opts); rows.appendChild(row);
  }

  const cta = el('button', 's3-cta', '我喜歡這個配色，告訴主任'); cta.type = 'button';
  const toast = el('div', 's3-toast'); toast.setAttribute('role', 'status');
  cta.onclick = async () => {
    if (!emit('pick')) return;                                            // 網站有接手（preventDefault）就不做預設動作
    try { await navigator.clipboard.writeText(summary()); toast.textContent = '已複製配色內容，可以直接貼給主任。'; }
    catch { toast.textContent = summary(); }
  };
  root.append(stage, head, rows, cta);
  if (CONFIG.planner) {
    const a = el('a', 's3-plan', '到平面圖擺擺看'); a.href = CONFIG.planner; a.target = '_blank'; a.rel = 'noopener';
    root.appendChild(a);
  }
  root.append(toast, el('p', 's3-note', '螢幕顏色為示意，實際以布樣為準。' + (CONFIG.planner ? '平面圖會另開「家具空間配置」，沙發已先擺好，可以改成自己家的尺寸。' : '')));

  function load() { const src = new URL(CONFIG.files[state.side], base).href; if (mv.getAttribute('src') !== src) mv.setAttribute('src', src); }
  function paint() {
    if (!mv.model) return;
    for (const m of mv.model.materials) {
      const key = m.name.replace('_seam', ''); if (!(key in state.colors)) continue;
      const hex = hexOf(state.colors[key]);
      m.pbrMetallicRoughness.setBaseColorFactor(m.name.endsWith('_seam') ? darker(hex, SEAM) : hex);
    }
  }
  function sync() {
    for (const b of root.querySelectorAll('.s3-seg')) b.setAttribute('aria-pressed', b.dataset.side === state.side);
    for (const b of root.querySelectorAll('.s3-sw')) b.setAttribute('aria-pressed', state.colors[b.dataset.part] === b.dataset.color);
    for (const s of root.querySelectorAll('[data-cur]')) s.textContent = state.colors[s.dataset.cur];
  }
  function emit(type) { return root.dispatchEvent(new CustomEvent('sofa3d:' + type, { bubbles: true, cancelable: true, detail: choice() })); }
  mv.addEventListener('load', paint);
  load(); sync();
}

function choice() {
  return { name: CONFIG.name, spec: CONFIG.spec, side: state.side === 'left' ? '貴妃在左' : '貴妃在右',
    colors: Object.fromEntries(CONFIG.parts.map(p => [p.label, state.colors[p.key]])), text: summary() };
}
function summary() {
  return `${CONFIG.name}（${state.side === 'left' ? '貴妃在左' : '貴妃在右'}）` + CONFIG.parts.map(p => `、${p.label}：${state.colors[p.key]}`).join('');
}

window.Sofa3D = { get: choice, mount };
// 頁面上有 <div id="sofa3d"> 就自動載入；加上 data-lazy 則等網站自己呼叫 Sofa3D.mount(元素)（例如客人點開家具卡時才載入）
const auto = document.getElementById('sofa3d'); if (auto && !('lazy' in auto.dataset)) mount(auto);
