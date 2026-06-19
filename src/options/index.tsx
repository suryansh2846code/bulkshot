import React, { useState, useEffect } from 'react';
import { useQueueState } from '../hooks/useQueueState';
import { DEFAULT_PROMPT_TEMPLATE } from '../storage/storageHelper';
import {
  buildTheme, Waves, MenuBar, Win, Provider, Slider, Switch, Badge, VarChip,
  GhostButton, DeskIcon, IcoComputer, IcoPulse, IcoFolder, IcoGear, TweaksPanel, MONO,
  type ThemeKey,
} from '../ui/retro';
import '../style.css';

const PROMPT_VARS = ['{{ITEM}}', '{{MOVEMENT_NAME}}', '{{ENGLISH_NAME}}', '{{CATEGORY}}', '{{TARGET_MUSCLES}}'];

export default function Options() {
  const { settings, loading, updateSettings, testSound, testNotification } = useQueueState();

  // Local mirrors so typing/toggles feel instant; persisted on every change.
  const [useChatgpt, setUseChatgpt] = useState(true);
  const [useGemini, setUseGemini] = useState(false);
  const [chatgptWorkers, setChatgptWorkers] = useState(1);
  const [geminiWorkers, setGeminiWorkers] = useState(1);
  const [retryLimit, setRetryLimit] = useState(3);
  const [autoDownload, setAutoDownload] = useState(true);
  const [notificationSound, setNotificationSound] = useState(true);
  const [closeTabOnComplete, setCloseTabOnComplete] = useState(true);
  const [pauseOnRateLimit, setPauseOnRateLimit] = useState(false);
  const [promptTemplate, setPromptTemplate] = useState(DEFAULT_PROMPT_TEMPLATE);

  useEffect(() => {
    if (settings) {
      setUseChatgpt(settings.useChatgpt);
      setUseGemini(settings.useGemini);
      setChatgptWorkers(settings.chatgptWorkers);
      setGeminiWorkers(settings.geminiWorkers);
      setRetryLimit(settings.retryLimit);
      setAutoDownload(settings.autoDownload);
      setNotificationSound(settings.notificationSound);
      setCloseTabOnComplete(settings.closeTabOnComplete);
      setPauseOnRateLimit(settings.pauseOnRateLimit);
      setPromptTemplate(settings.promptTemplate);
    }
  }, [settings]);

  const theme = (settings?.uiTheme || 'Paper') as ThemeKey;
  const accent = settings?.uiAccent || 'oklch(0.62 0.085 215)';
  const waves = settings?.uiWaves ?? true;
  const th = buildTheme(theme, accent);

  const label = (txt: string) => <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.07em', color: th.sub, marginBottom: 12 }}>{txt}</div>;

  const ToggleRow = ({ title, desc, on, set, last }: { title: string; desc: string; on: boolean; set: (v: boolean) => void; last?: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: last ? 'none' : `2px dotted ${th.ink}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: th.ink }}>{title}</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: th.sub, marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
      </div>
      <Switch th={th} accent={accent} on={on} onChange={set} />
    </div>
  );

  if (loading) {
    return <div style={{ minHeight: '100vh', background: th.bg, display: 'grid', placeItems: 'center', fontFamily: MONO, color: th.ink }}>Loading configuration…</div>;
  }

  const resetTemplate = () => {
    if (window.confirm('Reset the prompt template to its default?')) {
      setPromptTemplate(DEFAULT_PROMPT_TEMPLATE);
      updateSettings({ promptTemplate: DEFAULT_PROMPT_TEMPLATE });
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: th.bg, position: 'relative', overflow: 'hidden', fontFamily: MONO, padding: '18px 22px 30px' }}>
      {waves && <Waves th={th} />}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1240, margin: '0 auto' }}>
        <MenuBar th={th} accent={accent} title="BulkShot — Parallel Workers" active="Settings"
          nav={['Console', 'Monitor', 'Settings']}
          onNav={(m) => { if (m !== 'Settings') window.close(); }} />

        <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* title strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, border: `2px solid ${th.ink}`, borderRadius: 12, background: th.panel, boxShadow: `3px 3px 0 ${th.ink}`, padding: '16px 20px' }}>
              <span style={{ width: 44, height: 44, border: `2px solid ${th.ink}`, borderRadius: 10, background: th.accentSoft, display: 'grid', placeItems: 'center' }}><IcoGear c={th.ink} s={26} /></span>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 700, color: th.ink, letterSpacing: '-.01em' }}>Extension Settings</div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: th.sub, marginTop: 2 }}>Configure Parallel Workers limits & prompt templates</div>
              </div>
            </div>

            {/* queue & worker limits */}
            <Win th={th} title="queue & worker limits">
              {label('AI PROVIDERS & WORKERS')}
              <div style={{ display: 'flex', gap: 12 }}>
                <Provider th={th} accent={accent} on={useChatgpt} onToggle={() => { const v = !useChatgpt; setUseChatgpt(v); updateSettings({ useChatgpt: v }); }} name="CHATGPT" tag="DALL·E" workers={chatgptWorkers} setWorkers={(v) => { setChatgptWorkers(v); updateSettings({ chatgptWorkers: v }); }} />
                <Provider th={th} accent={accent} on={useGemini} onToggle={() => { const v = !useGemini; setUseGemini(v); updateSettings({ useGemini: v }); }} name="GEMINI" tag="Imagen" workers={geminiWorkers} setWorkers={(v) => { setGeminiWorkers(v); updateSettings({ geminiWorkers: v }); }} />
              </div>
              <p style={{ fontFamily: MONO, fontSize: 11, color: th.sub, margin: '10px 0 22px', lineHeight: 1.5 }}>
                {useChatgpt && useGemini ? 'Jobs are split evenly across the checked providers. Workers = tabs processed in parallel.' : 'All jobs go to the checked provider. Workers = tabs processed in parallel.'}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: th.ink }}>Job Retry Threshold</span>
                <span style={{ marginLeft: 'auto' }}><Badge th={th} color={accent}>{retryLimit} RETRIES</Badge></span>
              </div>
              <Slider th={th} accent={accent} value={retryLimit} min={1} max={5} onChange={(v) => { setRetryLimit(v); updateSettings({ retryLimit: v }); }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: MONO, fontSize: 10.5, color: th.sub }}>
                <span>1 retry</span><span>5 retries (max)</span>
              </div>
            </Win>

            {/* automation preferences */}
            <Win th={th} title="automation preferences">
              <ToggleRow title="Auto Download Images" desc="Automatically save generated PNGs to your default Downloads folder." on={autoDownload} set={(v) => { setAutoDownload(v); updateSettings({ autoDownload: v }); }} />
              <ToggleRow title="Notification Sound Chime" desc="Play a pleasant bell sound when a generation completes." on={notificationSound} set={(v) => { setNotificationSound(v); updateSettings({ notificationSound: v }); }} />
              <ToggleRow title="Close Tab Upon Completion" desc="Automatically close worker tabs once processing completes or fails." on={closeTabOnComplete} set={(v) => { setCloseTabOnComplete(v); updateSettings({ closeTabOnComplete: v }); }} />
              <ToggleRow title="Pause Queue on Rate Limit" desc="If a provider reports a rate limit, pause the whole queue. Off = skip that job and keep going." on={pauseOnRateLimit} set={(v) => { setPauseOnRateLimit(v); updateSettings({ pauseOnRateLimit: v }); }} last />
              <div style={{ display: 'flex', gap: 14, marginTop: 18 }}>
                <GhostButton th={th} onClick={testSound} style={{ flex: 1 }}>♪  Test Audio Chime</GhostButton>
                <GhostButton th={th} onClick={testNotification} style={{ flex: 1 }}>🔔  Test Desktop Alert</GhostButton>
              </div>
            </Win>

            {/* prompt template compiler */}
            <Win th={th} title="prompt template compiler">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: th.ink }}>{'</>'}  Prompt Template Compiler</span>
                <button onClick={resetTemplate} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: accent, textDecoration: 'underline', textUnderlineOffset: 3 }}>↺ Reset to Default</button>
              </div>
              <div style={{ border: `2px solid ${th.ink}`, borderRadius: 8, background: th.inset, padding: 13, marginBottom: 14 }}>
                <div style={{ fontFamily: MONO, fontSize: 11.5, color: th.sub, marginBottom: 10 }}>Put <strong style={{ color: th.ink }}>{'{}'}</strong> wherever the job name should be inserted. These variables are also supported:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  <VarChip th={th} soft>{'{}'}</VarChip>
                  {PROMPT_VARS.map((v) => <VarChip key={v} th={th}>{v}</VarChip>)}
                </div>
              </div>
              <textarea
                spellCheck={false}
                value={promptTemplate}
                onChange={(e) => { setPromptTemplate(e.target.value); updateSettings({ promptTemplate: e.target.value }); }}
                style={{ width: '100%', height: 220, resize: 'vertical', border: `2px solid ${th.ink}`, borderRadius: 8, background: th.panel, color: th.ink, fontFamily: MONO, fontSize: 12.5, lineHeight: 1.7, padding: 14, outline: 'none', boxSizing: 'border-box' }} />
            </Win>
          </div>

          {/* right desktop icons */}
          <div style={{ width: 76, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', flexShrink: 0 }}>
            <DeskIcon th={th} ico={<IcoComputer c={th.ink} s={26} />} label="Console" onClick={() => window.close()} />
            <DeskIcon th={th} ico={<IcoPulse c={th.ink} s={26} />} label="Monitor" onClick={() => window.close()} />
            <DeskIcon th={th} ico={<IcoFolder c={th.ink} s={26} />} label="Output" onClick={() => chrome.tabs.create({ url: 'chrome://downloads' })} />
            <DeskIcon th={th} ico={<IcoGear c={th.ink} s={26} />} label="Settings" active />
          </div>
        </div>
      </div>

      <TweaksPanel th={th} accent={accent} theme={theme} waves={waves}
        onTheme={(t) => updateSettings({ uiTheme: t })}
        onAccent={(a) => updateSettings({ uiAccent: a })}
        onWaves={(w) => updateSettings({ uiWaves: w })} />
    </div>
  );
}
