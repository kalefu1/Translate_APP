import { useEffect, useMemo, useState } from "react";
import { Check, Eye, EyeOff, LoaderCircle, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import type { ModelProfile } from "../types";
import { AppError, testModel } from "../lib/api";
import { isTauri } from "../lib/platform";

interface Props {
  open: boolean;
  profiles: ModelProfile[];
  defaultId: string;
  onClose: () => void;
  onSave: (profiles: ModelProfile[], defaultId: string, removedIds: string[]) => Promise<void>;
}

const emptyProfile = (): ModelProfile => ({
  id: crypto.randomUUID(),
  name: "新模型",
  baseUrl: "https://api.openai.com/v1",
  model: "",
  apiKey: "",
  rememberKey: false,
  verified: false
});

export function SettingsModal({ open, profiles, defaultId, onClose, onSave }: Props) {
  const [drafts, setDrafts] = useState<ModelProfile[]>([]);
  const [activeId, setActiveId] = useState("");
  const [draftDefault, setDraftDefault] = useState("");
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    const initial = profiles.length ? profiles.map((x) => ({ ...x })) : [emptyProfile()];
    setDrafts(initial);
    setActiveId(initial[0].id);
    setDraftDefault(defaultId);
    setRemovedIds([]);
    setNotice(null);
  }, [open, profiles, defaultId]);

  const active = useMemo(() => drafts.find((x) => x.id === activeId), [drafts, activeId]);
  if (!open || !active) return null;

  const update = (field: keyof ModelProfile, value: string | boolean) => {
    setDrafts((items) => items.map((item) => item.id === active.id
      ? { ...item, [field]: value, ...(field === "name" || field === "rememberKey" ? {} : { verified: false }) }
      : item));
    setNotice(null);
  };

  const add = () => {
    const next = emptyProfile();
    setDrafts((items) => [...items, next]);
    setActiveId(next.id);
    setNotice(null);
  };

  const remove = () => {
    const remaining = drafts.filter((x) => x.id !== active.id);
    setRemovedIds((ids) => [...ids, active.id]);
    if (draftDefault === active.id) setDraftDefault("");
    if (remaining.length) {
      setDrafts(remaining);
      setActiveId(remaining[0].id);
    } else {
      const next = emptyProfile();
      setDrafts([next]);
      setActiveId(next.id);
    }
  };

  const verify = async () => {
    setTesting(true);
    setNotice(null);
    try {
      await testModel(active);
      setDrafts((items) => items.map((item) => item.id === active.id ? { ...item, verified: true } : item));
      setNotice({ kind: "ok", text: "连接成功，可以设为默认模型" });
    } catch (error) {
      const message = error instanceof AppError ? `${error.message}${error.detail ? `：${error.detail}` : ""}` : "连接测试失败";
      setNotice({ kind: "error", text: message });
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    const verified = drafts.filter((x) => x.verified);
    const nextDefault = verified.some((x) => x.id === draftDefault) ? draftDefault : (verified[0]?.id ?? "");
    setSaving(true);
    try {
      await onSave(drafts, nextDefault, removedIds);
      onClose();
    } catch {
      setNotice({ kind: "error", text: "配置保存失败，请重试" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="modal-header">
          <div>
            <p className="eyebrow">本机设置</p>
            <h2 id="settings-title">模型连接</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭设置"><X size={20} /></button>
        </header>

        <div className="settings-body">
          <aside className="profile-list">
            {drafts.map((profile) => (
              <button key={profile.id} className={`profile-item ${profile.id === active.id ? "active" : ""}`} onClick={() => { setActiveId(profile.id); setNotice(null); }}>
                <span>{profile.name || "未命名模型"}</span>
                {profile.verified && <Check size={15} aria-label="已验证" />}
              </button>
            ))}
            <button className="add-profile" onClick={add}><Plus size={16} /> 添加模型</button>
          </aside>

          <div className="settings-form">
            <label>
              <span>显示名称</span>
              <input value={active.name} onChange={(e) => update("name", e.target.value)} placeholder="例如：GPT-4.1 mini" />
            </label>
            <label>
              <span>API Base URL</span>
              <input value={active.baseUrl} onChange={(e) => update("baseUrl", e.target.value)} placeholder="https://api.example.com/v1" spellCheck={false} />
            </label>
            <label>
              <span>模型标识</span>
              <input value={active.model} onChange={(e) => update("model", e.target.value)} placeholder="模型名称或 ID" spellCheck={false} />
            </label>
            <label>
              <span>API Key</span>
              <div className="secret-input">
                <input type={showKey ? "text" : "password"} value={active.apiKey} onChange={(e) => update("apiKey", e.target.value)} placeholder="sk-..." autoComplete="off" spellCheck={false} />
                <button type="button" onClick={() => setShowKey((x) => !x)} aria-label={showKey ? "隐藏密钥" : "显示密钥"}>{showKey ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </label>

            {!isTauri() ? (
              <label className="check-row">
                <input type="checkbox" checked={active.rememberKey} onChange={(e) => update("rememberKey", e.target.checked)} />
                <span><strong>在此浏览器记住密钥</strong><small>开启后密钥会以明文保存在浏览器本地存储，仅建议在私人设备使用。</small></span>
              </label>
            ) : (
              <div className="secure-note"><ShieldCheck size={18} /><span>密钥将保存在 Windows 凭据管理器中。</span></div>
            )}

            <label className={`check-row default-choice ${!active.verified ? "disabled" : ""}`}>
              <input type="radio" name="default-model" checked={draftDefault === active.id} disabled={!active.verified} onChange={() => setDraftDefault(active.id)} />
              <span><strong>设为默认模型</strong><small>{active.verified ? "翻译时优先使用此模型" : "请先完成连接测试"}</small></span>
            </label>

            {notice && <div className={`settings-notice ${notice.kind}`}>{notice.text}</div>}

            <div className="form-actions">
              <button className="danger-ghost" onClick={remove}><Trash2 size={16} /> 删除</button>
              <button className="secondary-button" onClick={verify} disabled={testing}>{testing ? <LoaderCircle className="spin" size={16} /> : <ShieldCheck size={16} />} 测试连接</button>
            </div>
          </div>
        </div>

        <footer className="modal-footer">
          <p>仅支持 OpenAI-compatible Chat Completions 接口。</p>
          <button className="primary-small" onClick={save} disabled={saving}>{saving ? "保存中…" : "保存设置"}</button>
        </footer>
      </section>
    </div>
  );
}
