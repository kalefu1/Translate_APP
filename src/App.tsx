import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Check, Clipboard, Copy, Eraser, Languages, LoaderCircle,
  RotateCcw, Settings2, Square, WandSparkles
} from "lucide-react";
import { SettingsModal } from "./components/SettingsModal";
import { ResultView } from "./components/ResultView";
import { AppError, translate } from "./lib/api";
import { loadDefaultProfileId, loadProfiles, removeProfileSecret, saveDefaultProfileId, saveProfiles } from "./lib/storage";
import { MODE_LABELS, MODE_OPTIONS, type AppErrorShape, type InputMode, type ModelProfile, type TranslationResult } from "./types";

const SAMPLE = "把这段 mixed content 翻译得更自然一些。";

function resultAsText(result: TranslationResult): string {
  switch (result.detected_mode) {
    case "foreign_to_zh": return result.translation;
    case "zh_sentence": return result.translation;
    case "zh_term": return `${result.english} ${result.phonetic}\n${result.part_of_speech}\n${result.examples.map((x, i) => `${i + 1}. ${x.source}\n   ${x.translation}`).join("\n")}`;
    case "en_term": return `${result.term} ${result.phonetic}\n${result.meanings.join("；")}\n词根词缀：${result.morphology}\n同族词：${result.family_words.map((x) => `${x.word}（${x.meaning}）`).join("、")}\n${result.examples.map((x, i) => `${i + 1}. ${x.source}\n   ${x.translation}`).join("\n")}`;
    case "en_sentence": return result.is_correct ? `语法和用词正确\n${result.translation}` : `${result.corrected}\n${result.issues.map((x) => `${x.original} → ${x.replacement}：${x.reason}`).join("\n")}`;
  }
}

export default function App() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<InputMode>("auto");
  const [profiles, setProfiles] = useState<ModelProfile[]>([]);
  const [defaultId, setDefaultId] = useState("");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<AppErrorShape | null>(null);
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let mounted = true;
    loadProfiles().then((items) => {
      if (!mounted) return;
      setProfiles(items);
      const storedDefault = loadDefaultProfileId();
      setDefaultId(items.some((x) => x.id === storedDefault && x.verified) ? storedDefault : (items.find((x) => x.verified)?.id ?? ""));
      setReady(true);
      if (!items.some((x) => x.verified)) setSettingsOpen(true);
    });
    return () => {
      mounted = false;
      controllerRef.current?.abort();
    };
  }, []);

  const activeProfile = useMemo(() => profiles.find((x) => x.id === defaultId), [profiles, defaultId]);
  const canSubmit = text.trim().length > 0 && text.length <= 5000 && Boolean(activeProfile) && !loading;

  const process = async () => {
    if (!activeProfile) {
      setError({ code: "CONFIG", message: "请先配置并测试一个模型" });
      setSettingsOpen(true);
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await translate(text, mode, activeProfile, controller.signal));
    } catch (caught) {
      if (caught instanceof AppError && caught.code === "ABORTED") return;
      setError(caught instanceof AppError ? caught : { code: "NETWORK", message: "处理失败，请重试" });
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setLoading(false);
      }
    }
  };

  const cancel = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setLoading(false);
  };

  const clear = () => {
    cancel();
    setText("");
    setResult(null);
    setError(null);
  };

  const copyResult = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(resultAsText(result));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const saveSettings = async (next: ModelProfile[], nextDefault: string, removed: string[]) => {
    await Promise.all(removed.map(removeProfileSecret));
    await saveProfiles(next);
    saveDefaultProfileId(nextDefault);
    setProfiles(next);
    setDefaultId(nextDefault);
    setError(null);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="译界首页">
          <span className="brand-mark"><Languages size={20} /></span>
          <span><strong>译界</strong><small>Context Zero Translator</small></span>
        </a>
        <div className="top-actions">
          {profiles.filter((x) => x.verified).length > 1 && (
            <select className="model-select" value={defaultId} onChange={(e) => { setDefaultId(e.target.value); saveDefaultProfileId(e.target.value); }} aria-label="当前模型">
              {profiles.filter((x) => x.verified).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          )}
          <button className="settings-button" onClick={() => setSettingsOpen(true)}><Settings2 size={17} /><span>模型设置</span></button>
        </div>
      </header>

      <main id="top" className="workspace">
        <section className="intro">
          <p className="eyebrow"><WandSparkles size={14} /> 五种语言处理，一处完成</p>
          <h1>输入这一刻，<em>只关心这一句。</em></h1>
          <p>翻译、查词与英文校对。没有上下文串联，也没有历史负担。</p>
        </section>

        <div className="workbench">
          <section className="panel input-panel" aria-labelledby="input-title">
            <header className="panel-header">
              <div><span className="step">01</span><h2 id="input-title">输入</h2></div>
              <div className="input-tools">
                <button onClick={async () => { const value = await navigator.clipboard.readText(); setText(value.slice(0, 5000)); setResult(null); }}><Clipboard size={15} /> 粘贴</button>
                <button onClick={clear} disabled={!text && !result}><Eraser size={15} /> 清空</button>
              </div>
            </header>

            <div className="mode-row">
              <label htmlFor="mode">处理模式</label>
              <select id="mode" value={mode} onChange={(e) => { setMode(e.target.value as InputMode); setResult(null); setError(null); }}>
                {MODE_OPTIONS.map((x) => <option key={x} value={x}>{MODE_LABELS[x]}</option>)}
              </select>
            </div>

            <div className="textarea-wrap">
              <textarea
                value={text}
                maxLength={5000}
                onChange={(e) => { setText(e.target.value); if (result) setResult(null); if (error) setError(null); }}
                onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); if (canSubmit) void process(); } }}
                placeholder="输入中文、英文或其他语言…"
                aria-label="需要翻译或检查的内容"
              />
              {!text && <button className="sample-button" onClick={() => setText(SAMPLE)}>试试示例：{SAMPLE}</button>}
            </div>

            <footer className="input-footer">
              <span className={text.length >= 4800 ? "near-limit" : ""}>{text.length.toLocaleString()} / 5,000</span>
              {loading ? (
                <button className="cancel-button" onClick={cancel}><Square size={14} fill="currentColor" />取消请求</button>
              ) : (
                <button className="translate-button" disabled={!canSubmit || !ready} onClick={() => void process()}>
                  {!activeProfile ? "请先配置模型" : "开始处理"}<ArrowRight size={18} />
                </button>
              )}
            </footer>
          </section>

          <section className="panel output-panel" aria-labelledby="output-title" aria-live="polite">
            <header className="panel-header">
              <div><span className="step">02</span><h2 id="output-title">结果</h2></div>
              {result && <button className="copy-button" onClick={copyResult}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "已复制" : "复制结果"}</button>}
            </header>

            <div className="output-body">
              {loading && <div className="state-view"><div className="loader-orbit"><LoaderCircle className="spin" size={28} /></div><strong>正在独立处理当前输入</strong><p>不会读取或关联任何其他内容</p></div>}
              {!loading && error && <div className="state-view error-state"><div className="error-code">{error.code}</div><strong>{error.message}</strong>{error.detail && <p>{error.detail}</p>}<div className="state-actions"><button onClick={() => error.code === "CONFIG" ? setSettingsOpen(true) : void process()}>{error.code === "CONFIG" ? <Settings2 size={16} /> : <RotateCcw size={16} />}{error.code === "CONFIG" ? "打开设置" : "重新尝试"}</button></div></div>}
              {!loading && !error && result && <ResultView result={result} />}
              {!loading && !error && !result && <div className="state-view empty-state"><div className="empty-glyph">译</div><strong>结果将在这里展开</strong><p>自动识别语言与任务，也可以手动指定处理模式。</p><div className="supported"><span>翻译</span><span>查词</span><span>音标</span><span>语法检查</span></div></div>}
            </div>
          </section>
        </div>

        <footer className="page-footer"><span>当前模型：{activeProfile?.name ?? "未配置"}</span></footer>
      </main>

      <SettingsModal open={settingsOpen} profiles={profiles} defaultId={defaultId} onClose={() => setSettingsOpen(false)} onSave={saveSettings} />
    </div>
  );
}
