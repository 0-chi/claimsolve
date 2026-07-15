import RequestForm from "@/components/RequestForm";

export const metadata = { title: "削除・開示請求 | クレームソルブ" };

export default function RequestPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">削除・開示請求の窓口</h1>
      <p className="text-sm text-slate-500">
        個人情報保護法に基づく消去請求、発信者情報開示請求などを受け付けます。
        送信内容は運営の対応キューに登録されます。
      </p>
      <RequestForm />
    </div>
  );
}
