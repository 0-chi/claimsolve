import { redirect } from "next/navigation";

// 企業LPは /business に統合(マーケ設計書 v1.5 §4)
export default function ForCompaniesPage() {
  redirect("/business");
}
