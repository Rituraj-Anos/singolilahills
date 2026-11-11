export function money(amount, currency = '₹') {
  if (amount == null || amount === '') return '';
  return `${currency}${Number(amount).toLocaleString('en-IN')}`;
}

// WhatsApp links need country code + number with digits only. A bare 10-digit Indian number
// (or one with a leading 0) gets 91 added, so owners can type the number the way they say it.
export function waNumber(number) {
  const n = String(number || '').replace(/\D/g, '');
  if (n.length === 10) return `91${n}`;
  if (n.length === 11 && n.startsWith('0')) return `91${n.slice(1)}`;
  return n;
}

export function waLink(number, text) {
  const n = waNumber(number);
  if (!n) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function telLink(phone) {
  const n = String(phone || '').replace(/[^\d+]/g, '');
  return n ? `tel:${n}` : null;
}

export function dateLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// "3,636 m / 11,930 ft" or "2,970 m" -> 3636
export function metres(text) {
  const m = String(text || '').replace(/,/g, '').match(/(\d{2,5})\s*m\b/);
  return m ? Number(m[1]) : null;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<a href="$2">$1</a>');

// Tiny Markdown subset for admin-written text: paragraphs, **bold**, [links](url), "- " lists, "## " headings.
// Input is escaped first, so admin text can never inject HTML.
export function markdown(src) {
  return String(src || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n').filter((l) => l.trim());
      if (/^##\s+/.test(lines[0]) && lines.length === 1) return `<h2>${inline(lines[0].replace(/^##\s+/, ''))}</h2>`;
      // consecutive "- " lines become one list; other runs become one paragraph
      const out = [];
      for (const l of lines) {
        const item = /^\s*[-*]\s+/.test(l);
        const last = out[out.length - 1];
        if (last && last.item === item) last.lines.push(l);
        else out.push({ item, lines: [l] });
      }
      return out
        .map((g) =>
          g.item
            ? `<ul>${g.lines.map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`).join('')}</ul>`
            : `<p>${g.lines.map(inline).join('<br>')}</p>`
        )
        .join('');
    })
    .join('');
}
