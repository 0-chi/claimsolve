"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_LABELS, REPLY_SPEED_LABELS, EXTERNAL_CHANNEL_LABELS } from "@/lib/labels";
import { OUTCOME_LABELS, type Outcome } from "@/lib/scoring";
import { MIN_POST_CHARS, MIN_VIEWPASS_CHARS } from "@/lib/post-rules";

type Lane = "past" | "live";
type Step = "lane" | "company" | "content" | "evaluation" | "account" | "done";

interface CompanyResult {
  corporateNumber: string;
  name: string;
  address: string;
  category: string;
}

export default function PostForm({
  liveEnabled,
  presetCompany,
  presetLane,
}: {
  liveEnabled: boolean;
  presetCompany: { corporateNumber: string; name: string } | null;
  presetLane?: Lane;
}) {
  const router = useRouter();
  const [lane, setLane] = useState<Lane>(presetLane ?? "past");
  const [step, setStep] = useState<Step>(
    presetCompany ? "content" : liveEnabled && !presetLane ? "lane" : "company"
  );

  // 企業
  const [query, setQuery] = useState(presetCompany?.name ?? "");
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [company, setCompany] = useState<{ corporateNumber?: string; name: string } | null>(
    presetCompany
  );
  const [newCompanyMode, setNewCompanyMode] = useState(false);

  // 内容
  const [category, setCategory] = useState("subscription");
  const [title, setTitle] = useState("");
  const [occurredYearMonth, setOccurredYearMonth] = useState("");
  const [body, setBody] = useState("");
  const [desiredResolutions, setDesiredResolutions] = useState("");
  const [newCompanyEmail, setNewCompanyEmail] = useState("");
  const [ngResult, setNgResult] = useState<any>(null);

  // 評価
  const [satisfaction, setSatisfaction] = useState(7);
  const [outcome, setOutcome] = useState<Outcome>("partial_refund");
  const [wouldUseAgain, setWouldUseAgain] = useState(true);
  const [showOptional, setShowOptional] = useState(false);
  const [firstReplySpeed, setFirstReplySpeed] = useState("");
  const [transferCount, setTransferCount] = useState("");
  const [agentScore, setAgentScore] = useState("");
  const [supervisorScore, setSupervisorScore] = useState("");
  const [noEscalation, setNoEscalation] = useState(false);
  const [totalDays, setTotalDays] = useState("");
  const [inquiryCount, setInquiryCount] = useState("");
  const [noResponseFlag, setNoResponseFlag] = useState(false);
  const [externalChannels, setExternalChannels] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  // アカウント
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [mockHint, setMockHint] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // 企業サジェスト
  useEffect(() => {
    if (newCompanyMode || !query.trim() || company?.name === query) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/companies/search?q=${encodeURIComponent(query)}`);
      const j = await r.json();
      setResults(j.results ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [query, newCompanyMode, company]);

  const bodyLen = body.trim().length;
  const toPost = Math.max(0, MIN_POST_CHARS - bodyLen);
  const toViewPass = Math.max(0, MIN_VIEWPASS_CHARS - bodyLen);

  async function runNgCheck() {
    const r = await fetch("/api/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: body + "\n" + comment }),
    });
    setNgResult(await r.json());
  }

  async function sendSms() {
    const r = await fetch("/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const j = await r.json();
    setSmsSent(true);
    if (j.mockHint) setMockHint(j.mockHint);
  }

  function toggleChannel(c: string) {
    setExternalChannels((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  async function finalSubmitLive() {
    setError("");
    setSubmitting(true);
    try {
      const payload: any = {
        category,
        title: title || `${company?.name}への進行中トラブル`,
        body,
        desiredResolutions,
        occurredYearMonth,
        account: { displayName, email, phone, code },
      };
      if (newCompanyMode) payload.newCompany = { name: company?.name, category, notifyEmail: newCompanyEmail };
      else payload.corporateNumber = company?.corporateNumber;

      const r = await fetch("/api/complaints/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) {
        setError(j.message ?? "投稿に失敗しました。");
        setSubmitting(false);
        return;
      }
      setResult({ live: true, token: j.token });
      setStep("done");
    } catch {
      setError("通信エラーが発生しました。");
    }
    setSubmitting(false);
  }

  async function finalSubmit() {
    if (lane === "live") return finalSubmitLive();
    setError("");
    setSubmitting(true);
    try {
      const payload: any = {
        category,
        title: title || `${company?.name}への対応`,
        body,
        occurredYearMonth,
        review: {
          satisfaction,
          outcome,
          wouldUseAgain,
          inquiryCountToFirstContact: inquiryCount ? parseInt(inquiryCount) : null,
          noResponseFlag,
          firstReplySpeed: firstReplySpeed || null,
          transferCount: transferCount ? parseInt(transferCount) : null,
          agentScore: agentScore ? parseInt(agentScore) : null,
          supervisorScore: noEscalation ? null : supervisorScore ? parseInt(supervisorScore) : null,
          noEscalation,
          externalChannels: externalChannels.length ? externalChannels : ["none"],
          totalDays: totalDays ? parseInt(totalDays) : null,
          comment,
        },
        account: { displayName, email, phone, code },
      };
      if (newCompanyMode) payload.newCompany = { name: company?.name, category };
      else payload.corporateNumber = company?.corporateNumber;

      const r = await fetch("/api/complaints/past", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) {
        setError(j.message ?? "投稿に失敗しました。");
        setSubmitting(false);
        return;
      }
      setResult(j);
      setStep("done");
    } catch {
      setError("通信エラーが発生しました。");
    }
    setSubmitting(false);
  }

  // ---- 画面 ----------------------------------------------------------------
  return (
    <div className="space-y-4">
      <StepIndicator step={step} lane={lane} liveEnabled={liveEnabled} />

      {step === "lane" && liveEnabled && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">どちらを投稿しますか?</p>
          <button
            className="card w-full text-left hover:border-brand-500"
            onClick={() => {
              setLane("past");
              setStep("company");
            }}
          >
            <div className="font-semibold">終わったトラブルをレビューする</div>
            <p className="text-xs text-slate-500">過去の対応を評価して公開します。</p>
          </button>
          <button
            className="card w-full text-left hover:border-brand-500"
            onClick={() => {
              setLane("live");
              setStep("company");
            }}
          >
            <div className="font-semibold">進行中のトラブルを企業に届ける</div>
            <p className="text-xs text-slate-500">企業に通知し、非公開スレッドで解決を目指します。</p>
          </button>
        </div>
      )}

      {step === "company" && (
        <div className="card space-y-3">
          <label className="label">企業を選択</label>
          {!newCompanyMode ? (
            <>
              <input
                className="input"
                placeholder="企業名・法人番号で検索"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCompany(null);
                }}
              />
              {results.length > 0 && (
                <ul className="divide-y rounded-lg border border-slate-200">
                  {results.map((r) => (
                    <li key={r.corporateNumber}>
                      <button
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          setCompany({ corporateNumber: r.corporateNumber, name: r.name });
                          setQuery(r.name);
                          setCategory(r.category);
                          setResults([]);
                        }}
                      >
                        {r.name}
                        <span className="ml-2 text-xs text-slate-400">{r.corporateNumber}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                className="text-xs text-brand-700 hover:underline"
                onClick={() => {
                  setNewCompanyMode(true);
                  setCompany({ name: "" });
                }}
              >
                + 新規企業として登録
              </button>
            </>
          ) : (
            <>
              <input
                className="input"
                placeholder="企業名"
                value={company?.name ?? ""}
                onChange={(e) => setCompany({ name: e.target.value })}
              />
              {lane === "live" && (
                <input
                  className="input"
                  placeholder="企業のメールアドレス(任意・通知に使用)"
                  value={newCompanyEmail}
                  onChange={(e) => setNewCompanyEmail(e.target.value)}
                />
              )}
              <button
                className="text-xs text-slate-500 hover:underline"
                onClick={() => {
                  setNewCompanyMode(false);
                  setCompany(null);
                }}
              >
                ← 検索に戻る
              </button>
            </>
          )}
          <button
            className="btn-primary w-full"
            disabled={!company?.name}
            onClick={() => setStep("content")}
          >
            次へ
          </button>
        </div>
      )}

      {step === "content" && (
        <div className="card space-y-3">
          <div className="text-sm font-semibold">{company?.name}</div>
          <div>
            <label className="label">カテゴリ</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">タイトル</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例:解約手続きに時間がかかった" />
          </div>
          <div>
            <label className="label">発生時期(必須)</label>
            <input type="month" className="input" value={occurredYearMonth} onChange={(e) => setOccurredYearMonth(e.target.value)} />
          </div>
          <div>
            <label className="label">本文</label>
            <textarea
              className="input h-40"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setNgResult(null);
              }}
              placeholder="対応の経緯を具体的にお書きください(個人名・電話番号・URLは記載できません)"
            />
            <div className="mt-1 flex justify-between text-xs">
              <span className={toPost > 0 ? "text-rose-500" : "text-emerald-600"}>
                {toPost > 0 ? `投稿可能まで${toPost}字` : "投稿可能"}
              </span>
              <span className={toViewPass > 0 ? "text-slate-400" : "text-emerald-600"}>
                {toViewPass > 0 ? `閲覧権獲得まで${toViewPass}字` : "閲覧権獲得ライン到達"}
              </span>
            </div>
          </div>

          {lane === "live" && (
            <div>
              <label className="label">希望する解決(企業に伝わります)</label>
              <input className="input" value={desiredResolutions} onChange={(e) => setDesiredResolutions(e.target.value)} placeholder="例:全額返金と原因説明" />
            </div>
          )}

          <button className="btn-outline w-full" onClick={runNgCheck}>
            NGワードチェック
          </button>
          {ngResult && <NgResultView result={ngResult} />}

          <button
            className="btn-primary w-full"
            disabled={toPost > 0 || !occurredYearMonth || (ngResult && !ngResult.ok)}
            onClick={() => setStep(lane === "live" ? "account" : "evaluation")}
          >
            {lane === "live" ? "アカウント登録へ" : "評価に進む"}
          </button>
          {ngResult && !ngResult.ok && (
            <p className="text-center text-xs text-rose-500">投稿できない表現を修正してください。</p>
          )}
        </div>
      )}

      {step === "evaluation" && (
        <div className="card space-y-4">
          <p className="text-sm text-slate-500">必須は3問だけ。詳細評点は任意です。</p>

          <div>
            <label className="label">① 対応への納得度(4〜10)</label>
            <input
              type="range"
              min={4}
              max={10}
              value={satisfaction}
              onChange={(e) => setSatisfaction(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-center text-lg font-bold">{satisfaction}</div>
          </div>

          <div>
            <label className="label">② 解決結果</label>
            <div className="mt-1 grid grid-cols-1 gap-1">
              {(Object.keys(OUTCOME_LABELS) as Outcome[]).map((o) => (
                <label key={o} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${outcome === o ? "border-brand-500 bg-brand-50" : "border-slate-200"}`}>
                  <input type="radio" checked={outcome === o} onChange={() => setOutcome(o)} />
                  {OUTCOME_LABELS[o]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">③ また使いたいか</label>
            <div className="mt-1 flex gap-2">
              <button
                className={`btn flex-1 ${wouldUseAgain ? "bg-brand-600 text-white" : "border border-slate-300"}`}
                onClick={() => setWouldUseAgain(true)}
              >
                はい
              </button>
              <button
                className={`btn flex-1 ${!wouldUseAgain ? "bg-slate-700 text-white" : "border border-slate-300"}`}
                onClick={() => setWouldUseAgain(false)}
              >
                いいえ
              </button>
            </div>
          </div>

          <button className="text-xs text-brand-700 hover:underline" onClick={() => setShowOptional(!showOptional)}>
            {showOptional ? "▲ 詳細評点を閉じる" : "▼ 詳細評点を入力(任意)"}
          </button>

          {showOptional && (
            <div className="space-y-3 rounded-lg bg-slate-50 p-3">
              <div>
                <label className="label">初回返答までの問い合わせ回数</label>
                <div className="flex items-center gap-2">
                  <input className="input" type="number" value={inquiryCount} disabled={noResponseFlag} onChange={(e) => setInquiryCount(e.target.value)} />
                  <label className="flex items-center gap-1 whitespace-nowrap text-xs">
                    <input type="checkbox" checked={noResponseFlag} onChange={(e) => setNoResponseFlag(e.target.checked)} />
                    対応されなかった
                  </label>
                </div>
              </div>
              <div>
                <label className="label">初回返答速度</label>
                <select className="input" value={firstReplySpeed} onChange={(e) => setFirstReplySpeed(e.target.value)}>
                  <option value="">未選択</option>
                  {Object.entries(REPLY_SPEED_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">たらい回し回数</label>
                  <input className="input" type="number" value={transferCount} onChange={(e) => setTransferCount(e.target.value)} />
                </div>
                <div>
                  <label className="label">解決までの日数</label>
                  <input className="input" type="number" value={totalDays} onChange={(e) => setTotalDays(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">担当者スコア(0〜10)</label>
                  <input className="input" type="number" min={0} max={10} value={agentScore} onChange={(e) => setAgentScore(e.target.value)} />
                </div>
                <div>
                  <label className="label">上長スコア(0〜10)</label>
                  <input className="input" type="number" min={0} max={10} value={supervisorScore} disabled={noEscalation} onChange={(e) => setSupervisorScore(e.target.value)} />
                  <label className="mt-1 flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={noEscalation} onChange={(e) => setNoEscalation(e.target.checked)} />
                    エスカレーションなし
                  </label>
                </div>
              </div>
              <div>
                <label className="label">利用した外部窓口(複数選択可)</label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(EXTERNAL_CHANNEL_LABELS).filter(([k]) => k !== "none").map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => toggleChannel(k)}
                      className={`chip ${externalChannels.includes(k) ? "bg-brand-600 text-white" : "bg-white ring-1 ring-slate-200"}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">公開コメント(任意)</label>
                <textarea className="input h-20" value={comment} onChange={(e) => setComment(e.target.value)} />
              </div>
            </div>
          )}

          {/* 送信ボタン押下後にアカウント登録を挿入(順序変更禁止) */}
          <button className="btn-primary w-full" onClick={() => setStep("account")}>
            送信
          </button>
        </div>
      )}

      {step === "account" && (
        <div className="card space-y-3">
          <p className="text-sm font-semibold">アカウント登録</p>
          <p className="text-xs text-slate-500">実名は収集しません。ニックネームで投稿できます。</p>
          <div>
            <label className="label">ニックネーム</label>
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label className="label">メールアドレス</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">電話番号(SMS認証)</label>
            <div className="flex gap-2">
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09000000000" />
              <button className="btn-outline shrink-0" disabled={!phone} onClick={sendSms}>
                コード送信
              </button>
            </div>
          </div>
          {smsSent && (
            <div>
              <label className="label">認証コード</label>
              <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6桁" />
              {mockHint && (
                <p className="mt-1 text-xs text-amber-600">
                  【モック】認証コードは {mockHint} です。
                </p>
              )}
            </div>
          )}
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <button
            className="btn-primary w-full"
            disabled={submitting || !displayName || !email || !phone || !code}
            onClick={finalSubmit}
          >
            {submitting ? "送信中…" : "投稿を確定する"}
          </button>
          <button className="text-xs text-slate-500 hover:underline" onClick={() => setStep(lane === "live" ? "content" : "evaluation")}>
            ← 戻る
          </button>
        </div>
      )}

      {step === "done" && result?.live && (
        <div className="card space-y-3 text-center">
          <div className="text-3xl">📨</div>
          <p className="font-semibold">進行中トラブルを受け付けました</p>
          <p className="text-sm text-slate-600">
            運営の承認後に企業へ通知されます。専用ページのリンクをメールでお送りしました(72時間有効)。
          </p>
          <button className="btn-primary" onClick={() => router.push(`/m/${result.token}`)}>
            専用ページを開く
          </button>
        </div>
      )}

      {step === "done" && result && !result.live && (
        <div className="card space-y-3 text-center">
          <div className="text-3xl">✅</div>
          <p className="font-semibold">レビューを公開しました</p>
          <p className="text-sm text-slate-600">
            {result.viewPassGranted
              ? "本文100字以上のため、閲覧権(1ヶ月)と企業ウォッチ1社を付与しました。"
              : "本文が100字未満のため閲覧権は付与されませんでした(公開・スコア算入はされます)。"}
          </p>
          <div className="flex flex-col gap-2">
            <button
              className="btn-primary"
              onClick={() => router.push(`/company/${result.companyCorporateNumber}-${result.companySlug}`)}
            >
              企業ページを見る
            </button>
            <button className="btn-outline" onClick={() => router.push(`/review/${result.reviewId}`)}>
              投稿したレビューを見る
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: Step; lane: Lane; liveEnabled: boolean }) {
  const steps: { key: Step; label: string }[] = [
    { key: "company", label: "企業" },
    { key: "content", label: "内容" },
    { key: "evaluation", label: "評価" },
    { key: "account", label: "登録" },
  ];
  const activeIdx = steps.findIndex((s) => s.key === step);
  return (
    <div className="flex items-center gap-1 text-xs">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <span className={`chip ${i <= activeIdx ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400"}`}>
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="text-slate-300">→</span>}
        </div>
      ))}
    </div>
  );
}

function NgResultView({ result }: { result: any }) {
  if (result.ok && result.soft.length === 0) {
    return <p className="text-sm text-emerald-600">問題は見つかりませんでした。</p>;
  }
  return (
    <div className="space-y-2 text-xs">
      {result.hard.map((h: any, i: number) => (
        <div key={i} className="rounded bg-rose-50 p-2 text-rose-700">
          🚫 {h.message}(「{h.match}」)— この表現は投稿できません
        </div>
      ))}
      {result.soft.map((s: any, i: number) => (
        <div key={i} className="rounded bg-amber-50 p-2 text-amber-700">
          ⚠️ {s.message}(「{s.match}」)— {s.suggestion}
        </div>
      ))}
    </div>
  );
}
