const { useState, useEffect, useRef } = React;

/* ---------- PALETTES ---------- */
const PALETTES = {
  vesuvio: {
    name: "Vesuvio",
    bg: "#F5ECDC",
    ink: "#1A1410",
    red: "#E54B2A",
    blue: "#1E5BA8",
    yellow: "#F2C14E",
    terra: "#C97B4F",
    green: "#3A6B4C",
  },
  mare: {
    name: "Mare",
    bg: "#EAF3F4",
    ink: "#0E2433",
    red: "#E85D4A",
    blue: "#2A7DB8",
    yellow: "#F4D35E",
    terra: "#D08C5E",
    green: "#1F6F5C",
  },
  limone: {
    name: "Limone",
    bg: "#FBF3D6",
    ink: "#1F1A0A",
    red: "#D94735",
    blue: "#2D5B9E",
    yellow: "#F1B82C",
    terra: "#B86B3E",
    green: "#3F7A4B",
  },
};

const ITINERARY = [
  {
    id: "gio",
    date: "Giovedì 14 Maggio",
    icon: "🚂",
    accent: "red",
    short: "Arrivo",
    items: [
      { t: "15:00", title: "Doc + Sorella arrivano", body: "Check-in in via Sant'Anna dei Lombardi, sistemate e prime passeggiate nel centro storico.", tags: ["🚶 passeggiata"] },
      { t: "16:00", title: "Paola arriva 🎉", body: "Si comincia davvero! Tutti e tre insieme.", tags: [] },
      { t: "19:00", title: "Napoli Sotterranea 🕳️", body: "Visita guidata nelle gallerie sotterranee della città: acquedotti romani, cunicoli, storia nascosta.", tags: ["🏛 cultura"] },
      { t: "sera", title: "Prima pizza napoletana", body: "Spaccanapoli, orientarsi nel centro, cena in una delle pizzerie storiche del quartiere.", tags: ["🍕 cibo", "🚶 centro storico"] },
    ],
  },
  {
    id: "ven",
    date: "Venerdì 15 Maggio",
    sub: "Giornata piena",
    icon: "☀️",
    accent: "yellow",
    short: "Centro",
    items: [
      { t: "mattina", title: "Centro storico & Cappella Sansevero", body: "Il Cristo Velato è imperdibile. Da prenotare prima! Poi il Duomo e i vicoli dei Decumani.", tags: ["🏛 cultura"] },
      { t: "pranzo", title: "Street food ai Quartieri Spagnoli", body: "Pizza fritta, cuoppo di frittura, sfogliatella calda. Mangiare camminando è d'obbligo.", tags: ["🍕 street food"] },
      { t: "pomeriggio", title: "Quartieri Spagnoli & shopping", body: "Murales di Maradona, negozietti, souvenir. Atmosfera unica.", tags: ["🚶 quartieri", "✨ vibes"] },
      { t: "sera", title: "Aperitivo sul Lungomare", body: "Via Caracciolo al tramonto, poi cena a Chiaia o Mergellina.", tags: ["🌅 tramonto", "🍷 aperitivo"] },
    ],
  },
  {
    id: "sab",
    date: "Sabato 16 Maggio",
    sub: "Mare & relax",
    icon: "🌊",
    accent: "blue",
    short: "Mare",
    items: [
      { t: "mattina", title: "Castel dell'Ovo & Lungomare", body: "Il castello sul mare, la passeggiata da cartolina. Foto obbligatorie.", tags: ["🏰 castello", "🌊 lungomare"] },
      { t: "pranzo", title: "Frittura di pesce a Mergellina", body: "Cuoppo di mare sul porto, gelato di Mergellina per finire.", tags: ["🐟 pesce"] },
      { t: "pomeriggio", title: "Posillipo", body: "Il quartiere panoramico con vista sul Golfo. Parco Virgiliano se volete distendervi.", tags: ["🌿 panorama"] },
      { t: "sera", title: "Cena speciale — ultima notte", body: "Scegliete il posto che vi ha fatto più gola durante il weekend. 🥂", tags: ["🍽 cena", "✨ ultima notte"] },
    ],
  },
  {
    id: "dom",
    date: "Domenica 17 Maggio",
    sub: "Rientro",
    icon: "👋",
    accent: "terra",
    short: "Rientro",
    items: [
      { t: "mattina", title: "Colazione con sfogliatella", body: "Sfogliatella riccia calda e caffè napoletano al bar. Il modo migliore per salutare Napoli.", tags: ["☕ colazione"] },
      { t: "12:15", title: "Si parte 👋", body: "Ci si rivede alla prossima avventura!", tags: [] },
    ],
  },
];

const FOOD = [
  { icon: "🍕", title: "Pizza verace", body: "Da Michele, Sorbillo o Di Matteo — ognuna ha i suoi fan accaniti. Provatene più di una." },
  { icon: "🥐", title: "Sfogliatella riccia", body: "Calda, fragrante, ripiena di ricotta. Antonietta al Vomero o Attanasio alla stazione." },
  { icon: "🍦", title: "Gelato a Mergellina", body: "La passeggiata sul porto con gelato in mano è un classico. Bar Mennella o Chalet Ciro." },
  { icon: "🍟", title: "Cuoppo di frittura", body: "Il cono di carta con frittura mista — pizza fritta, zeppoline, crocchè. Street food al massimo." },
  { icon: "☕", title: "Caffè napoletano", body: "Al bancone, senza fretta. Qui il caffè è una religione. Ogni bar va bene." },
];

const TIPS = [
  { icon: "🎟", title: "Cappella Sansevero", body: "Prenota online con anticipo — si esaurisce in fretta, specialmente il weekend." },
  { icon: "👟", title: "Scarpe comode", body: "Il centro storico è tutto sampietrini e salite. Niente tacchi." },
  { icon: "🚌", title: "Spostamenti", body: "Metro linea 1 è moderna e bella. Altrimenti taxi o a piedi — il centro è compatto." },
  { icon: "📍", title: "Base perfetta", body: "Via Sant'Anna dei Lombardi è nel cuore del centro storico — tutto è raggiungibile a piedi." },
];

/* ---------- FILES — IndexedDB ---------- */
function openFilesDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('napoli-weekend-files', 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbSaveFile(blob, name, desc) {
  const db = await openFilesDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const req = tx.objectStore('files').add({ blob, name, desc, type: blob.type, date: Date.now() });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbGetFiles() {
  const db = await openFilesDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readonly');
    const req = tx.objectStore('files').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbDeleteFile(id) {
  const db = await openFilesDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const req = tx.objectStore('files').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
function fileTypeIcon(type = '') {
  if (type.startsWith('image/')) return '🖼';
  if (type === 'application/pdf') return '📄';
  if (type.includes('word') || type.includes('document')) return '📝';
  if (type.includes('sheet') || type.includes('excel')) return '📊';
  return '📎';
}

/* ---------- Tweaks ---------- */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "vesuvio",
  "showStickers": true,
  "tilt": true
}/*EDITMODE-END*/;

/* ---------- Helpers ---------- */
function Sticker({ children, rot = 0, color, style }) {
  return (
    <span
      className="sticker"
      style={{ "--rot": `${rot}deg`, background: color, ...style }}
    >
      {children}
    </span>
  );
}

function Marquee({ text, color, ink }) {
  const arr = Array(8).fill(text);
  return (
    <div className="marquee" style={{ background: color, color: ink }}>
      <div className="marquee-track">
        {arr.map((t, i) => (
          <span key={i} className="marquee-item">
            {t} <span className="marquee-star">✦</span>
          </span>
        ))}
        {arr.map((t, i) => (
          <span key={`b${i}`} className="marquee-item" aria-hidden>
            {t} <span className="marquee-star">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- HERO ---------- */
function Hero({ p, tilt, stickers }) {
  return (
    <section className="hero" style={{ background: p.bg }}>
      <div className="hero-grid">
        {/* top row */}
        <div className="hero-top">
          <div className="brand">
            <span className="brand-dot" style={{ background: p.red }}></span>
            <span>napoli · weekend</span>
            <span className="brand-dot" style={{ background: p.blue }}></span>
          </div>
          <div className="brand-right">
            <span>maggio · 2026</span>
          </div>
        </div>

        {/* TITLE */}
        <div className="hero-title-wrap">
          <h1 className="hero-title">
            <span className="ht-line" style={{ color: p.red }}>
              Napoli
              {stickers && (
                <Sticker rot={tilt ? -8 : 0} color={p.yellow} style={{ position: "absolute", top: "-0.2em", right: "-0.6em", fontSize: "0.22em" }}>
                  🌋
                </Sticker>
              )}
            </span>
            <span className="ht-line ht-line-2" style={{ color: p.ink }}>
              Weekend
            </span>
          </h1>
          <div className="hero-dates" style={{ color: p.ink }}>
            <span className="dates-big">14 — 17</span>
            <span className="dates-month">Maggio<br/>2026</span>
          </div>
        </div>

        {/* meta row */}
        <div className="hero-meta">
          <div className="meta-card" style={{ background: p.red, color: p.bg, transform: tilt ? "rotate(-1.5deg)" : "none" }}>
            <span className="meta-eyebrow">le tre</span>
            <div className="meta-row">
              <span>👧</span><span>Doc</span>
            </div>
            <div className="meta-row">
              <span>👧</span><span>Sara</span>
            </div>
            <div className="meta-row">
              <span>👧</span><span>Paola</span>
            </div>
          </div>

          <div className="meta-card" style={{ background: p.bg, color: p.ink, border: `2px solid ${p.ink}`, transform: tilt ? "rotate(1deg)" : "none" }}>
            <span className="meta-eyebrow" style={{ color: p.ink }}>📍 base</span>
            <div className="meta-big">Via Sant'Anna<br/>dei Lombardi 40</div>
            <div className="meta-foot">centro storico</div>
          </div>

          <div className="meta-card stack" style={{ background: p.blue, color: p.bg, transform: tilt ? "rotate(-1deg)" : "none" }}>
            <div className="big-num">4</div>
            <div className="big-label">giorni · 3 notti</div>
            <div className="meta-foot" style={{ color: p.yellow }}>🍕 napoli</div>
          </div>
        </div>
      </div>

      {/* decorative blobs */}
      <div className="blob blob-1" style={{ background: p.yellow }} aria-hidden></div>
      <div className="blob blob-2" style={{ background: p.green }} aria-hidden></div>
    </section>
  );
}

/* ---------- ITINERARY ---------- */
function Itinerary({ p, tilt }) {
  const [active, setActive] = useState(0);
  const day = ITINERARY[active];
  const accentColor = p[day.accent];

  return (
    <section className="itin" style={{ background: p.bg, color: p.ink }}>
      <div className="section-head">
        <div className="section-num" style={{ color: accentColor }}>01</div>
        <h2 className="section-title">
          <span style={{ background: p.ink, color: p.bg }}>Itinerario</span>
        </h2>
        <p className="section-sub">quattro giorni, una sola fame</p>
      </div>

      <div className="day-tabs">
        {ITINERARY.map((d, i) => (
          <button
            key={d.id}
            className={`day-tab ${i === active ? "is-active" : ""}`}
            onClick={() => setActive(i)}
            style={{
              "--accent": p[d.accent],
              "--ink": p.ink,
              "--bg": p.bg,
              transform: tilt ? `rotate(${(i - 1.5) * 1.2}deg)` : "none",
            }}
          >
            <span className="dt-icon">{d.icon}</span>
            <span className="dt-day">{d.date.split(" ")[0]}</span>
            <span className="dt-date">{d.date.split(" ").slice(1).join(" ")}</span>
            <span className="dt-pin">{d.short}</span>
          </button>
        ))}
      </div>

      <div className="day-content" key={day.id}>
        <div className="day-header" style={{ borderColor: p.ink }}>
          <div className="day-emoji" style={{ background: accentColor, color: p.bg }}>
            {day.icon}
          </div>
          <div>
            <div className="day-title">{day.date}</div>
            {day.sub && <div className="day-sub">— {day.sub}</div>}
          </div>
        </div>

        <div className="timeline">
          {day.items.map((it, i) => (
            <div className="t-row" key={i}>
              <div className="t-time" style={{ color: accentColor }}>{it.t}</div>
              <div className="t-dot-wrap">
                <div className="t-line" style={{ background: p.ink }}></div>
                <div className="t-dot" style={{ background: accentColor, borderColor: p.ink }}></div>
              </div>
              <div className="t-body">
                <h3 className="t-title">{it.title}</h3>
                <p className="t-text">{it.body}</p>
                {it.tags.length > 0 && (
                  <div className="t-tags">
                    {it.tags.map((tag, j) => (
                      <span key={j} className="t-tag" style={{ borderColor: p.ink }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- FOOD ---------- */
function FoodSection({ p, tilt }) {
  const colors = [p.red, p.yellow, p.blue, p.terra, p.green];
  return (
    <section className="food" style={{ background: p.ink, color: p.bg }}>
      <div className="section-head dark">
        <div className="section-num" style={{ color: p.yellow }}>02</div>
        <h2 className="section-title">
          <span style={{ background: p.yellow, color: p.ink }}>Da mangiare</span>
          <br />
          <span style={{ color: p.bg, fontStyle: "italic" }}>assolutamente</span>
        </h2>
        <p className="section-sub" style={{ color: p.bg, opacity: 0.7 }}>fame da dichiarazione di guerra</p>
      </div>

      <div className="food-grid">
        {FOOD.map((f, i) => (
          <div
            key={i}
            className="food-card"
            style={{
              "--c": colors[i % colors.length],
              transform: tilt ? `rotate(${(i % 2 === 0 ? -1 : 1) * 1.5}deg)` : "none",
            }}
          >
            <div className="food-icon" style={{ background: colors[i % colors.length], color: p.ink }}>
              <span>{f.icon}</span>
            </div>
            <h3 className="food-title">{f.title}</h3>
            <p className="food-body">{f.body}</p>
            <div className="food-num">0{i + 1}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- TIPS ---------- */
function TipsSection({ p, tilt }) {
  return (
    <section className="tips" style={{ background: p.bg, color: p.ink }}>
      <div className="section-head">
        <div className="section-num" style={{ color: p.blue }}>03</div>
        <h2 className="section-title">
          <span style={{ background: p.blue, color: p.bg }}>Tips</span>{" "}
          <span style={{ fontStyle: "italic" }}>pratici</span>
        </h2>
        <p className="section-sub">prima di partire, leggete questo</p>
      </div>

      <div className="tips-grid">
        {TIPS.map((t, i) => (
          <div key={i} className="tip-card" style={{ borderColor: p.ink, transform: tilt ? `rotate(${(i % 2 === 0 ? -0.6 : 0.6)}deg)` : "none" }}>
            <div className="tip-head">
              <span className="tip-icon" style={{ background: p.yellow }}>{t.icon}</span>
              <span className="tip-num">N° 0{i + 1}</span>
            </div>
            <h3 className="tip-title">{t.title}</h3>
            <p className="tip-body">{t.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- FILES ---------- */
function FilesSection({ p, tilt }) {
  const [files, setFiles] = useState([]);
  const [pending, setPending] = useState(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { loadFiles(); }, []);

  async function loadFiles() {
    try { setFiles((await dbGetFiles()).reverse()); } catch (e) {}
  }

  function pickFile(file) {
    if (!file) return;
    setPending(file);
    setName(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    setDesc('');
  }

  async function confirmUpload() {
    if (!pending || !name.trim()) return;
    try {
      await dbSaveFile(pending, name.trim(), desc.trim());
      setPending(null);
      loadFiles();
    } catch (e) {}
  }

  async function removeFile(id, e) {
    e.stopPropagation();
    await dbDeleteFile(id);
    loadFiles();
  }

  function openFile(f) {
    const url = URL.createObjectURL(f.blob);
    if (f.blob.type.startsWith('image/') || f.blob.type === 'application/pdf') {
      window.open(url, '_blank');
    } else {
      const a = document.createElement('a');
      a.href = url; a.download = f.name; a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  return (
    <section className="files" style={{ background: p.bg, color: p.ink }}>
      <div className="section-head">
        <div className="section-num" style={{ color: p.terra }}>04</div>
        <h2 className="section-title">
          <span style={{ background: p.terra, color: p.bg }}>File</span>{' '}
          <span style={{ fontStyle: 'italic' }}>utili</span>
        </h2>
        <p className="section-sub">biglietti, prenotazioni, documenti</p>
      </div>

      <div
        className={`upload-zone${dragging ? ' is-dragging' : ''}`}
        style={{ borderColor: dragging ? p.terra : p.ink }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={(e) => pickFile(e.target.files[0])} />
        <span className="upload-plus" style={{ background: p.terra, color: p.bg }}>+</span>
        <span className="upload-label">Trascina un file o tocca per scegliere</span>
        <span className="upload-sub">Biglietti PDF, foto, qualsiasi cosa</span>
      </div>

      {files.length > 0 && (
        <div className="files-grid">
          {files.map((f, i) => (
            <div
              key={f.id}
              className="file-card"
              style={{ borderColor: p.ink, transform: tilt ? `rotate(${i % 2 === 0 ? -0.5 : 0.5}deg)` : 'none' }}
              onClick={() => openFile(f)}
            >
              <div className="file-icon" style={{ background: p.terra, color: p.bg }}>{fileTypeIcon(f.type)}</div>
              <div className="file-info">
                <div className="file-title">{f.name}</div>
                {f.desc && <div className="file-desc">{f.desc}</div>}
              </div>
              <button className="file-del" style={{ color: p.ink }} onClick={(e) => removeFile(f.id, e)} aria-label="Rimuovi">✕</button>
            </div>
          ))}
        </div>
      )}

      {pending && (
        <div className="modal-overlay" onClick={() => setPending(null)}>
          <div className="modal" style={{ background: p.bg, color: p.ink, borderColor: p.ink }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon" style={{ background: p.terra, color: p.bg }}>{fileTypeIcon(pending.type)}</div>
            <div className="modal-filename">{pending.name}</div>
            <input
              className="modal-input"
              style={{ borderColor: p.ink, color: p.ink, background: 'transparent' }}
              placeholder="Nome del file (es. Biglietto treno)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && confirmUpload()}
            />
            <input
              className="modal-input"
              style={{ borderColor: p.ink, color: p.ink, background: 'transparent' }}
              placeholder="Note opzionali (es. Venerdì 15, ore 10:30)"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmUpload()}
            />
            <div className="modal-actions">
              <button className="modal-cancel" style={{ borderColor: p.ink, color: p.ink }} onClick={() => setPending(null)}>Annulla</button>
              <button className="modal-confirm" style={{ background: p.terra, color: p.bg }} onClick={confirmUpload} disabled={!name.trim()}>Salva</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- FOOTER ---------- */
function Footer({ p }) {
  return (
    <footer className="footer" style={{ background: p.red, color: p.bg }}>
      <div className="footer-stamp" style={{ borderColor: p.bg }}>
        <div className="stamp-top">CON · AMORE</div>
        <div className="stamp-big">🍕</div>
        <div className="stamp-bot">E · FAME</div>
      </div>
      <div className="footer-text">
        <div className="footer-line">Napoli</div>
        <div className="footer-line italic">maggio 2026</div>
      </div>
      <div className="footer-meta" style={{ color: p.yellow }}>
        🌋 fatto con amore (e fame) 🌋
      </div>
    </footer>
  );
}

/* ---------- APP ---------- */
function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const p = PALETTES[tweaks.palette] || PALETTES.vesuvio;

  return (
    <div className="page" style={{ background: p.bg, color: p.ink, "--ink": p.ink, "--bg": p.bg, "--red": p.red, "--blue": p.blue, "--yellow": p.yellow, "--terra": p.terra, "--green": p.green }}>
      <Hero p={p} tilt={tweaks.tilt} stickers={tweaks.showStickers} />
      <Marquee text="napoli · weekend · 14—17 maggio · doc · sara · paola · pizza · sfogliatella · mare" color={p.yellow} ink={p.ink} />
      <Itinerary p={p} tilt={tweaks.tilt} />
      <Marquee text="fame · vista · sole · sampietrini · mare · caffè · sfogliatella · vesuvio" color={p.blue} ink={p.bg} />
      <FoodSection p={p} tilt={tweaks.tilt} />
      <TipsSection p={p} tilt={tweaks.tilt} />
      <FilesSection p={p} tilt={tweaks.tilt} />
      <Footer p={p} />

      <TweaksPanel title="Tweaks">
        <TweakSection title="Palette">
          <TweakRadio
            label="Colori"
            value={tweaks.palette}
            onChange={(v) => setTweak("palette", v)}
            options={[
              { value: "vesuvio", label: "Vesuvio" },
              { value: "mare", label: "Mare" },
              { value: "limone", label: "Limone" },
            ]}
          />
        </TweakSection>
        <TweakSection title="Stile">
          <TweakToggle
            label="Inclinazioni giocose"
            value={tweaks.tilt}
            onChange={(v) => setTweak("tilt", v)}
          />
          <TweakToggle
            label="Stickers decorativi"
            value={tweaks.showStickers}
            onChange={(v) => setTweak("showStickers", v)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
