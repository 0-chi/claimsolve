// シード投入(第13章-1)。架空企業6社 + 法人マスタ100社 +
// pastレビュー30件 + live案件8件 + 返答・評価サンプル。
// すべて架空データ(フッターに「デモデータ」注記)。

import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(pw: string): string {
  // MVP用の簡易ハッシュ(本番は bcrypt/argon2 に差し替え)
  return "sha256$" + createHash("sha256").update(pw).digest("hex");
}

const CATEGORIES = ["subscription", "moving", "beauty", "rental", "other"] as const;

// 法人番号は13桁の架空値
function corpNum(i: number): string {
  return "9" + String(1000000000000 + i).slice(-12);
}

const FEATURED = [
  { key: "sube", name: "サブスクエール株式会社", category: "subscription", domain: "subq.example.jp" },
  { key: "hikko", name: "らくらく引越サービス株式会社", category: "moving", domain: "raku-hikkoshi.example.jp" },
  { key: "biyou", name: "ビューティラボ株式会社", category: "beauty", domain: "beautylab.example.jp" },
  { key: "chintai", name: "スマイル賃貸管理株式会社", category: "rental", domain: "smile-chintai.example.jp" },
  { key: "kaiyaku", name: "解約サポート株式会社", category: "subscription", domain: "kaiyaku.example.jp" },
  { key: "esthe", name: "エステプレミア株式会社", category: "beauty", domain: "esthe-premia.example.jp" },
];

const SURNAME = ["山田", "佐藤", "田中", "鈴木", "高橋", "伊藤", "渡辺", "中村", "小林", "加藤"];

function slugify(key: string): string {
  return key;
}

async function main() {
  console.log("シード開始…");

  // 依存順にクリア
  await prisma.improvementNoteReview.deleteMany();
  await prisma.improvementNote.deleteMany();
  await prisma.reviewReply.deleteMany();
  await prisma.sameVote.deleteMany();
  await prisma.objection.deleteMany();
  await prisma.threadMessage.deleteMany();
  await prisma.magicToken.deleteMany();
  await prisma.review.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.report.deleteMany();
  await prisma.strike.deleteMany();
  await prisma.viewPass.deleteMany();
  await prisma.shareEvent.deleteMany();
  await prisma.companyWatch.deleteMany();
  await prisma.consumerSubscription.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.companyUser.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.moderationLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
  await prisma.corporateMaster.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.featureFlag.deleteMany();

  // --- フラグ(第4章)-----------------------------------------------------
  await prisma.featureFlag.createMany({
    data: [
      { key: "gate_enabled", value: false, updatedBy: "seed" },
      { key: "monetization_enabled", value: false, updatedBy: "seed" },
      { key: "live_enabled", value: false, updatedBy: "seed" }, // 初期値OFF
    ],
  });

  // --- プラン(名称・価格はDB管理)---------------------------------------
  await prisma.plan.createMany({
    data: [
      { key: "light", name: "ライトプラン", priceMonthly: 1980, active: true },
      { key: "consumer", name: "個人閲覧プラン", priceMonthly: 150, active: true },
    ],
  });

  // --- 法人マスタ100社 ----------------------------------------------------
  const masterData: {
    corporateNumber: string;
    name: string;
    address: string;
    category: string;
  }[] = [];

  // 先頭6社はフィーチャー企業と一致させる
  FEATURED.forEach((f, i) => {
    masterData.push({
      corporateNumber: corpNum(i),
      name: f.name,
      address: `東京都渋谷区架空町${i + 1}-${i + 1}`,
      category: f.category,
    });
  });
  // 残り94社
  const prefixes = ["ネクスト", "グロー", "スマート", "ハッピー", "クリア", "リンク", "ベスト", "トラスト", "フロンティア", "アクティブ"];
  const suffixes = ["サービス", "ホールディングス", "コーポレーション", "ジャパン", "パートナーズ", "システムズ", "コマース", "ソリューションズ"];
  for (let i = 6; i < 100; i++) {
    const name = `${prefixes[i % prefixes.length]}${suffixes[(i * 3) % suffixes.length]}株式会社`;
    masterData.push({
      corporateNumber: corpNum(i),
      name: `${name}${i}`,
      address: `東京都新宿区架空${i}-${(i % 30) + 1}`,
      category: CATEGORIES[i % CATEGORIES.length],
    });
  }
  await prisma.corporateMaster.createMany({ data: masterData });

  // --- 企業6社 ------------------------------------------------------------
  const companies = [];
  for (let i = 0; i < FEATURED.length; i++) {
    const f = FEATURED[i];
    const c = await prisma.company.create({
      data: {
        corporateNumber: corpNum(i),
        name: f.name,
        slug: slugify(f.key),
        address: `東京都渋谷区架空町${i + 1}-${i + 1}`,
        category: f.category,
        notifyEmail: `support@${f.domain}`,
        domainVerified: i < 3, // 一部は認証済み
      },
    });
    companies.push({ ...c, domain: f.domain });

    // 企業ユーザー(企業ドメインのメール)
    await prisma.companyUser.create({
      data: {
        companyId: c.id,
        email: `admin@${f.domain}`,
        passwordHash: hashPassword("password123"),
      },
    });
  }

  // 1社目にライトプラン(トライアル)を付与
  await prisma.subscription.create({
    data: {
      companyId: companies[0].id,
      planKey: "light",
      status: "trial",
      trialEndsAt: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
      cardRegistered: true,
    },
  });

  // --- 消費者ユーザー -----------------------------------------------------
  const users = [];
  for (let i = 0; i < 35; i++) {
    const u = await prisma.user.create({
      data: {
        displayName: `${SURNAME[i % SURNAME.length]}さん${i + 1}`,
        email: `user${i + 1}@example.com`,
        phone: `09000${String(100000 + i).slice(-6)}`,
        kycStatus: i % 7 === 0 ? "verified" : "none",
      },
    });
    users.push(u);
  }

  // --- pastレビュー30件 ---------------------------------------------------
  // 分布: A=8, B=7, C=6, D=5, E=3(集計中), F=1(集計中)
  const distribution = [8, 7, 6, 5, 3, 1];
  const outcomes = ["full_refund", "partial_refund", "replacement", "apology_only", "no_action"] as const;
  const speeds = ["same_day", "within_3d", "within_1w", "over_2w", "none"] as const;
  const bodies = [
    "解約したいと申し出たところ、電話がつながらず何度もかけ直す羽目になりました。最終的に対応してもらえましたが、手続き完了まで想定よりかなり時間がかかり不満が残りました。今後の改善を強く期待しています。",
    "初回の問い合わせから折り返しが早く、こちらの状況を丁寧にヒアリングしてくれました。提示された解決策も納得のいくもので、対応そのものには満足しています。窓口の姿勢は評価できると感じました。",
    "料金の二重請求について問い合わせたところ、確認に時間はかかったものの最終的に全額返金されました。担当者の説明が分かりやすく、こちらの不安に寄り添ってくれた点は好印象でした。",
    "サービス品質に問題があり連絡しましたが、謝罪のみで具体的な補償はありませんでした。誠意は感じられたものの、実質的な解決には至らず、モヤモヤした気持ちが残っています。",
    "問い合わせても定型文の返信ばかりで、こちらの質問にきちんと答えてもらえませんでした。何度もたらい回しにされ、結局自分で解決するしかありませんでした。対応体制の見直しを望みます。",
  ];
  let userIdx = 0;
  let pastCount = 0;
  const monthsAgo = (n: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    return d;
  };
  for (let ci = 0; ci < companies.length; ci++) {
    const count = distribution[ci];
    for (let k = 0; k < count; k++) {
      const outcome = outcomes[(ci + k) % outcomes.length];
      const satisfaction = 4 + ((ci * 2 + k * 3) % 7); // 4〜10
      const body = bodies[(ci + k) % bodies.length] + (k % 2 === 0 ? "以上が体験の記録です。" : "");
      const ym = monthsAgo((ci + k) % 20); // 直近20ヶ月内に分散
      const complaint = await prisma.complaint.create({
        data: {
          userId: users[userIdx % users.length].id,
          companyId: companies[ci].id,
          lane: "past",
          category: companies[ci].category,
          title: `${companies[ci].name}への対応レビュー #${k + 1}`,
          body,
          occurredYearMonth: `${ym.getFullYear()}-${String(ym.getMonth() + 1).padStart(2, "0")}`,
          status: "published",
          publishedAt: monthsAgo((ci + k) % 18),
          ipHash: "seed",
          userAgent: "seed",
        },
      });
      await prisma.review.create({
        data: {
          complaintId: complaint.id,
          companyId: companies[ci].id,
          userId: complaint.userId,
          satisfaction,
          outcome,
          wouldUseAgain: satisfaction >= 7,
          firstReplySpeed: speeds[(ci + k) % speeds.length],
          transferCount: (ci + k) % 3,
          agentScore: 4 + ((ci + k) % 7),
          supervisorScore: k % 3 === 0 ? null : 5 + ((ci + k) % 5),
          noEscalation: k % 3 === 0,
          externalChannels: k % 4 === 0 ? "consumer_center" : "none",
          totalDays: 3 + ((ci + k) % 25),
          comment: k % 2 === 0 ? "また同じことが起きないか不安です。" : "",
          publishedAt: complaint.publishedAt,
        },
      });
      userIdx++;
      pastCount++;
    }
  }
  console.log(`past レビュー ${pastCount}件`);

  // 公開返信 + 改善済みバッジのサンプル(1社目のライトプラン企業)
  const firstCompanyReviews = await prisma.review.findMany({
    where: { companyId: companies[0].id },
    take: 2,
  });
  if (firstCompanyReviews.length > 0) {
    await prisma.reviewReply.create({
      data: {
        reviewId: firstCompanyReviews[0].id,
        companyId: companies[0].id,
        body: "この度はご不便をおかけし申し訳ありませんでした。窓口体制を見直し、折り返しまでの時間短縮に取り組んでおります。",
      },
    });
    const note = await prisma.improvementNote.create({
      data: {
        companyId: companies[0].id,
        body: "ご指摘を受けて、解約専用の受付窓口を新設し、平均折り返し時間を2営業日から当日対応へ短縮しました。",
        editHistory: "[]",
      },
    });
    for (const r of firstCompanyReviews) {
      await prisma.improvementNoteReview.create({
        data: { noteId: note.id, reviewId: r.id },
      });
    }
  }

  // --- live案件8件(live_enabled=OFF のままデータのみ投入)-----------------
  const liveStatuses = [
    "published_unnotified",
    "published_awaiting",
    "replied",
    "resolved",
    "unresolved",
    "awaiting_eval_paused",
    "disputed",
    "reopened",
  ];
  for (let i = 0; i < 8; i++) {
    const company = companies[i % 3]; // A/B/C に集中
    const status = liveStatuses[i];
    const notified = status !== "published_unnotified";
    const replied = ["replied", "resolved", "unresolved", "disputed", "reopened"].includes(status);
    const complaint = await prisma.complaint.create({
      data: {
        userId: users[(i + 20) % users.length].id,
        companyId: company.id,
        lane: "live",
        category: company.category,
        title: `【進行中】${company.name}とのトラブル #${i + 1}`,
        body: "現在対応が滞っており困っています。返金と再発防止の説明を求めていますが、進展がありません。早期の解決を希望します。",
        desiredResolutions: "全額返金と原因説明",
        occurredAt: monthsAgo(1),
        status,
        publishedAt: status === "pending_review" ? null : monthsAgo(1),
        notifiedAt: notified ? monthsAgo(1) : null,
        firstReplyAt: replied ? monthsAgo(0) : null,
        sameCount: i * 2,
        ipHash: "seed",
        userAgent: "seed",
      },
    });

    // マジックトークン(投稿者専用ページ)。1件目に固定トークンでデモ用。
    await prisma.magicToken.create({
      data: {
        userId: complaint.userId,
        complaintId: complaint.id,
        token: i === 0 ? "demo-magic-token-0001" : `magic-${complaint.id}`,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    });

    if (notified) {
      await prisma.threadMessage.create({
        data: { complaintId: complaint.id, senderType: "user", body: "ご対応をお願いいたします。" },
      });
    }
    if (replied) {
      await prisma.threadMessage.create({
        data: {
          complaintId: complaint.id,
          senderType: "company",
          body: "ご連絡ありがとうございます。担当部署にて確認のうえ折り返しご連絡いたします。",
        },
      });
      // 解決/未解決には評価を付ける
      if (["resolved", "unresolved", "reopened"].includes(status)) {
        await prisma.review.create({
          data: {
            complaintId: complaint.id,
            companyId: company.id,
            userId: complaint.userId,
            satisfaction: status === "resolved" ? 9 : 5,
            outcome: status === "resolved" ? "full_refund" : "apology_only",
            wouldUseAgain: status === "resolved",
            firstReplySpeed: "within_3d",
            externalChannels: "none",
            totalDays: 10,
            comment: "",
            publishedAt: monthsAgo(0),
          },
        });
      }
    }
    // 係争中バッジの元となる異議
    if (status === "disputed") {
      await prisma.objection.create({
        data: {
          complaintId: complaint.id,
          reason: "記載内容が事実と異なります。",
          status: "kept_disputed",
          userReplyDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  console.log("live 案件 8件");

  // --- silent(沈黙レポート)20件 -----------------------------------------
  const silenceReasonPool = [
    ["too_much_hassle"],
    ["no_contact_found"], // 不達
    ["could_not_reach"], // 不達
    ["no_reply_received"], // 不達
    ["felt_pointless"],
    ["feared_conflict"],
    ["ongoing_relationship"],
    ["not_worth_it"],
    ["too_late"],
    ["my_own_fault"],
    ["no_contact_found", "felt_pointless"],
    ["could_not_reach", "not_worth_it"],
  ];
  const silentBodies = [
    "解約したかったけれど、問い合わせ窓口がどこにあるのか分からず、探すのに疲れて結局そのままにしてしまいました。誰かに相談することもなく諦めました。",
    "電話をかけても全く繋がらず、フォームを送っても自動返信だけ。何度か試したものの、時間ばかり取られるので言うのをやめました。もう関わりたくありません。",
    "金額としては小さかったので、わざわざ手間をかけて連絡するほどではないと判断しました。ただ、対応してほしかった気持ちは残っています。",
    "揉めるのが怖かったし、今後も使う予定があったので、波風を立てたくなくて何も言えませんでした。本当は改善してほしかったです。",
    "問い合わせフォームから送ったのに一週間経っても返事が来ず、催促する気力もなくなってそのまま放置してしまいました。",
  ];
  const silentDistribution = [6, 5, 4, 3, 1, 1]; // A..F の silent 件数(合計20)
  let silentUserIdx = 10;
  let silentTotal = 0;
  for (let ci = 0; ci < companies.length; ci++) {
    for (let k = 0; k < silentDistribution[ci]; k++) {
      const reasons = silenceReasonPool[(ci * 2 + k) % silenceReasonPool.length];
      const ym = monthsAgo((ci + k) % 20);
      await prisma.complaint.create({
        data: {
          userId: users[silentUserIdx % users.length].id,
          companyId: companies[ci].id,
          lane: "silent",
          category: companies[ci].category,
          title: `${companies[ci].name}に言わなかった不満 #${k + 1}`,
          body: silentBodies[(ci + k) % silentBodies.length],
          occurredYearMonth: `${ym.getFullYear()}-${String(ym.getMonth() + 1).padStart(2, "0")}`,
          silenceReasons: reasons.join(","),
          silentWouldUseAgain: k % 3 === 0 ? false : k % 3 === 1 ? true : null,
          desiredOutcome: k % 2 === 0 ? "せめて一言、謝罪と説明がほしかった。" : null,
          status: "published",
          publishedAt: monthsAgo((ci + k) % 18),
          ipHash: "seed",
          userAgent: "seed",
        },
      });
      silentUserIdx++;
      silentTotal++;
    }
  }
  console.log(`silent 沈黙レポート ${silentTotal}件`);

  const totalPublicReviews = await prisma.review.count({
    where: { complaint: { status: { in: ["published"] } } },
  });
  console.log(`公開pastレビュー総数(ゲート判定用の一部): ${totalPublicReviews}`);
  console.log("シード完了。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
