import { CheckCircle2, Languages, SpellCheck2, TriangleAlert } from "lucide-react";
import type { Example, TranslationResult } from "../types";
import { MODE_LABELS } from "../types";

function Examples({ items }: { items: Example[] }) {
  return (
    <section className="result-section">
      <h3>例句</h3>
      <div className="examples">
        {items.map((example, index) => (
          <article className="example" key={`${example.source}-${index}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div><p>{example.source}</p><small>{example.translation}</small></div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ResultView({ result }: { result: TranslationResult }) {
  const badge = <span className="mode-badge"><Languages size={14} />{MODE_LABELS[result.detected_mode]}</span>;

  if (result.detected_mode === "foreign_to_zh") return (
    <div className="result-content">{badge}<p className="detected-language">检测到：{result.detected_language}</p><div className="translation-main">{result.translation}</div></div>
  );

  if (result.detected_mode === "zh_sentence") return (
    <div className="result-content">{badge}<div className="translation-main english">{result.translation}</div>{result.note && <p className="result-note">{result.note}</p>}</div>
  );

  if (result.detected_mode === "zh_term") return (
    <div className="result-content">
      {badge}
      <div className="word-hero"><div><h2>{result.english}</h2><p>{result.phonetic}</p></div><span>{result.part_of_speech}</span></div>
      <Examples items={result.examples} />
    </div>
  );

  if (result.detected_mode === "en_term") return (
    <div className="result-content">
      {badge}
      <div className="word-hero"><div><h2>{result.term}</h2><p>{result.phonetic}</p></div></div>
      <section className="result-section"><h3>释义</h3><ul className="meaning-list">{result.meanings.map((x) => <li key={x}>{x}</li>)}</ul></section>
      <section className="result-section"><h3>词根词缀</h3><p className="body-copy">{result.morphology}</p></section>
      <section className="result-section"><h3>同族词</h3><div className="family-grid">{result.family_words.map((x) => <div key={x.word}><strong>{x.word}</strong><span>{x.meaning}</span></div>)}</div></section>
      <Examples items={result.examples} />
    </div>
  );

  return (
    <div className="result-content">
      {badge}
      <div className={`grammar-status ${result.is_correct ? "correct" : "incorrect"}`}>
        {result.is_correct ? <CheckCircle2 size={22} /> : <TriangleAlert size={22} />}
        <div><strong>{result.is_correct ? "语法和用词正确" : "发现可以改进的地方"}</strong><span>{result.is_correct ? "已为你翻译成中文" : `共 ${result.issues.length} 处`}</span></div>
      </div>
      {result.is_correct ? (
        <div className="translation-main">{result.translation}</div>
      ) : (
        <>
          <section className="result-section"><h3>修正后的句子</h3><div className="correction"><SpellCheck2 size={18} /><p>{result.corrected}</p></div></section>
          <section className="result-section"><h3>修改说明</h3><div className="issues">{result.issues.map((issue, index) => <article key={`${issue.original}-${index}`}><div><del>{issue.original}</del><span>→</span><ins>{issue.replacement}</ins></div><p>{issue.reason}</p></article>)}</div></section>
        </>
      )}
    </div>
  );
}
