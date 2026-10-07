// 每天由 GitHub Actions 執行:從 Google News 抓房市新聞「標題、來源、日期、連結」,存成 news.json
// 只存標題和連結,不抓文章全文。
import { writeFileSync } from 'node:fs';

const QUERIES = ['台中 房市', '預售屋', '房貸 央行'];
// 正向新聞:建設、交通、優惠、交屋入住等好消息,和一般房市新聞穿插顯示
const GOOD_QUERIES = ['台中 捷運 建設', '台中 重大建設 啟用', '首購 優惠 房貸', '交屋 入住 新家', '台中 公園 綠地 啟用'];
const GOOD_WORDS = /通車|啟用|開幕|完工|動工|落成|新建|建設|捷運|公園|綠地|優惠|補助|減稅|回溫|升溫|成長|增加|提升|利多|好消息|入住|喬遷|圓夢|宜居|幸福|新地標|啟航|亮點/;
const BAD_WORDS = /急凍|冷風|冰|跌|崩|慘|糾紛|違約|斷頭|爛尾|詐|虧|套牢|警訊|危機|衰退|退場|倒閉|停工|事故|火警|死|傷|告|罰|抗議|泡沫|恐慌|下修|縮水|減少|打房|倒|不購|挑客戶|考驗|難|卡關|陷阱|缺失|噴|當心|小心|風險|爭議|拒貸|緊縮|降溫/;
const MAX_ITEMS = 8;
const GOOD_SLOTS = 4; // 8 則裡最多 4 則好消息,一則一般、一則好消息交錯
const MAX_AGE_DAYS = 14;

const rssUrl = q =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:7d')}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;

const decode = s =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
   .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
   .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
   .replace(/&amp;/g, '&').trim();

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : '';
};

export function parseRss(xml) {
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const raw = m[1];
    const source = tag(raw, 'source');
    let title = tag(raw, 'title');
    // Google News 標題結尾會加「 - 來源」,拿掉
    if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
    // 去掉結尾的「| 欄目名稱」,例如「| 房產新訊」
    title = title.replace(/\s*[|｜]\s*[^|｜]{1,14}$/, '').trim();
    const link = tag(raw, 'link');
    const date = new Date(tag(raw, 'pubDate'));
    if (!title || !/^https?:\/\//.test(link) || isNaN(date)) continue;
    items.push({ title, source: source || '新聞', date: date.toISOString(), link });
  }
  return items;
}

// 標題去掉標點空白後比對,避免同一則新聞重複出現
const key = t => t.replace(/[\s\p{P}\p{S}]/gu, '').slice(0, 24);

export const isGood = t => GOOD_WORDS.test(t) && !BAD_WORDS.test(t);

async function fetchAll(queries) {
  const out = [];
  for (const q of queries) {
    try {
      const res = await fetch(rssUrl(q), { headers: { 'User-Agent': 'Mozilla/5.0 (news-bot for my-website)' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      out.push(...parseRss(await res.text()));
    } catch (e) {
      console.error(`抓取「${q}」失敗:`, e.message);
    }
  }
  return out;
}

// 一般新聞與好消息交錯排列:好消息、一般、好消息、一般…(第一則放好消息);好消息不夠就用一般新聞補滿
export function mix(normal, good, max = MAX_ITEMS, goodSlots = GOOD_SLOTS) {
  const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
  const seen = new Set();
  const prep = list => list
    .filter(n => new Date(n.date) >= cutoff)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter(n => { const k = key(n.title); if (seen.has(k)) return false; seen.add(k); return true; });
  // 一般新聞裡本來就是好消息的也算進好消息
  const g = prep([...good.filter(n => isGood(n.title)), ...normal.filter(n => isGood(n.title))]).slice(0, goodSlots).map(n => ({ ...n, good: true }));
  const r = prep(normal);
  const out = [];
  let gi = 0, ri = 0;
  while (out.length < max && (gi < g.length || ri < r.length)) {
    const wantGood = out.length % 2 === 0;
    if (wantGood && gi < g.length) out.push(g[gi++]);
    else if (ri < r.length) out.push(r[ri++]);
    else out.push(g[gi++]);
  }
  return out;
}

async function main() {
  const normal = await fetchAll(QUERIES);
  const good = await fetchAll(GOOD_QUERIES);
  const items = mix(normal, good);

  if (!items.length) {
    console.error('這次沒有抓到新聞,保留原本的 news.json');
    process.exit(0);
  }
  writeFileSync('news.json', JSON.stringify({ updated: new Date().toISOString(), items }, null, 2) + '\n');
  console.log(`已更新 ${items.length} 則新聞`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
