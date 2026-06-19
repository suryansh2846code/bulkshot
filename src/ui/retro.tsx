// BulkShot retro desktop-OS UI kit — shared theme + components.
// Ported from the Claude Design handoff (new-page-options) into typed React.
import React from 'react';

export type ThemeKey = 'Paper' | 'Dusk';

export interface Theme {
  bg: string;
  panel: string;
  bar: string;
  inset: string;
  ink: string;
  sub: string;
  waveA: string;
  waveB: string;
  accentSoft: string;
}

const THEMES: Record<ThemeKey, Omit<Theme, 'accentSoft'>> = {
  Paper: {
    bg: 'oklch(0.905 0.022 88)', panel: 'oklch(0.955 0.016 86)', bar: 'oklch(0.93 0.02 86)',
    inset: 'oklch(0.975 0.01 86)', ink: 'oklch(0.21 0.018 60)', sub: 'oklch(0.46 0.022 66)',
    waveA: 'oklch(0.80 0.055 205)', waveB: 'oklch(0.87 0.04 200)',
  },
  Dusk: {
    bg: 'oklch(0.27 0.02 252)', panel: 'oklch(0.32 0.022 252)', bar: 'oklch(0.36 0.022 252)',
    inset: 'oklch(0.30 0.02 252)', ink: 'oklch(0.93 0.015 86)', sub: 'oklch(0.72 0.02 230)',
    waveA: 'oklch(0.46 0.06 215)', waveB: 'oklch(0.40 0.05 220)',
  },
};

export const SEM = { pending: '#d98a3d', completed: '#5aa86b', failed: '#c8553d' };

export const ACCENTS = [
  'oklch(0.62 0.085 215)',
  'oklch(0.70 0.10 45)',
  'oklch(0.60 0.085 150)',
  'oklch(0.56 0.10 255)',
];

export const MONO = "'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

export function buildTheme(themeKey: ThemeKey, accent: string): Theme {
  const base = THEMES[themeKey] || THEMES.Paper;
  return { ...base, accentSoft: `color-mix(in oklch, ${accent} 22%, ${base.panel})` };
}

export function Waves({ th }: { th: Theme }) {
  return (
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}>
      <path d="M-120,250 C 320,110 620,400 1560,170 L1560,330 C 620,560 320,300 -120,420 Z" fill={th.waveB} opacity="0.55" />
      <path d="M-120,540 C 380,400 820,700 1560,470 L1560,640 C 820,880 380,560 -120,700 Z" fill={th.waveA} opacity="0.5" />
    </svg>
  );
}

// ---- pixel icons ----
type IcoProps = { c?: string; s?: number };
export function IcoComputer({ c = '#000', s = 30 }: IcoProps) {
  return (<svg width={s} height={s} viewBox="0 0 16 16" fill={c} shapeRendering="crispEdges"><rect x="1" y="2" width="14" height="9" /><rect x="6" y="11" width="4" height="2" /><rect x="4" y="13" width="8" height="1.5" /><rect x="2.5" y="3.5" width="11" height="6" fill="none" stroke="#fff" strokeWidth="1" /></svg>);
}
export function IcoDoc({ c = '#000', s = 30 }: IcoProps) {
  return (<svg width={s} height={s} viewBox="0 0 16 16" fill={c} shapeRendering="crispEdges"><rect x="3" y="1" width="10" height="14" /><rect x="4.5" y="2.5" width="7" height="11" fill="#fff" /><rect x="6" y="4" width="4" height="1" /><rect x="6" y="6.5" width="4" height="1" /><rect x="6" y="9" width="4" height="1" /></svg>);
}
export function IcoFolder({ c = '#000', s = 30 }: IcoProps) {
  return (<svg width={s} height={s} viewBox="0 0 16 16" fill={c} shapeRendering="crispEdges"><rect x="1" y="3" width="6" height="2" /><rect x="1" y="4" width="14" height="9" /><rect x="2.5" y="6" width="11" height="5.5" fill="#fff" /></svg>);
}
export function IcoGear({ c = '#000', s = 30 }: IcoProps) {
  return (<svg width={s} height={s} viewBox="0 0 16 16" fill={c} shapeRendering="crispEdges"><rect x="7" y="1" width="2" height="3" /><rect x="7" y="12" width="2" height="3" /><rect x="1" y="7" width="3" height="2" /><rect x="12" y="7" width="3" height="2" /><rect x="3" y="3" width="10" height="10" /><rect x="6" y="6" width="4" height="4" fill="#fff" /></svg>);
}
export function IcoBolt({ c = '#000', s = 30 }: IcoProps) {
  return (<svg width={s} height={s} viewBox="0 0 16 16" fill={c} shapeRendering="crispEdges"><rect x="8" y="2" width="2" height="3" /><rect x="6" y="5" width="2" height="3" /><rect x="4" y="8" width="6" height="2" /><rect x="7" y="8" width="2" height="3" /><rect x="6" y="11" width="2" height="3" /></svg>);
}
export function IcoPulse({ c = '#000', s = 30 }: IcoProps) {
  return (<svg width={s} height={s} viewBox="0 0 16 16" fill={c} shapeRendering="crispEdges"><rect x="2" y="9" width="2" height="4" /><rect x="5" y="6" width="2" height="7" /><rect x="8" y="2" width="2" height="11" /><rect x="11" y="7" width="2" height="6" /></svg>);
}

// BulkShot brand mark — 2x2 grid of rounded squares (3 ink + 1 accent).
export function Logo({ s = 22, ink = '#000', accent = 'oklch(0.62 0.085 215)' }: { s?: number; ink?: string; accent?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" style={{ display: 'block' }}>
      <rect x="20" y="20" width="26" height="26" rx="6" fill={ink} />
      <rect x="54" y="20" width="26" height="26" rx="6" fill={ink} />
      <rect x="20" y="54" width="26" height="26" rx="6" fill={ink} />
      <rect x="54" y="54" width="26" height="26" rx="6" fill={accent} />
    </svg>
  );
}

export function DeskIcon({ th, ico, label, active, onClick }: { th: Theme; ico: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 4, fontFamily: MONO, cursor: 'pointer' }}>
      <span style={{ width: 46, height: 46, border: `2px solid ${th.ink}`, borderRadius: 10, background: active ? th.accentSoft : th.panel, display: 'grid', placeItems: 'center', boxShadow: `2px 2px 0 ${th.ink}` }}>{ico}</span>
      <span style={{ fontSize: 10.5, color: th.ink, fontWeight: 700, letterSpacing: '.02em' }}>{label}</span>
    </button>
  );
}

// ---- window frame ----
export function Win({ th, title, children, style, flush }: { th: Theme; title: string; children: React.ReactNode; style?: React.CSSProperties; flush?: boolean }) {
  return (
    <div style={{ border: `2px solid ${th.ink}`, borderRadius: 12, background: th.panel, boxShadow: `3px 3px 0 ${th.ink}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderBottom: `2px solid ${th.ink}`, background: th.bar }}>
        <span style={{ width: 11, height: 11, borderRadius: 999, border: `2px solid ${th.ink}` }} />
        <span style={{ width: 11, height: 11, borderRadius: 999, border: `2px solid ${th.ink}` }} />
        <span style={{ flex: 1, textAlign: 'center', fontFamily: MONO, fontSize: 12, fontWeight: 700, color: th.ink, letterSpacing: '.02em', marginLeft: -22 }}>{title}</span>
      </div>
      <div style={{ padding: flush ? 0 : 16, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>{children}</div>
    </div>
  );
}

export function MenuBar({ th, accent, title, active, nav, onNav, running }: { th: Theme; accent: string; title: string; active: string; nav: string[]; onNav: (m: string) => void; running?: boolean }) {
  const now = new Date();
  const time = `${(now.getHours() % 12 || 12)}:${String(now.getMinutes()).padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, border: `2px solid ${th.ink}`, borderRadius: 999, background: th.panel, boxShadow: `3px 3px 0 ${th.ink}`, padding: '8px 18px', marginBottom: 18 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Logo s={20} ink={th.ink} accent={accent} />
        {nav.map((m) => (
          <button key={m} onClick={() => onNav(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: active === m ? accent : th.ink, textDecoration: active === m ? 'underline' : 'none', textUnderlineOffset: 3, padding: 0 }}>{m}</button>
        ))}
      </span>
      <span style={{ flex: 1, textAlign: 'center', fontFamily: MONO, fontSize: 13, fontWeight: 700, color: th.ink, letterSpacing: '.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: th.sub }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: running ? accent : th.sub }} /> {running ? 'Active' : 'Idle'}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: th.ink }}>{time}</span>
      </span>
    </div>
  );
}

export function Meter({ th, label, pct, fill }: { th: Theme; label: string; pct: number; fill?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontFamily: MONO }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: th.sub, width: 30 }}>{label}</span>
      <div style={{ flex: 1, height: 14, border: `2px solid ${th.ink}`, borderRadius: 4, background: th.inset, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: fill || th.ink }} />
      </div>
    </div>
  );
}

export function Stat({ th, label, value, color }: { th: Theme; label: string; value: React.ReactNode; color: string }) {
  return (
    <div style={{ flex: '1 1 0', minWidth: 0, border: `2px solid ${th.ink}`, borderRadius: 10, background: th.panel, boxShadow: `2px 2px 0 ${th.ink}`, padding: '12px 14px', fontFamily: MONO }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: th.sub }}>{label}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: th.ink, marginTop: 4, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

export function Seg({ th, accent, options, value, onChange }: { th: Theme; accent: string; options: string[]; value: string; onChange: (o: string) => void }) {
  return (
    <div style={{ display: 'inline-flex', border: `2px solid ${th.ink}`, borderRadius: 8, overflow: 'hidden', fontFamily: MONO }}>
      {options.map((o, i) => (
        <button key={o} onClick={() => onChange(o)} style={{ border: 'none', borderLeft: i ? `2px solid ${th.ink}` : 'none', cursor: 'pointer', background: value === o ? accent : th.panel, color: value === o ? '#fff' : th.ink, fontSize: 11.5, fontWeight: 700, padding: '6px 13px', fontFamily: MONO }}>{o}</button>
      ))}
    </div>
  );
}

export function Stepper({ th, value, onChange, disabled, min = 1, max = 8 }: { th: Theme; value: number; onChange: (v: number) => void; disabled?: boolean; min?: number; max?: number }) {
  const btn: React.CSSProperties = { width: 26, height: 26, border: `2px solid ${th.ink}`, background: th.panel, color: th.ink, cursor: disabled ? 'default' : 'pointer', fontFamily: MONO, fontSize: 15, fontWeight: 700, display: 'grid', placeItems: 'center', opacity: disabled ? .4 : 1 };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
      <button disabled={disabled} onClick={() => onChange(Math.max(min, value - 1))} style={{ ...btn, borderRadius: '6px 0 0 6px' }}>−</button>
      <span style={{ minWidth: 34, height: 26, borderTop: `2px solid ${th.ink}`, borderBottom: `2px solid ${th.ink}`, background: th.inset, display: 'grid', placeItems: 'center', fontFamily: MONO, fontSize: 13, fontWeight: 700, color: disabled ? th.sub : th.ink }}>{value}</span>
      <button disabled={disabled} onClick={() => onChange(Math.min(max, value + 1))} style={{ ...btn, borderRadius: '0 6px 6px 0' }}>+</button>
    </div>
  );
}

export function Provider({ th, accent, on, onToggle, name, tag, workers, setWorkers }: { th: Theme; accent: string; on: boolean; onToggle: () => void; name: string; tag: string; workers: number; setWorkers: (v: number) => void }) {
  return (
    <div style={{ flex: '1 1 0', minWidth: 0, border: `2px solid ${th.ink}`, borderRadius: 10, background: on ? th.accentSoft : th.inset, padding: 13, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, padding: 0, fontFamily: MONO }}>
        <span style={{ width: 18, height: 18, border: `2px solid ${th.ink}`, borderRadius: 4, background: on ? accent : th.panel, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{on ? '✓' : ''}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: th.ink, letterSpacing: '.03em' }}>{name}</span>
        <span style={{ fontSize: 9.5, color: th.sub }}>{tag}</span>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.06em', color: th.sub }}>WORKERS</span>
        <Stepper th={th} value={workers} onChange={setWorkers} disabled={!on} />
      </div>
    </div>
  );
}

export function Switch({ th, accent, on, onChange }: { th: Theme; accent: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{ width: 46, height: 26, borderRadius: 999, border: `2px solid ${th.ink}`, background: on ? accent : th.inset, cursor: 'pointer', padding: 0, position: 'relative', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 18, height: 18, borderRadius: 5, background: th.panel, border: `2px solid ${th.ink}`, transition: 'left .14s ease' }} />
    </button>
  );
}

export function Slider({ th, accent, value, min, max, onChange }: { th: Theme; accent: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100;
  const handle = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    onChange(Math.round(min + ratio * (max - min)));
  };
  return (
    <div onClick={handle} style={{ position: 'relative', height: 22, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
      <div style={{ width: '100%', height: 10, border: `2px solid ${th.ink}`, borderRadius: 999, background: th.inset, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: accent }} />
      </div>
      <span style={{ position: 'absolute', left: `calc(${pct}% - 9px)`, width: 18, height: 18, borderRadius: 5, background: th.panel, border: `2px solid ${th.ink}`, boxShadow: `1px 1px 0 ${th.ink}` }} />
    </div>
  );
}

export function VarChip({ th, children, soft }: { th: Theme; children: React.ReactNode; soft?: boolean }) {
  return (
    <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 6, border: `2px solid ${th.ink}`, background: soft ? th.accentSoft : th.inset, color: th.ink }}>{children}</span>
  );
}

export function Badge({ th, color, children }: { th: Theme; color: string; children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.05em', padding: '4px 9px', borderRadius: 6, border: `2px solid ${color}`, color, background: `color-mix(in oklch, ${color} 14%, ${th.panel})` }}>{children}</span>
  );
}

export function PrimaryButton({ th, accent, children, onClick, style }: { th: Theme; accent: string; children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} style={{ border: `2px solid ${th.ink}`, borderRadius: 8, background: accent, color: '#fff', boxShadow: `3px 3px 0 ${th.ink}`, padding: '12px', fontFamily: MONO, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', letterSpacing: '.02em', ...style }}>{children}</button>
  );
}

export function GhostButton({ th, children, onClick, style }: { th: Theme; children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} style={{ border: `2px solid ${th.ink}`, borderRadius: 8, background: th.panel, color: th.ink, boxShadow: `3px 3px 0 ${th.ink}`, padding: '11px', fontFamily: MONO, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', ...style }}>{children}</button>
  );
}

// ---- Floating Tweaks panel (theme switcher), simplified from the design ----
export function TweaksPanel({ th, accent, theme, waves, onTheme, onAccent, onWaves }: {
  th: Theme; accent: string; theme: ThemeKey; waves: boolean;
  onTheme: (t: ThemeKey) => void; onAccent: (a: string) => void; onWaves: (w: boolean) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const sect: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: th.sub, fontFamily: MONO };
  return (
    <div style={{ position: 'fixed', right: 14, bottom: 14, zIndex: 2147483646, fontFamily: MONO }}>
      {open && (
        <div style={{ width: 220, marginBottom: 10, border: `2px solid ${th.ink}`, borderRadius: 12, background: th.panel, boxShadow: `3px 3px 0 ${th.ink}`, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: `2px solid ${th.ink}`, background: th.bar }}>
            <b style={{ fontSize: 12, color: th.ink }}>Tweaks</b>
            <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: th.sub, fontSize: 14 }}>✕</button>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={sect}>Surface</div>
            <Seg th={th} accent={accent} options={['Paper', 'Dusk']} value={theme} onChange={(v) => onTheme(v as ThemeKey)} />
            <div style={sect}>Accent</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {ACCENTS.map((a) => (
                <button key={a} onClick={() => onAccent(a)} style={{ flex: 1, height: 30, border: `2px solid ${th.ink}`, borderRadius: 6, background: a, cursor: 'pointer', boxShadow: accent === a ? `0 0 0 2px ${th.panel}, 0 0 0 4px ${th.ink}` : 'none' }} />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: th.ink }}>Background waves</span>
              <Switch th={th} accent={accent} on={waves} onChange={onWaves} />
            </div>
          </div>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} title="Tweaks" style={{ width: 44, height: 44, border: `2px solid ${th.ink}`, borderRadius: 12, background: th.panel, boxShadow: `3px 3px 0 ${th.ink}`, cursor: 'pointer', display: 'grid', placeItems: 'center', marginLeft: 'auto' }}>
        <IcoGear c={th.ink} s={22} />
      </button>
    </div>
  );
}
