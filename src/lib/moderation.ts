// 投稿審査(ModerationService)。第5.1章の2層チェック。
// モック = 正規表現 + 辞書。本番は LLM(Claude API)差し替え前提。
// past/live の本文・レビューcomment・企業返信・改善報告すべてに適用する。

export type ModerationSeverity = "hard" | "soft";

export interface ModerationIssue {
  severity: ModerationSeverity;
  category: string;
  message: string;
  match: string;
  suggestion?: string; // ソフト警告の言い換え候補
}

export interface ModerationResult {
  ok: boolean; // ハードブロックが無ければ true(=投稿可能)
  issues: ModerationIssue[];
  hard: ModerationIssue[];
  soft: ModerationIssue[];
}

export interface ModerationService {
  check(text: string): Promise<ModerationResult>;
}

// ---- ハードブロック(投稿不可) --------------------------------------------
const HARD_RULES: { category: string; message: string; re: RegExp }[] = [
  {
    category: "phone",
    message: "電話番号は記載できません",
    re: /(?:0\d{1,4}-\d{1,4}-\d{3,4})|(?:0\d{9,10})/g,
  },
  {
    category: "email",
    message: "メールアドレスは記載できません",
    re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  },
  {
    category: "url",
    message: "外部URLは記載できません",
    re: /https?:\/\/[^\s]+/gi,
  },
  {
    category: "account_number",
    message: "口座番号など金融情報は記載できません",
    re: /口座番号\s*[:：]?\s*\d{5,}/g,
  },
  {
    category: "address_number",
    message: "住所番地は記載できません",
    re: /\d+丁目\d+番地?\d*号?/g,
  },
  {
    category: "vehicle",
    message: "車両ナンバーは記載できません",
    re: /(?:品川|練馬|なにわ|横浜|名古屋|札幌)\s?\d{1,3}\s?[あ-ん]\s?\d{1,4}/g,
  },
  {
    category: "hate",
    message: "差別的・ヘイト表現は投稿できません",
    re: /(死ね|殺すぞ|shine|ゴキブリ野郎)/gi,
  },
  {
    category: "threat",
    message: "脅迫・危害予告は投稿できません",
    re: /(殺す|危害を加える|爆破|放火してやる)/g,
  },
  {
    category: "personal_name",
    message: "従業員・担当者の個人名(フルネーム)は記載できません",
    re: /担当者?の?[一-龠]{1,3}\s?[一-龠]{1,3}(?:さん|氏|様)?という(?:人物|人|男|女)/g,
  },
];

// ---- ソフト警告(投稿可能・言い換え候補) ----------------------------------
const SOFT_RULES: {
  category: string;
  message: string;
  re: RegExp;
  suggestion: string;
}[] = [
  {
    category: "crime_assertion",
    message: "犯罪の断定は避けましょう",
    re: /(詐欺|違法|犯罪|横領)(?:だ|です|でした|行為)?/g,
    suggestion: "「〜と感じた」「〜のように思えた」など主観の表現に言い換えましょう",
  },
  {
    category: "personal_attack",
    message: "人格攻撃は避けましょう",
    re: /(バカ|馬鹿|アホ|無能|クズ|最低な人間)/g,
    suggestion: "対応内容そのものへの評価に言い換えましょう",
  },
  {
    category: "appearance_nationality",
    message: "容姿・国籍・性別への言及は避けましょう",
    re: /(ブス|デブ|チビ|外国人のくせに|女のくせに|男のくせに)/g,
    suggestion: "対応の事実に絞って記載しましょう",
  },
  {
    category: "speculation",
    message: "根拠のない憶測は避けましょう",
    re: /(たぶん|おそらく|きっと)[^。]{0,15}(だろう|に違いない|はずだ)/g,
    suggestion: "確認できた事実のみを記載しましょう",
  },
];

class RegexModerationService implements ModerationService {
  async check(text: string): Promise<ModerationResult> {
    return this.checkSync(text);
  }

  checkSync(text: string): ModerationResult {
    const hard: ModerationIssue[] = [];
    const soft: ModerationIssue[] = [];

    for (const rule of HARD_RULES) {
      const matches = text.match(rule.re);
      if (matches) {
        for (const m of new Set(matches)) {
          hard.push({
            severity: "hard",
            category: rule.category,
            message: rule.message,
            match: m,
          });
        }
      }
    }

    for (const rule of SOFT_RULES) {
      const matches = text.match(rule.re);
      if (matches) {
        for (const m of new Set(matches)) {
          soft.push({
            severity: "soft",
            category: rule.category,
            message: rule.message,
            match: m,
            suggestion: rule.suggestion,
          });
        }
      }
    }

    return {
      ok: hard.length === 0,
      issues: [...hard, ...soft],
      hard,
      soft,
    };
  }
}

// ---------------------------------------------------------------------------
// 本番: Claude API による審査(ANTHROPIC_API_KEY 設定時)。
// 正規表現を先に通し(確実な検出は即ブロック・API代の節約)、その後 LLM で
// 個人名・特定可能情報・脅迫など正規表現では拾えないものを追加検出する。
// API失敗時は正規表現の結果にフォールバック(審査が止まって投稿不能にならない)。
// ---------------------------------------------------------------------------
class LlmModerationService implements ModerationService {
  private regex = new RegexModerationService();
  private model = process.env.ANTHROPIC_MODERATION_MODEL || "claude-haiku-4-5-20251001";

  async check(text: string): Promise<ModerationResult> {
    const base = this.regex.checkSync(text);
    // 正規表現で既にハードブロック、または短すぎる場合はLLM不要
    if (!base.ok || text.trim().length < 10) return base;

    try {
      const extra = await this.llmIssues(text);
      if (extra.length === 0) return base;
      const hard = [...base.hard, ...extra.filter((i) => i.severity === "hard")];
      const soft = [...base.soft, ...extra.filter((i) => i.severity === "soft")];
      return { ok: hard.length === 0, issues: [...hard, ...soft], hard, soft };
    } catch (e) {
      console.error("[Moderation LLM] 失敗(正規表現のみで判定):", e);
      return base;
    }
  }

  private async llmIssues(text: string): Promise<ModerationIssue[]> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctl.signal,
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 600,
          system:
            "あなたは日本語レビューサイトの投稿審査係です。投稿文から次の問題だけを検出し、JSON配列のみを返します。" +
            '形式: [{"severity":"hard"|"soft","category":"...","message":"...","match":"該当箇所","suggestion":"言い換え案(softのみ)"}]\n' +
            "hard(投稿不可): 個人のフルネーム・自宅住所など個人を特定できる情報 / 脅迫・危害予告 / 差別・ヘイト表現 / なりすましの自白\n" +
            "soft(警告のみ): 犯罪の断定(詐欺だ等) / 人格攻撃 / 容姿・国籍・性別への言及 / 根拠のない憶測\n" +
            "企業名・店舗名・部署名・役職名は問題ではありません。問題が無ければ [] を返します。JSON以外は出力しないこと。",
          messages: [{ role: "user", content: text.slice(0, 4000) }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic ${res.status}`);
      const j = (await res.json()) as { content?: { type: string; text?: string }[] };
      const raw = j.content?.find((c) => c.type === "text")?.text ?? "[]";
      const jsonText = raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1) || "[]";
      const arr = JSON.parse(jsonText) as Partial<ModerationIssue>[];
      return arr
        .filter((i) => i && (i.severity === "hard" || i.severity === "soft") && i.match)
        .map((i) => ({
          severity: i.severity as ModerationSeverity,
          category: i.category || "llm",
          message: i.message || (i.severity === "hard" ? "投稿できない表現が含まれています" : "表現を見直しましょう"),
          match: String(i.match).slice(0, 100),
          ...(i.suggestion ? { suggestion: i.suggestion } : {}),
        }));
    } finally {
      clearTimeout(timer);
    }
  }
}

export function getModerationService(): ModerationService {
  if (process.env.ANTHROPIC_API_KEY) return new LlmModerationService();
  return new RegexModerationService();
}

export const moderationService = getModerationService();
