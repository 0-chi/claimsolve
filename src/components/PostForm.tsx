"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_LABELS, REPLY_SPEED_LABELS, EXTERNAL_CHANNEL_LABELS } from "@/lib/labels";
import {
  OUTCOME_LABELS,
  SILENCE_REASON_LABELS,
  SILENCE_REASONS,
  STAFF_CHANNEL_LABELS,
  STAFF_ISSUE_LABELS,
  type Outcome,
  type SilenceReason,
  type StaffChannel,
  type StaffIssue,
} from "@/lib/scoring";
import { MIN_POST_CHARS, MIN_VIEWPASS_CHARS, MAX_SILENCE_REASONS, MIN_STAFF_CHARS } from "@/lib/post-rules";
import { SHOW_VIEWPASS_UI } from "@/lib/ui-flags";
import { track } from "@/lib/track";

type Lane = "past" | "live" | "silent" | "staff";
type Step = "lane" | "company" | "content" | "evaluation" | "reasons" | "account" | "done";

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
    presetLane
      ? presetCompany
        ? "content"
        : "company"
      : presetCompany
        ? "content"
        : "lane"
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

  // silent(沈黙レポート)
  const [silenceReasons, setSilenceReasons] = useState<string[]>([]);
  const [silentWouldUseAgain, setSilentWouldUseAgain] = useState<boolean | null>(null);
  const [desiredOutcome, setDesiredOutcome] = useState("");

  // staff(担当者への申し出・完全非公開)
  const [department, setDepartment] = useState("");
  const [contactChannel, setContactChannel] = useState("phone");
  const [contactedDate, setContactedDate] = useState("");
  const [contactedSlot, setContactedSlot] = useState("午前");
  const [staffIssues, setStaffIssues] = useState<string[]>([]);

  // 通知の正直表示(v1.5 §1変更4): registered | has_notify | no_contact
  const [notifyState, setNotifyState] = useState<string | null>(null);

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

  // live レーンで企業が決まったら通知見込みを取得(正直表示)
  useEffect(() => {
    if (lane !== "live") {
      setNotifyState(null);
      return;
    }
    if (newCompanyMode) {
      setNotifyState(newCompanyEmail.trim() ? "has_notify" : "no_contact");
      return;
    }
    if (!company?.corporateNumber) {
      setNotifyState(null);
      return;
    }
    fetch(`/api/companies/status?corporateNumber=${company.corporateNumber}`)
      .then((r) => r.json())
      .then((j) => setNotifyState(j.state))
      .catch(() => setNotifyState(null));
  }, [lane, company, newCompanyMode, newCompanyEmail]);

  const bodyLen = body.trim().length;
  const minChars = lane === "staff" ? MIN_STAFF_CHARS : MIN_POST_CHARS;
  const toPost = Math.max(0, minChars - bodyLen);
  const toViewPass = Math.max(0, MIN_VIEWPASS_CHARS - bodyLen);
  const staffFieldsOk =
    lane !== "staff" || (department.trim().length > 0 && contactedDate.length > 0);

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

  function toggleReason(r: string) {
    setSilenceReasons((prev) => {
      if (prev.includes(r)) return prev.filter((x) => x !== r);
      if (prev.length >= MAX_SILENCE_REASONS) return prev; // 最大2つ
      return [...prev, r];
    });
  }

  async function finalSubmitSilent() {
    setError("");
    setSubmitting(true);
    try {
      const payload: any = {
        category,
        title: title || `${company?.name}への言わなかった不満`,
        body,
        occurredYearMonth,
        silenceReasons,
        silentWouldUseAgain,
        desiredOutcome,
        account: { displayName, email, phone, code },
      };
      if (newCompanyMode) payload.newCompany = { name: company?.name, category };
      else payload.corporateNumber = company?.corporateNumber;

      const r = await fetch("/api/complaints/silent", {
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
      setResult({ ...j, silent: true });
      track("post_complete", { lane });
      setStep("done");
    } catch {
      setError("通信エラーが発生しました。");
    }
    setSubmitting(false);
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
      track("post_complete", { lane });
      setStep("done");
    } catch {
      setError("通信エラーが発生しました。");
    }
    setSubmitting(false);
  }

  async function finalSubmitStaff() {
    setError("");
    setSubmitting(true);
    try {
      const payload: any = {
        category,
        department,
        contactChannel,
        contactedAt: `${contactedDate} ${contactedSlot}`,
        staffIssues,
        body,
        account: { displayName, email, phone, code },
      };
      if (newCompanyMode) payload.newCompany = { name: company?.name, category };
      else payload.corporateNumber = company?.corporateNumber;

      const r = await fetch("/api/complaints/staff", {
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
      setResult({ ...j, staff: true });
      track("post_complete", { lane });
      setStep("done");
    } catch {
      setError("通信エラーが発生しました。");
    }
    setSubmitting(false);
  }

  async function finalSubmit() {
    if (lane === "live") return finalSubmitLive();
    if (lane === "silent") return finalSubmitSilent();
    if (lane === "staff") return finalSubmitStaff();
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
      track("post_complete", { lane });
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

      {step === "lane" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">どれを投稿しますか?</p>
          <button
            className="card w-full text-left hover:border-brand-500"
            onClick={() => {
              setLane("past");
              setStep("company");
            }}
          >
            <div className="font-semibold">終わったトラブルを評価する</div>
            <p className="text-xs text-slate-500">過去の対応を評価して公開します(レビュー)。</p>
          </button>
          {liveEnabled && (
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
          )}
          <button
            className="card w-full text-left hover:border-brand-500"
            onClick={() => {
              setLane("silent");
              setStep("company");
            }}
          >
            <div className="font-semibold">言わずに終わった不満を記録する</div>
            <p className="text-xs text-slate-500">
              企業に一度も言わなかった不満を、「なぜ言わなかったか」とともに残します。
            </p>
          </button>
          <button
            className="card w-full text-left hover:border-brand-500"
            onClick={() => {
              setLane("staff");
              setStep("company");
            }}
          >
            <div className="font-semibold">担当者の対応について、企業に伝える</div>
            <p className="text-xs text-slate-500">
              完全非公開で企業にだけ届きます。公開ページには一切表示されません。
            </p>
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
            onClick={() => {
              track("post_start", { lane });
              setStep("content");
            }}
          >
            次へ
          </button>
        </div>
      )}

      {step === "content" && (
        <div className="card space-y-3">
          <div className="text-sm font-semibold">{company?.name}</div>

          {/* 通知の正直表示(liveのみ・3状態)v1.5 §1変更4 */}
          {lane === "live" && notifyState === "registered" && (
            <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
              この企業はクレソルに登録済みです。あなたの報告は運営の確認のうえ公開され、企業に届きます。返答があれば通知します。
            </div>
          )}
          {lane === "live" && notifyState === "has_notify" && (
            <div className="rounded-lg bg-sky-50 p-3 text-xs text-sky-800">
              この企業はまだクレソルに登録していません。報告は運営の確認のうえ公開され、通知メールも送りますが、返答があるかは分かりません。通知が届いた場合、返答がなかったことも記録として残ります。
            </div>
          )}
          {lane === "live" && notifyState === "no_contact" && (
            <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
              この企業への通知手段がまだありません。報告は運営の確認のうえ公開されますが、企業に届いたかどうかは記録されません。
            </div>
          )}
          <div>
            <label className="label">カテゴリ</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          {lane !== "staff" && (
            <>
              <div>
                <label className="label">タイトル</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例:解約手続きに時間がかかった" />
              </div>
              <div>
                <label className="label">発生時期(必須)</label>
                <input type="month" className="input" value={occurredYearMonth} onChange={(e) => setOccurredYearMonth(e.target.value)} />
              </div>
            </>
          )}

          {lane === "staff" && (
            <>
              <div className="rounded-lg bg-sky-50 p-3 text-xs text-sky-800">
                この申し出は<strong>完全非公開</strong>で企業にだけ届きます。目的は担当者個人の処罰ではなく、
                企業内の傾向把握です。
              </div>
              <div>
                <label className="label">部署・店舗名(必須)</label>
                <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="例:○○店 / カスタマーサポート窓口" />
              </div>
              <div>
                <label className="label">接触チャネル(必須)</label>
                <select className="input" value={contactChannel} onChange={(e) => setContactChannel(e.target.value)}>
                  {Object.entries(STAFF_CHANNEL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">接触日(必須)</label>
                  <input type="date" className="input" value={contactedDate} onChange={(e) => setContactedDate(e.target.value)} />
                </div>
                <div>
                  <label className="label">時間帯</label>
                  <select className="input" value={contactedSlot} onChange={(e) => setContactedSlot(e.target.value)}>
                    {["午前", "午後", "夕方", "夜"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">何が問題でしたか?(任意・複数選択)</label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(STAFF_ISSUE_LABELS).map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() =>
                        setStaffIssues((prev) =>
                          prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
                        )
                      }
                      className={`chip ${staffIssues.includes(k) ? "bg-brand-600 text-white" : "bg-white ring-1 ring-slate-200"}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <p className="rounded bg-amber-50 p-2 text-xs text-amber-700">
                担当者のお名前は書かないでください。日時と部署で企業側は確認できます。
              </p>
            </>
          )}
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
              {/* 閲覧権カウンター(読み放題運用中は非表示) */}
              {SHOW_VIEWPASS_UI &&
                (lane === "silent" ? (
                  <span className={toPost > 0 ? "text-slate-400" : "text-emerald-600"}>
                    {toPost > 0 ? "閲覧権(3日)まで50字" : "閲覧権(3日)獲得"}
                  </span>
                ) : lane === "staff" ? (
                  <span className={toPost > 0 ? "text-slate-400" : "text-emerald-600"}>
                    {toPost > 0 ? "閲覧権(24時間)まで80字" : "閲覧権(24時間)獲得"}
                  </span>
                ) : (
                  <span className={toViewPass > 0 ? "text-slate-400" : "text-emerald-600"}>
                    {toViewPass > 0 ? `閲覧権獲得まで${toViewPass}字` : "閲覧権獲得ライン到達"}
                  </span>
                ))}
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

          {/* 離脱の受け皿(v1.5 §2): 手間→silent / 担当者の対応→staff */}
          {(lane === "past" || lane === "live") && (
            <div className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-500">
              書くのが大変になったら:
              <button
                className="mx-1 text-brand-700 underline"
                onClick={() => {
                  track("lane_switch", { from: lane, to: "silent" });
                  setLane("silent");
                }}
              >
                言わずに終わった話なら、選ぶだけで記録できます(silent)
              </button>
              /
              <button
                className="mx-1 text-brand-700 underline"
                onClick={() => {
                  track("lane_switch", { from: lane, to: "staff" });
                  setLane("staff");
                }}
              >
                担当者の対応についてなら、企業にだけ非公開で届けられます
              </button>
            </div>
          )}

          <button
            className="btn-primary w-full"
            disabled={
              toPost > 0 ||
              (lane !== "staff" && !occurredYearMonth) ||
              !staffFieldsOk ||
              (ngResult && !ngResult.ok)
            }
            onClick={() =>
              setStep(
                lane === "live" || lane === "staff"
                  ? "account"
                  : lane === "silent"
                    ? "reasons"
                    : "evaluation"
              )
            }
          >
            {lane === "live" || lane === "staff"
              ? "アカウント登録へ"
              : lane === "silent"
                ? "理由の入力へ"
                : "評価に進む"}
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

      {step === "reasons" && (
        <div className="card space-y-4">
          <div>
            <p className="text-sm font-semibold">なぜ、企業に言わなかったのですか?</p>
            <p className="text-xs text-slate-500">
              これは企業への告発ではなく、あなたの行動の記録です。最大2つまで選べます。
            </p>
          </div>
          <div className="grid grid-cols-1 gap-1">
            {SILENCE_REASONS.map((r) => {
              const checked = silenceReasons.includes(r);
              const disabled = !checked && silenceReasons.length >= MAX_SILENCE_REASONS;
              return (
                <label
                  key={r}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    checked ? "border-brand-500 bg-brand-50" : disabled ? "border-slate-100 text-slate-300" : "border-slate-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleReason(r)}
                  />
                  {SILENCE_REASON_LABELS[r as SilenceReason]}
                </label>
              );
            })}
          </div>
          <p className="text-xs text-slate-400">選択中: {silenceReasons.length}/2</p>

          <div>
            <label className="label">この会社をまた使いますか?(任意)</label>
            <div className="mt-1 flex gap-2">
              <button className={`btn flex-1 ${silentWouldUseAgain === true ? "bg-brand-600 text-white" : "border border-slate-300"}`} onClick={() => setSilentWouldUseAgain(true)}>使う</button>
              <button className={`btn flex-1 ${silentWouldUseAgain === false ? "bg-slate-700 text-white" : "border border-slate-300"}`} onClick={() => setSilentWouldUseAgain(false)}>使わない</button>
              <button className={`btn flex-1 ${silentWouldUseAgain === null ? "bg-slate-200" : "border border-slate-300"}`} onClick={() => setSilentWouldUseAgain(null)}>未回答</button>
            </div>
          </div>
          <div>
            <label className="label">本当はどうしてほしかったですか?(任意)</label>
            <textarea className="input h-20" value={desiredOutcome} onChange={(e) => setDesiredOutcome(e.target.value)} />
          </div>

          <button
            className="btn-primary w-full"
            disabled={silenceReasons.length < 1}
            onClick={() => setStep("account")}
          >
            送信
          </button>
          <button className="text-xs text-slate-500 hover:underline" onClick={() => setStep("content")}>
            ← 内容に戻る
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
          <button className="text-xs text-slate-500 hover:underline" onClick={() => setStep(lane === "live" || lane === "staff" ? "content" : lane === "silent" ? "reasons" : "evaluation")}>
            ← 戻る
          </button>
        </div>
      )}

      {step === "done" && result?.staff && (
        <div className="card space-y-3 text-center">
          <div className="text-3xl">🔒</div>
          <p className="font-semibold">担当者への申し出を企業に届けました</p>
          <p className="text-sm text-slate-600">
            この申し出は完全非公開です。公開ページには一切表示されません。
            {SHOW_VIEWPASS_UI && "閲覧権(24時間)を付与しました。"}
          </p>
          <button className="btn-primary" onClick={() => router.push("/")}>
            トップへ戻る
          </button>
        </div>
      )}

      {step === "done" && result?.silent && (
        <div className="card space-y-3 text-center">
          <div className="text-3xl">📝</div>
          <p className="font-semibold">「言わずに終わった声」を記録しました</p>
          <p className="text-sm text-slate-600">
            {SHOW_VIEWPASS_UI && "本文50字以上のため、閲覧権(3日)を付与しました。"}
            このレポートはスコアには影響しません。
          </p>
          <div className="flex flex-col gap-2">
            <button
              className="btn-primary"
              onClick={() => router.push(`/company/${result.companyCorporateNumber}-${result.companySlug}`)}
            >
              企業ページを見る
            </button>
          </div>
        </div>
      )}

      {step === "done" && result?.live && (
        <div className="card space-y-3 text-center">
          <div className="text-3xl">📨</div>
          <p className="font-semibold">進行中トラブルを受け付けました</p>
          <p className="text-sm text-slate-600">
            運営の確認のうえ公開・通知されます。専用ページのリンクをメールでお送りしました(72時間有効)。
          </p>
          <button className="btn-primary" onClick={() => router.push(`/m/${result.token}`)}>
            専用ページを開く
          </button>
          {/* 公的窓口への案内(v1.5 §1変更5・常設) */}
          <div className="rounded-lg bg-slate-50 p-3 text-left text-xs text-slate-600">
            <p className="font-semibold">まず公的窓口へ相談を。その記録をここに。</p>
            <p className="mt-1">
              消費者ホットライン <strong className="text-base">188</strong>(いやや)に電話すると、
              最寄りの消費生活センターにつながります。専門相談員によるあっせん(企業への介入)は
              公的窓口だけができる対応です。
            </p>
          </div>
        </div>
      )}

      {step === "done" && result && !result.live && (
        <div className="card space-y-3 text-center">
          <div className="text-3xl">✅</div>
          <p className="font-semibold">レビューを公開しました</p>
          <p className="text-sm text-slate-600">
            {SHOW_VIEWPASS_UI
              ? result.viewPassGranted
                ? "本文100字以上のため、閲覧権(1ヶ月)と企業ウォッチ1社を付与しました。"
                : "本文が100字未満のため閲覧権は付与されませんでした(公開・スコア算入はされます)。"
              : "投稿ありがとうございます。あなたの記録が、次の誰かを守ります。"}
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

function StepIndicator({ step, lane }: { step: Step; lane: Lane; liveEnabled: boolean }) {
  const middle: { key: Step; label: string } =
    lane === "silent"
      ? { key: "reasons", label: "理由" }
      : lane === "live"
        ? { key: "content", label: "内容" }
        : { key: "evaluation", label: "評価" };
  const steps: { key: Step; label: string }[] = [
    { key: "company", label: "企業" },
    { key: "content", label: "内容" },
    ...(lane === "live" || lane === "staff" ? [] : [middle]),
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
