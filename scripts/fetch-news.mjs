// 每天由 GitHub Actions 執行:從 Google News 抓房市新聞「標題、來源、日期、連結」,存成 news.json
// 只存標題和連結,不抓文章全文。
import { writeFileSync } from 'node:fs';

const QUERIES = ['台中 房市', '預售屋', '房貸 央行'];
const MAX_ITEMS = 8;
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

async function main() {
  const all = [];
  for (const q of QUERIES) {
    try {
      const res = await fetch(rssUrl(q), { headers: { 'User-Agent': 'Mozilla/5.0 (news-bot for my-website)' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      all.push(...parseRss(await res.text()));
    } catch (e) {
      console.error(`抓取「${q}」失敗:`, e.message);
    }
  }
  const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
  const seen = new Set();
  const items = all
    .filter(n => new Date(n.date) >= cutoff)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter(n => { const k = key(n.title); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, MAX_ITEMS);

  if (!items.length) {
    console.error('這次沒有抓到新聞,保留原本的 news.json');
    process.exit(0);
  }
  writeFileSync('news.json', JSON.stringify({ updated: new Date().toISOString(), items }, null, 2) + '\n');
  console.log(`已更新 ${items.length} 則新聞`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
