"use client";
import { useState } from "react";
import { subscribeToPush } from "@/lib/push-client";
const MSG: Record<string, string> = { subscribed: "تم تفعيل الإشعارات", unsupported: "المتصفح لا يدعم الإشعارات هنا. على الآيفون: أضف التطبيق للشاشة الرئيسية أولًا", denied: "تم رفض إذن الإشعارات من إعدادات المتصفح", "no-key": "الإشعارات غير مُهيَّأة على الخادم بعد" };
export function PushOptIn() {
  const [msg, setMsg] = useState("");
  return (
    <div className="grid gap-2">
      <button type="button" onClick={async () => setMsg(MSG[await subscribeToPush()])} className="min-h-11 rounded-xl border border-line px-4 text-start font-semibold">🔔 تفعيل إشعارات الهاتف</button>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}
