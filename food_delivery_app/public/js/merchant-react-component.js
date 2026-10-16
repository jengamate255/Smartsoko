import { useState, useEffect } from 'react';

/* ================= Data ================= */

// Floating decoration styles are injected via inline style tag
// Circles are placed at the top of the merchant page for ambiance

const PATTERNS = [
  { id: 'sunset',   colors: ['#FBF0DC', '#F0501C', '#7A2A16'] },
  { id: 'kifalme',  colors: ['#FBF0DC', '#C89430', '#1F4E3D'] },
  { id: 'msitu',    colors: ['#F4ECD8', '#1F7A4C', '#163523'] },
  { id: 'zambarau', colors: ['#FBF0DC', '#8B1E3F', '#3D1020'] },
  { id: 'bahari',   colors: ['#F1E9DC', '#1F5C7A', '#0D2E3D'] },
];

const NAV = [
  { key: 'overview', label: 'Muhtasari', icon: 'LayoutGrid' },
  { key: 'products', label: 'Bidhaa', icon: 'Package' },
  { key: 'orders', label: 'Maagizo', icon: 'ShoppingBag' },
  { key: 'wallet', label: 'Mkoba', icon: 'Wallet' },
  { key: 'chat', label: 'Ujumbe', icon: 'MessageCircle' },
  { key: 'settings', label: 'Mipangilio', icon: 'Settings' },
];

const STATS = [
  { label: 'Mauzo ya Leo', value: 'TSh 486,200', delta: '+18.4%', up: true },
  { label: 'Maagizo Mapya', value: '27', delta: '+6', up: true },
  { label: 'Tathmini ya Duka', value: '4.9', delta: '+0.1', up: true },
  { label: 'Kiwango cha Kurejesha', value: '1.2%', delta: '-0.3%', up: false },
];

const ORDERS = [
  { id: '#SS-88214', buyer: 'Fatuma R.', item: 'Kitenge cha Ankara — Yadi 6', qty: 2, total: 90000, status: 'Inasubiri', variant: 0 },
  { id: '#SS-88209', buyer: 'John M.', item: 'Ankara Asili — Kijani Msitu', qty: 1, total: 41500, status: 'Kusafirishwa', variant: 2 },
  { id: '#SS-88198', buyer: 'Amina S.', item: 'Kanga Mbili — Seti Kamili', qty: 3, total: 87000, status: 'Imekamilika', variant: 4 },
  { id: '#SS-88183', buyer: 'Peter K.', item: 'Batiki ya Kisasa — Pwani', qty: 1, total: 47500, status: 'Imekamilika', variant: 3 },
];

const STATUS_STYLE = {
  'Inasubiri': { bg: '#FDE6DC', fg: '#B23C15' },
  'Kusafirishwa': { bg: '#FDF6E7', fg: '#8A6412' },
  'Imekamilika': { bg: '#E1F3E8', fg: '#1F7A4C' },
};

const PRODUCTS = [
  { name: 'Kitenge cha Ankara Premium (Yadi 6)', price: 45000, stock: 23, sold: 2847, rating: 4.8, variant: 0, live: true },
  { name: 'Ankara Asili — Kijani Msitu', price: 41500, stock: 41, sold: 1290, rating: 4.9, variant: 2, live: true },
  { name: 'Kanga Mbili — Seti Kamili', price: 29000, stock: 8, sold: 3120, rating: 4.8, variant: 4, live: true },
  { name: 'Vazi la Kitenge Lililoshonwa', price: 55000, stock: 0, sold: 640, rating: 4.6, variant: 1, live: false },
  { name: 'Batiki ya Kisasa — Mchoro wa Pwani', price: 47500, stock: 17, sold: 802, rating: 4.5, variant: 3, live: true },
];

const HEX = {
  ink: '#241811', inkSoft: '#8A7A6B', gold: '#C89430',
  clay: '#9C4A2C', deal: '#F0501C', success: '#1F7A4C', border: '#EEE1CB',
};

function money(n) {
  return 'TSh ' + n.toLocaleString('en-US');
}

/* ================= Pieces ================= */

function FabricPattern({ colors, uid }) {
  const pid = `pat-${uid}`;
  // Use a stable ID based on colors to avoid duplicates
  const colorKey = colors.join('-');
  const safePid = `pat-${uid}-${colorKey.replace(/\s+/g, '-')}`;
  return (`
    <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="${safePid}" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(14)">
          <rect width="26" height="26" fill="${colors[0]}" />
          <circle cx="6.5" cy="6.5" r="3.6" fill="${colors[1]}" />
          <circle cx="19.5" cy="19.5" r="3.6" fill="${colors[1]}" />
          <path d="M13 0 L26 13 L13 26 L0 13 Z" fill="${colors[2]}" opacity="0.5" />
          <circle cx="19.5" cy="6.5" r="1.8" fill="${colors[2]}" />
          <circle cx="6.5" cy="19.5" r="1.8" fill="${colors[2]}" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#${safePid})" />
    </svg>
  `);
}

function StockBar({ stock, maxStock = 50 }) {
  const pct = Math.min(100, (stock / maxStock) * 100);
  const color = stock === 0 ? HEX.deal : stock < 15 ? HEX.gold : HEX.success;
  return (
    `<div class="w-full h-1.5 rounded-full overflow-hidden" style="background: var(--border)">
      <div class="h-full rounded-full" style="width: ${pct}%; background: ${color}" />
    </div>`
  );
}

/* ================= Main ================= */

export default function SmartSokoMerchantPage() {
  const [active, setActive] = useState('overview');
  const [orderFilter, setOrderFilter] = useState('Zote');
  const [selected, setSelected] = useState(new Set());
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  const filteredOrders = orderFilter === 'Zote' ? ORDERS : ORDERS.filter((o) => o.status === orderFilter);

  const toggleSelect = (id) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const activeLabel = NAV.find((n) => n.key === active)?.label ?? 'Muhtasari';

  return (
<div className="min-h-screen font-brand relative" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        :root {
          --bg: #FFFCF6; --surface: #FFFFFF; --surface-alt: #FBF3E5;
          --ink: #241811; --ink-soft: #8A7A6B; --gold: #C89430; --clay: #9C4A2C;
          --deal: #F0501C; --deal-soft: #FDE6DC; --success: #1F7A4C; --border: #EEE1CB;
        }
        .font-brand { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-display { font-family: 'Sora', sans-serif; }
        .ss-tabular { font-variant-numeric: tabular-nums; }
        .ss-btn-primary {
          background: linear-gradient(135deg, #F0682C 0%, #F0501C 55%, #C43A12 100%);
          color: #fff; box-shadow: 0 10px 22px -10px rgba(240,80,28,0.6);
          transition: filter .15s ease, transform .15s ease;
        }
        .ss-btn-primary:hover { filter: brightness(1.05); transform: translateY(-1px); }
        .ss-navitem { transition: background-color .15s ease, color .15s ease; color: var(--ink-soft); }
        .ss-navitem:hover { background: var(--surface-alt); color: var(--ink); }
        .ss-navitem-active { background: var(--deal-soft) !important; color: #B23C15 !important; font-weight: 700; }
        .ss-row:hover { background: var(--surface-alt); }
        .ss-toast { animation: ss-toast-in .25s ease forwards; }
        @keyframes ss-toast-in {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .ss-pulse { animation: ss-pulse-op 2s ease-in-out infinite; }
        @keyframes ss-pulse-op { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
        button { cursor: pointer; }
        button:focus-visible, [tabindex]:focus-visible { outline: 2.5px solid var(--clay); outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          .ss-toast, .ss-pulse, .ss-btn-primary, .ss-navitem { animation: none !important; transition: none !important; }
        }
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        /* Floating decoration circles */
        .deco-circle-1 {
          position: fixed;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: var(--gold);
          opacity: 0.3;
          top: -100px;
          right: -100px;
          animation: float 10s ease-in-out infinite;
          pointer-events: none;
          z-index: 0;
        }
        .deco-circle-2 {
          position: fixed;
          width: 150px;
          height: 150px;
          border-radius: 50%;
          background: var(--deal);
          opacity: 0.2;
          bottom: -75px;
          left: -75px;
          animation: float-slow 12s ease-in-out infinite;
          pointer-events: none;
          z-index: 0;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-30px); }
        }
      `}</style>
      <div className="deco-circle-1" />
      <div className="deco-circle-2" />

      {/* header */}
      <header className="sticky top-0 z-30 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-6">
          <button className="lg:hidden p-2 -ml-2 rounded-lg" onClick={() => setNavOpen((o) => !o)} aria-label="Menyu">
            <LayoutGrid size={20} color={HEX.ink} />
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0" style={{ boxShadow: '0 0 0 2px var(--surface), 0 0 0 3.5px var(--gold)' }}>
              <FabricPattern colors={PATTERNS[1].colors} uid="logo" />
            </div>
            <span className="font-display font-extrabold text-lg tracking-tight hidden xs:inline">
              Smart<span style={{ color: 'var(--deal)' }}>Soko</span>
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full hidden sm:inline" style={{ background: 'var(--surface-alt)', color: 'var(--ink-soft)', border: '1px solid var(--border)' }}>
              Kituo cha Muuzaji
            </span>
          </div>
          <div className="flex-1 hidden md:flex items-center gap-2 rounded-full px-4 py-2 max-w-md" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
            <Search size={16} color={HEX.inkSoft} />
            <input readOnly placeholder="Tafuta bidhaa, agizo, mnunuzi..." className="bg-transparent outline-none text-sm flex-1" style={{ color: 'var(--ink)' }} />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2.5 ml-auto shrink-0">
            <button className="p-2 rounded-full hover:bg-black/5 relative" aria-label="Arifa">
              <Bell size={19} color={HEX.ink} />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ss-pulse" style={{ background: 'var(--deal)' }} />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm text-white shrink-0" style={{ background: 'linear-gradient(135deg, var(--gold), var(--clay))' }}>
              M
            </div>
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* sidebar */}
        <aside className={`w-60 shrink-0 border-r px-3 py-5 flex-col gap-1 lg:flex ${navOpen ? 'flex' : 'hidden'} lg:sticky lg:top-[57px] lg:h-[calc(100vh-57px)]`} style={{ borderColor: 'var(--border)' }}>
          <div className="rounded-xl p-3.5 mb-4 flex items-center gap-3" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, var(--gold), var(--clay))' }}>
              M
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>Mama Neema Store</span>
                <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
                  <Star size={11} fill={HEX.gold} color={HEX.gold} /> 4.9 · Kariakoo
                </div>
              </div>
            </div>
          </div>
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => { setActive(n.key); setNavOpen(false); }}
              className={`ss-navitem flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left ${active === n.key ? 'ss-navitem-active' : ''}`}
            >
              <n.icon size={17} />
              {n.label}
            </button>
          ))}
          <div className="mt-auto pt-4 hidden lg:block">
            <div className="rounded-xl p-3.5 text-xs" style={{ background: 'var(--surface-alt)', border: '1px dashed var(--gold)', color: 'var(--ink)' }}>
              <div className="font-bold mb-1">Kiwango cha Duka: Dhahabu</div>
              <div style={{ color: 'var(--ink-soft)' }}>Uza TSh 200,000 zaidi mwezi huu kufikia Almasi.</div>
            </div>
          </div>
        </aside>

        {/* content */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="font-display font-bold text-xl sm:text-2xl" style={{ color: 'var(--ink)' }}>{activeLabel}</h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--ink-soft)' }}>Karibu tena, Mama Neema. Hivi ndivyo duka lako linavyoendelea leo.</p>
            </div>
            <button onClick={() => setToast('Fomu ya bidhaa mpya imefunguliwa')} className="ss-btn-primary rounded-xl px-4 py-2.5 font-bold text-sm flex items-center gap-2 shrink-0">
              <Plus size={16} /> Ongeza Bidhaa
            </button>
          </div>

          {/* stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-medium" style={{ color: 'var(--ink-soft)' }}>{s.label}</div>
                <div className="font-display font-extrabold text-xl sm:text-2xl mt-1.5 ss-tabular" style={{ color: 'var(--ink)' }}>{s.value}</div>
                <div className="flex items-center gap-1 mt-1.5 text-xs font-semibold" style={{ color: s.up ? HEX.success : HEX.deal }}>
                  {s.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {s.delta} wiki hii
                </div>
              </div>
            ))}
          </div>

          {/* recent orders */}
          <div className="rounded-2xl mb-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 flex-wrap gap-3">
              <h2 className="font-display font-bold text-base" style={{ color: 'var(--ink)' }}>Maagizo ya Karibuni</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {['Zote', 'Inasubiri', 'Kusafirishwa', 'Imekamilika'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setOrderFilter(f)}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-full"
                    style={orderFilter === f
                      ? { background: 'var(--deal-soft)', color: '#B23C15' }
                      : { background: 'var(--surface-alt)', color: 'var(--ink-soft)', border: '1px solid var(--border)' }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-left border-t border-b" style={{ borderColor: 'var(--border)' }}>
                    {['Agizo', 'Bidhaa', 'Mnunuzi', 'Kiasi', 'Hali', ''].map((h) => (
                      <th key={h} className="px-4 sm:px-5 py-2.5 font-semibold text-xs" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="ss-row border-b" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 sm:px-5 py-3 font-semibold" style={{ color: 'var(--ink)' }}>{o.id}</td>
                      <td className="px-4 sm:px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0" style={{ border: '1px solid var(--border)' }}>
                            <FabricPattern colors={PATTERNS[o.variant].colors} uid={`ord-${o.id}`} />
                          </div>
                          <span className="truncate max-w-[160px]" style={{ color: 'var(--ink)' }}>{o.item}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-3" style={{ color: 'var(--ink-soft)' }}>{o.buyer}</td>
                      <td className="px-4 sm:px-5 py-3 font-semibold ss-tabular" style={{ color: 'var(--ink)' }}>{money(o.total)}</td>
                      <td className="px-4 sm:px-5 py-3">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: STATUS_STYLE[o.status].bg, color: STATUS_STYLE[o.status].fg }}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-3 text-right">
                        <button className="p-1.5 rounded-lg hover:bg-black/5" aria-label="Angalia zaidi">
                          <ChevronRight size={16} color={HEX.inkSoft} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* products */}
          <div className="rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 flex-wrap gap-3">
              <h2 className="font-display font-bold text-base" style={{ color: 'var(--ink)' }}>Bidhaa Zangu</h2>
              <button className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full" style={{ background: 'var(--surface-alt)', color: 'var(--ink-soft)', border: '1px solid var(--border)' }}>
                <Filter size={12} /> Chuja
              </button>
            </div>
            <div className="flex flex-col">
              {PRODUCTS.map((p, i) => (
                <div key={p.name} className="ss-row flex items-center gap-3.5 px-4 sm:px-5 py-3.5 border-t flex-wrap sm:flex-nowrap" style={{ borderColor: 'var(--border)' }}>
                  <input type="checkbox" checked={selected.includes(p.name)} onChange={() => toggleSelect(p.name)} className="shrink-0" style={{ accentColor: HEX.deal }} />
                  <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0" style={{ border: '1px solid var(--border)' }}>
                    <FabricPattern colors={PATTERNS[p.variant].colors} uid={`prd-${i}`} />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <div className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{p.name}</div>
                    <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                      <Star size={11} fill={HEX.gold} color={HEX.gold} /> {p.rating} · Zimeuzwa {p.sold.toLocaleString('en-US')}
                    </div>
                  </div>
                  <div className="text-sm font-bold ss-tabular w-24 shrink-0" style={{ color: 'var(--deal)' }}>{money(p.price)}</div>
                  <div className="w-28 shrink-0">
                    <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>
                      <span>Stoku</span><span className="font-semibold">{p.stock}</span>
                    </div>
                    <StockBar stock={p.stock} maxStock={50} />
                  </div>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                    style={p.live ? { background: '#E1F3E8', color: HEX.success } : { background: 'var(--deal-soft)', color: '#B23C15' }}
                  >
                    {p.live ? 'Hai' : 'Imeisha Stoku'}
                  </span>
                  <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                    <button className="p-1.5 rounded-lg hover:bg-black/5" aria-label="Angalia"><Eye size={15} color={HEX.inkSoft} /></button>
                    <button className="p-1.5 rounded-lg hover:bg-black/5" aria-label="Hariri"><Pencil size={15} color={HEX.inkSoft} /></button>
                    <button className="p-1.5 rounded-lg hover:bg-black/5" aria-label="Zaidi"><MoreHorizontal size={15} color={HEX.inkSoft} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {toast && (
        <div role="status" className="ss-toast fixed bottom-6 left-1/2 z-40 flex items-center gap-2.5 px-5 py-3 rounded-full shadow-xl text-sm font-semibold text-white" style={{ background: 'var(--ink)' }}>
          <ArrowUpRight size={16} /> {toast}
        </div>
      )}
    </div>
  );
}