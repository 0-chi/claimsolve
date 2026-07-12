import { NextRequest, NextResponse } from "next/server";
import {
  applyStrike,
  banUser,
  setCompanyFrozen,
  approveLiveComplaint,
  approveEmail,
  resolveReport,
  autoHideExpiredObjections,
} from "@/lib/admin-actions";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type } = body;
  try {
    switch (type) {
      case "ban":
        await banUser(body.userId, body.reason ?? "admin ban");
        break;
      case "strike":
        await applyStrike(body.userId, body.severity, body.reason ?? "");
        break;
      case "freeze":
        await setCompanyFrozen(body.companyId, !!body.frozen);
        break;
      case "approve_live":
        await approveLiveComplaint(body.complaintId);
        break;
      case "approve_email":
        await approveEmail(body.emailLogId);
        break;
      case "report":
        await resolveReport(body.reportId, body.status);
        break;
      case "auto_hide_objections":
        await autoHideExpiredObjections("admin");
        break;
      default:
        return NextResponse.json({ ok: false, code: "unknown" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, code: "error", message: String(e) }, { status: 500 });
  }
}
