import React, { useState, useRef, useEffect } from 'react';
import { useQueueState } from '../hooks/useQueueState';
import { extractMovementsFromPDF, type ParsedMovement } from '../pdf/pdfParser';
import {
  buildTheme, Waves, MenuBar, Win, Provider, Seg, Stat, Badge, VarChip,
  PrimaryButton, GhostButton, DeskIcon, IcoComputer, IcoPulse, IcoFolder, IcoGear,
  TweaksPanel, SEM, MONO, type ThemeKey,
} from '../ui/retro';
import '../style.css';

export default function Popup() {
  const {
    state, stats, settings, logs, loading,
    startQueue, pauseQueue, resumeQueue, stopQueue, clearQueue, clearLogs, updateSettings,
  } = useQueueState();

  const [view, setView] = useState<'Console' | 'Monitor'>('Console');
  const [showLogs, setShowLogs] = useState(false);

  // Job input
  const [inputTab, setInputTab] = useState<'Paste Text' | 'Upload PDF'>('Paste Text');
  const [pastedText, setPastedText] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings mirrors (instant feedback, persisted on change)
  const [useChatgpt, setUseChatgpt] = useState(true);
  const [useGemini, setUseGemini] = useState(false);
  const [chatgptWorkers, setChatgptWorkers] = useState(1);
  const [geminiWorkers, setGeminiWorkers] = useState(1);
  const [localTemplate, setLocalTemplate] = useState('');

  // Preview list
  const [previewMovements, setPreviewMovements] = useState<ParsedMovement[]>([]);
  const [selectedMovements, setSelectedMovements] = useState<Record<number, boolean>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<ParsedMovement>({ movementName: '', englishName: '', category: '', targetMuscles: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMovement, setNewMovement] = useState<ParsedMovement>({ movementName: '', englishName: '', category: '', targetMuscles: '' });

  useEffect(() => {
    if (settings) {
      setUseChatgpt(settings.useChatgpt);
      setUseGemini(settings.useGemini);
      setChatgptWorkers(settings.chatgptWorkers);
      setGeminiWorkers(settings.geminiWorkers);
      setLocalTemplate(settings.promptTemplate);
    }
  }, [settings]);

  // Auto-jump to Monitor when a run starts.
  useEffect(() => { if (state.isRunning) setView('Monitor'); }, [state.isRunning]);

  useEffect(() => {
    const initial: Record<number, boolean> = {};
    previewMovements.forEach((_, i) => { initial[i] = true; });
    setSelectedMovements(initial);
  }, [previewMovements]);

  const theme = (settings?.uiTheme || 'Paper') as ThemeKey;
  const accent = settings?.uiAccent || 'oklch(0.62 0.085 215)';
  const waves = settings?.uiWaves ?? true;
  const th = buildTheme(theme, accent);

  const label = (txt: string) => <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.07em', color: th.sub, marginBottom: 9 }}>{txt}</div>;

  // ---- handlers (unchanged logic) ----
  const handleLoadPastedJobs = () => {
    const parsed = pastedText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
      .map((name) => ({ movementName: name, englishName: '', category: '', targetMuscles: '' }));
    if (parsed.length === 0) { alert('Please enter at least one job name.'); return; }
    setPreviewMovements(parsed);
    setPastedText('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFile(file);
    setParsing(true);
    try {
      const buf = await file.arrayBuffer();
      setPreviewMovements(await extractMovementsFromPDF(buf));
    } catch (err) {
      console.error('Error parsing PDF:', err);
      alert('Failed to parse PDF. Please verify it is a valid text-based PDF.');
    } finally { setParsing(false); }
  };

  const toggleSelect = (i: number) => setSelectedMovements((p) => ({ ...p, [i]: !p[i] }));
  const toggleAll = () => {
    const all = previewMovements.every((_, i) => selectedMovements[i]);
    const next: Record<number, boolean> = {};
    previewMovements.forEach((_, i) => { next[i] = !all; });
    setSelectedMovements(next);
  };
  const startEditing = (i: number) => { setEditingIndex(i); setEditValues({ ...previewMovements[i] }); };
  const saveEdit = (i: number) => { const u = [...previewMovements]; u[i] = { ...editValues }; setPreviewMovements(u); setEditingIndex(null); };
  const deleteMovement = (i: number) => setPreviewMovements(previewMovements.filter((_, idx) => idx !== i));
  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMovement.movementName.trim()) return;
    setPreviewMovements((p) => [newMovement, ...p]);
    setNewMovement({ movementName: '', englishName: '', category: '', targetMuscles: '' });
    setShowAddForm(false);
  };
  const handleLaunchQueue = () => {
    const jobs = previewMovements.filter((_, i) => selectedMovements[i]);
    if (jobs.length === 0) { alert('Please select at least one job.'); return; }
    startQueue(jobs);
    setPreviewMovements([]);
    setPdfFile(null);
  };

  const progressPercent = stats.total > 0 ? Math.round(((stats.completed + stats.failed) / stats.total) * 100) : 0;
  const filteredPreview = previewMovements.filter((m) =>
    m.movementName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.targetMuscles.toLowerCase().includes(searchQuery.toLowerCase()));

  const insetBox: React.CSSProperties = { border: `2px solid ${th.ink}`, borderRadius: 8, background: th.inset, fontFamily: MONO, color: th.ink };

  if (loading) {
    return <div style={{ width: 784, height: 620, background: th.bg, display: 'grid', placeItems: 'center', fontFamily: MONO, color: th.ink }}>Loading…</div>;
  }

  return (
    <div style={{ width: 784, minHeight: 620, background: th.bg, position: 'relative', overflowX: 'hidden', overflowY: 'auto', fontFamily: MONO, padding: '16px 16px 24px', boxSizing: 'border-box' }}>
      {waves && <Waves th={th} />}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <MenuBar th={th} accent={accent} title="BulkShot — Parallel Workers" active={view}
          nav={['Console', 'Monitor', 'Settings']} running={state.isRunning && !state.isPaused}
          onNav={(m) => { if (m === 'Settings') chrome.runtime.openOptionsPage(); else setView(m as 'Console' | 'Monitor'); }} />

        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {view === 'Console' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
                  {/* CONFIG */}
                  <Win th={th} title="config — providers & prompt" style={{ minWidth: 0 }}>
                    {label('AI PROVIDERS & WORKERS')}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <Provider th={th} accent={accent} on={useChatgpt} onToggle={() => { const v = !useChatgpt; setUseChatgpt(v); updateSettings({ useChatgpt: v }); }} name="CHATGPT" tag="DALL·E" workers={chatgptWorkers} setWorkers={(v) => { setChatgptWorkers(v); updateSettings({ chatgptWorkers: v }); }} />
                      <Provider th={th} accent={accent} on={useGemini} onToggle={() => { const v = !useGemini; setUseGemini(v); updateSettings({ useGemini: v }); }} name="GEMINI" tag="Imagen" workers={geminiWorkers} setWorkers={(v) => { setGeminiWorkers(v); updateSettings({ geminiWorkers: v }); }} />
                    </div>
                    <p style={{ fontFamily: MONO, fontSize: 10.5, color: th.sub, margin: '10px 0 14px', lineHeight: 1.5 }}>
                      {useChatgpt && useGemini ? 'Jobs split across both. Workers = parallel tabs.' : 'Jobs run on the checked provider. Workers = parallel tabs.'}
                    </p>
                    {label('PROMPT TEMPLATE — USE {} FOR THE JOB NAME')}
                    <textarea spellCheck={false} value={localTemplate}
                      onChange={(e) => { setLocalTemplate(e.target.value); updateSettings({ promptTemplate: e.target.value }); }}
                      style={{ ...insetBox, width: '100%', height: 132, resize: 'none', padding: 12, fontSize: 12, lineHeight: 1.6, outline: 'none', boxSizing: 'border-box' }} />
                  </Win>

                  {/* JOBS */}
                  <Win th={th} title="jobs — input list" style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      {label('JOB LIST INPUT')}
                      <div style={{ marginTop: -9 }}><Seg th={th} accent={accent} options={['Paste Text', 'Upload PDF']} value={inputTab} onChange={(o) => setInputTab(o as any)} /></div>
                    </div>

                    {inputTab === 'Paste Text' ? (
                      <>
                        <textarea spellCheck={false} value={pastedText} onChange={(e) => setPastedText(e.target.value)}
                          placeholder={'Enter one job per line:\nSwastikasana\nPadmasana\nVajrasana'}
                          style={{ ...insetBox, width: '100%', height: 176, resize: 'none', padding: 12, fontSize: 12.5, lineHeight: 1.7, outline: 'none', boxSizing: 'border-box' }} />
                        <PrimaryButton th={th} accent={accent} onClick={handleLoadPastedJobs} style={{ marginTop: 12, width: '100%' }}>Load Job List →</PrimaryButton>
                      </>
                    ) : (
                      <>
                        <div onClick={() => fileInputRef.current?.click()}
                          style={{ ...insetBox, height: 176, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', textAlign: 'center', padding: 12, borderStyle: 'dashed' }}>
                          <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                          <IcoFolder c={th.ink} s={30} />
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{pdfFile ? pdfFile.name : 'Upload Movement PDF'}</div>
                          <div style={{ fontSize: 10.5, color: th.sub }}>{parsing ? 'Extracting movements…' : 'Click to browse a text-based PDF'}</div>
                        </div>
                        <PrimaryButton th={th} accent={accent} onClick={() => fileInputRef.current?.click()} style={{ marginTop: 12, width: '100%' }}>Choose PDF →</PrimaryButton>
                      </>
                    )}
                  </Win>
                </div>

                {/* PREVIEW LIST */}
                {previewMovements.length > 0 && (
                  <Win th={th} title={`preview — ${previewMovements.filter((_, i) => selectedMovements[i]).length}/${previewMovements.length} selected`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <button onClick={toggleAll} style={{ ...insetBox, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Toggle All</button>
                      <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="search…"
                        style={{ ...insetBox, flex: 1, padding: '6px 10px', fontSize: 12, background: th.panel, outline: 'none' }} />
                      <button onClick={() => setShowAddForm((p) => !p)} style={{ ...insetBox, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Add</button>
                    </div>

                    {showAddForm && (
                      <form onSubmit={handleAddMovement} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <input autoFocus required placeholder="Movement name *" value={newMovement.movementName}
                          onChange={(e) => setNewMovement((p) => ({ ...p, movementName: e.target.value }))}
                          style={{ ...insetBox, flex: 1, padding: '7px 10px', fontSize: 12, background: th.panel, outline: 'none' }} />
                        <input placeholder="Target muscles" value={newMovement.targetMuscles}
                          onChange={(e) => setNewMovement((p) => ({ ...p, targetMuscles: e.target.value }))}
                          style={{ ...insetBox, flex: 1, padding: '7px 10px', fontSize: 12, background: th.panel, outline: 'none' }} />
                        <PrimaryButton th={th} accent={accent} style={{ padding: '7px 14px', boxShadow: `2px 2px 0 ${th.ink}` }}>Add</PrimaryButton>
                      </form>
                    )}

                    <div style={{ maxHeight: 196, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                      {filteredPreview.map((m) => {
                        const i = previewMovements.indexOf(m);
                        const editing = editingIndex === i;
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderBottom: `2px dotted ${th.ink}`, opacity: selectedMovements[i] ? 1 : 0.45 }}>
                            <input type="checkbox" checked={!!selectedMovements[i]} onChange={() => toggleSelect(i)} style={{ accentColor: accent, width: 15, height: 15 }} />
                            {editing ? (
                              <input autoFocus value={editValues.movementName} onChange={(e) => setEditValues((p) => ({ ...p, movementName: e.target.value }))}
                                style={{ ...insetBox, flex: 1, padding: '5px 8px', fontSize: 12, background: th.panel, outline: 'none' }} />
                            ) : (
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: th.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.movementName}</div>
                                <div style={{ fontSize: 10.5, color: th.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.targetMuscles || 'No muscles specified'}</div>
                              </div>
                            )}
                            {editing ? (
                              <button onClick={() => saveEdit(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: SEM.completed, fontWeight: 700, fontFamily: MONO }}>save</button>
                            ) : (
                              <button onClick={() => startEditing(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: th.sub, fontWeight: 700, fontFamily: MONO }}>edit</button>
                            )}
                            <button onClick={() => deleteMovement(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: SEM.failed, fontWeight: 700, fontFamily: MONO }}>✕</button>
                          </div>
                        );
                      })}
                      {filteredPreview.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: th.sub, fontSize: 12 }}>No matches.</div>}
                    </div>

                    <PrimaryButton th={th} accent={accent} onClick={handleLaunchQueue} style={{ marginTop: 12, width: '100%' }}>▶  Start Generation Queue</PrimaryButton>
                  </Win>
                )}

                {/* STATS */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <Stat th={th} label="TOTAL" value={stats.total} color={th.sub} />
                  <Stat th={th} label="PENDING" value={stats.pending} color={SEM.pending} />
                  <Stat th={th} label="RUNNING" value={stats.running} color={accent} />
                  <Stat th={th} label="DONE" value={stats.completed} color={SEM.completed} />
                  <Stat th={th} label="FAILED" value={stats.failed} color={SEM.failed} />
                </div>
              </>
            ) : (
              <>
                {/* PROGRESS */}
                <Win th={th} title="active queue progress">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <IcoPulse c={accent} s={20} />
                    <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: th.ink }}>{state.isRunning ? (state.isPaused ? 'Paused' : 'Active Processing') : 'Queue Idle'}</span>
                    <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 14, fontWeight: 700, color: th.ink }}>{progressPercent}% ({stats.completed + stats.failed}/{stats.total})</span>
                  </div>
                  <div style={{ height: 20, border: `2px solid ${th.ink}`, borderRadius: 999, background: th.inset, overflow: 'hidden', marginBottom: 14 }}>
                    <div style={{ width: `${progressPercent}%`, height: '100%', background: `repeating-linear-gradient(45deg, ${accent}, ${accent} 10px, color-mix(in oklch, ${accent} 80%, #fff) 10px, color-mix(in oklch, ${accent} 80%, #fff) 20px)`, transition: 'width .4s' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {state.isRunning && !state.isPaused && <GhostButton th={th} onClick={pauseQueue} style={{ flex: 1 }}>⏸  Pause</GhostButton>}
                    {state.isRunning && state.isPaused && <PrimaryButton th={th} accent={accent} onClick={resumeQueue} style={{ flex: 1 }}>▶  Resume</PrimaryButton>}
                    {state.isRunning && <GhostButton th={th} onClick={stopQueue} style={{ flex: 1 }}>■  Stop Workers</GhostButton>}
                    {!state.isRunning && state.jobs.length > 0 && <GhostButton th={th} onClick={clearQueue} style={{ flex: 1 }}>↺  Reset / Clear Queue</GhostButton>}
                    {!state.isRunning && state.jobs.length === 0 && <GhostButton th={th} onClick={() => setView('Console')} style={{ flex: 1 }}>← Back to Console</GhostButton>}
                  </div>
                </Win>

                {/* STATS */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <Stat th={th} label="TOTAL" value={stats.total} color={th.sub} />
                  <Stat th={th} label="PENDING" value={stats.pending} color={SEM.pending} />
                  <Stat th={th} label="RUNNING" value={stats.running} color={accent} />
                  <Stat th={th} label="DONE" value={stats.completed} color={SEM.completed} />
                  <Stat th={th} label="FAILED" value={stats.failed} color={SEM.failed} />
                </div>

                {/* QUEUE LIST / LOGS */}
                <Win th={th} title={showLogs ? 'system logs' : 'queue list'}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                    {label(showLogs ? `LOGS (${logs.length})` : `QUEUE LIST (${state.jobs.length})`)}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, marginTop: -9 }}>
                      {showLogs && <button onClick={clearLogs} style={{ ...insetBox, padding: '5px 9px', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>Clear</button>}
                      <Seg th={th} accent={accent} options={['Queue', 'Logs']} value={showLogs ? 'Logs' : 'Queue'} onChange={(o) => setShowLogs(o === 'Logs')} />
                    </div>
                  </div>

                  {showLogs ? (
                    <div style={{ maxHeight: 260, overflowY: 'auto', fontSize: 10.5, lineHeight: 1.6 }}>
                      {logs.map((lg, idx) => {
                        const c = lg.type === 'error' ? SEM.failed : lg.type === 'warn' ? SEM.pending : th.sub;
                        return (
                          <div key={idx} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: `1px dotted ${th.inset}` }}>
                            <span style={{ color: th.sub, flexShrink: 0 }}>[{new Date(lg.timestamp).toLocaleTimeString()}]</span>
                            <span style={{ color: c, fontWeight: 700, flexShrink: 0, textTransform: 'uppercase' }}>{lg.type}</span>
                            <span style={{ color: th.ink }}>{lg.message}</span>
                          </div>
                        );
                      })}
                      {logs.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: th.sub }}>No logs yet.</div>}
                    </div>
                  ) : (
                    <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                      {state.jobs.map((job) => {
                        const dot = job.status === 'completed' ? SEM.completed : job.status === 'failed' ? SEM.failed : job.status === 'running' ? accent : th.sub;
                        const elapsed = job.status === 'running' && job.startedAt ? Math.round((Date.now() - job.startedAt) / 1000) : null;
                        return (
                          <div key={job.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 2px', borderBottom: `2px dotted ${th.ink}` }}>
                            <span style={{ width: 9, height: 9, borderRadius: 999, background: dot, flexShrink: 0 }} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: th.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.movementName}</span>
                                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, border: `2px solid ${th.ink}`, background: job.provider === 'gemini' ? th.inset : th.accentSoft, color: th.ink, flexShrink: 0 }}>{job.provider === 'gemini' ? 'GEMINI' : 'GPT'}</span>
                              </div>
                              <div style={{ fontSize: 11, color: th.sub, marginTop: 3 }}>{job.error || job.targetMuscles || 'No target muscles specified'}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                              {elapsed !== null && <span style={{ fontSize: 11, color: th.sub }}>{elapsed}s</span>}
                              {job.status === 'completed' && job.imageUrl && (
                                <a href={job.imageUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 700, color: th.ink, textDecoration: 'underline', textUnderlineOffset: 3 }}>↗ View</a>
                              )}
                              <Badge th={th} color={dot}>{job.status === 'running' ? `RUN ${job.retryCount}` : job.status.toUpperCase()}</Badge>
                            </div>
                          </div>
                        );
                      })}
                      {state.jobs.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: th.sub, fontSize: 12 }}>No jobs in the queue. Load a list in Console.</div>}
                    </div>
                  )}
                </Win>
              </>
            )}
          </div>

          {/* right desktop icons */}
          <div style={{ width: 64, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', flexShrink: 0 }}>
            <DeskIcon th={th} ico={<IcoComputer c={th.ink} s={24} />} label="Console" active={view === 'Console'} onClick={() => setView('Console')} />
            <DeskIcon th={th} ico={<IcoPulse c={th.ink} s={24} />} label="Monitor" active={view === 'Monitor'} onClick={() => setView('Monitor')} />
            <DeskIcon th={th} ico={<IcoFolder c={th.ink} s={24} />} label="Output" onClick={() => chrome.tabs.create({ url: 'chrome://downloads' })} />
            <DeskIcon th={th} ico={<IcoGear c={th.ink} s={24} />} label="Settings" onClick={() => chrome.runtime.openOptionsPage()} />
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
