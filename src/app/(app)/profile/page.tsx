"use client";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { AvatarBuilder } from "@/components/AvatarBuilder";
import { LogoutButton } from "@/components/LogoutButton";
import { prof } from "@/i18n/profile";
import { parseAvatarKey, getDefaultAvatarConfig } from "@/lib/avataaars";
import Link from "next/link";

const p = prof.ar;

type ProfileData = {
  user: {
    id: number;
    firstName: string;
    lastName: string | null;
    phoneE164: string;
    gender: "male" | "female";
    avatarKey: string;
  };
  membership: {
    groupName: string;
    slot: number;
    currentPart: number | null;
  } | null;
  streak: {
    current: number;
    protections: number;
  };
  stats: {
    weeklyParts: number;
    monthlyParts: number;
    allTimeParts: number;
    commitment: number;
  };
};

type ModalType = "avatar" | "name" | "phone" | "pin" | null;

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Edit form states
  const [editName, setEditName] = useState({ firstName: "", lastName: "" });
  const [editPhone, setEditPhone] = useState("");
  const [editPin, setEditPin] = useState({ current: "", new: "", confirm: "" });

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="mt-6">
        <div className="text-center text-muted">جاري التحميل...</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mt-6">
        <div className="text-center text-muted">تعذّر تحميل البيانات</div>
      </main>
    );
  }

  const openAvatarModal = () => {
    setModal("avatar");
    setError("");
  };

  const openNameModal = () => {
    setEditName({
      firstName: data.user.firstName,
      lastName: data.user.lastName || "",
    });
    setModal("name");
    setError("");
  };

  const openPhoneModal = () => {
    setEditPhone("");
    setModal("phone");
    setError("");
  };

  const openPinModal = () => {
    setEditPin({ current: "", new: "", confirm: "" });
    setModal("pin");
    setError("");
  };

  const closeModal = () => {
    setModal(null);
    setError("");
    setSaving(false);
  };

  const handleSaveAvatar = async (avatarKey: string) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: avatarKey }),
      });
      if (!res.ok) throw new Error();
      setData((prev) => (prev ? { ...prev, user: { ...prev.user, avatarKey } } : null));
      closeModal();
    } catch {
      setError(p.edit.error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveName = async () => {
    if (!editName.firstName.trim()) {
      setError("الاسم الأول مطلوب");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editName.firstName.trim(),
          lastName: editName.lastName.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      setData((prev) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                firstName: editName.firstName.trim(),
                lastName: editName.lastName.trim() || null,
              },
            }
          : null
      );
      closeModal();
    } catch {
      setError(p.edit.error);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePhone = async () => {
    if (!editPhone.trim()) {
      setError("الرقم الجديد مطلوب");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile/phone", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPhone: editPhone.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error === "phone_taken") setError("الرقم مُستخدَم مسبقًا");
        else if (json.error === "invalid_phone") setError("الرقم غير صحيح");
        else if (json.error === "rate_limited") setError("محاولات كثيرة، حاول لاحقًا");
        else setError(p.phoneChange.error);
        return;
      }
      window.location.reload();
    } catch {
      setError(p.phoneChange.error);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePin = async () => {
    if (!editPin.current || !editPin.new || !editPin.confirm) {
      setError("كل الحقول مطلوبة");
      return;
    }
    if (editPin.new !== editPin.confirm) {
      setError(p.pin.mismatch);
      return;
    }
    if (editPin.new.length !== 6 || !/^\d{6}$/.test(editPin.new)) {
      setError(p.pin.weak);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile/pin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPin: editPin.current,
          newPin: editPin.new,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error === "wrong_current_pin") setError(p.pin.wrong);
        else if (json.error === "weak_pin") setError(p.pin.weak);
        else if (json.error === "rate_limited") setError("محاولات كثيرة، حاول لاحقًا");
        else setError(p.pin.error);
        return;
      }
      window.location.href = "/login";
    } catch {
      setError(p.pin.error);
    } finally {
      setSaving(false);
    }
  };

  const user = data.user;
  const membership = data.membership;
  const streak = data.streak;
  const stats = data.stats;

  // Parse avatar config for builder
  let avatarConfig;
  try {
    avatarConfig = parseAvatarKey(user.avatarKey);
  } catch {
    avatarConfig = getDefaultAvatarConfig();
  }

  return (
    <main className="mt-6 space-y-6">
      <h1 className="text-2xl font-bold">{p.title}</h1>

      {/* Personal Info */}
      <section className="rounded-2xl border border-line bg-surface p-6 space-y-4">
        <div className="flex items-center gap-4">
          <button
            onClick={openAvatarModal}
            className="focus:outline-none focus:ring-2 focus:ring-primary rounded-full"
          >
            <Avatar k={user.avatarKey} size={64} />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold">
              {user.firstName} {user.lastName || ""}
            </h2>
            <p className="text-sm text-muted">{user.phoneE164}</p>
          </div>
        </div>

        <div className="grid gap-3 border-t border-line pt-4">
          <div className="flex justify-between">
            <span className="text-muted">{p.gender}</span>
            <span className="font-semibold">{user.gender === "male" ? p.male : p.female}</span>
          </div>

          {membership && (
            <>
              <div className="flex justify-between">
                <span className="text-muted">{p.currentGroup}</span>
                <span className="font-semibold">{membership.groupName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">{p.slot}</span>
                <span className="font-semibold">{membership.slot}</span>
              </div>
              {membership.currentPart && (
                <div className="flex justify-between">
                  <span className="text-muted">{p.currentPart}</span>
                  <span className="font-semibold">{membership.currentPart}</span>
                </div>
              )}
            </>
          )}

          {!membership && <div className="text-center text-muted">{p.noGroup}</div>}
        </div>

        {/* Edit buttons */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-line">
          <button
            onClick={openNameModal}
            className="min-h-11 rounded-xl border border-line bg-background px-4 py-2 text-sm font-semibold hover:bg-surface"
          >
            تعديل الاسم
          </button>
          <button
            onClick={openPhoneModal}
            className="min-h-11 rounded-xl border border-line bg-background px-4 py-2 text-sm font-semibold hover:bg-surface"
          >
            تغيير الهاتف
          </button>
          <button
            onClick={openPinModal}
            className="col-span-2 min-h-11 rounded-xl border border-line bg-background px-4 py-2 text-sm font-semibold hover:bg-surface"
          >
            {p.changePin}
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="rounded-2xl border border-line bg-surface p-6 space-y-4">
        <h2 className="text-lg font-bold">{p.stats}</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{streak.current}</p>
            <p className="text-sm text-muted">{p.streak}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-dawn-text">{streak.protections}</p>
            <p className="text-sm text-muted">{p.protections}</p>
          </div>
        </div>

        <div className="border-t border-line pt-4 space-y-3">
          <h3 className="font-semibold">{p.partsRead}</h3>
          <div className="flex justify-between">
            <span className="text-muted">{p.weekly}</span>
            <span className="font-semibold">{stats.weeklyParts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{p.monthly}</span>
            <span className="font-semibold">{stats.monthlyParts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{p.allTime}</span>
            <span className="font-semibold">{stats.allTimeParts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{p.commitment}</span>
            <span className="font-semibold">{stats.commitment}%</span>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="space-y-3">
        <Link
          href="/notifications"
          className="block min-h-11 rounded-xl border border-line bg-surface px-4 py-3 text-center font-semibold"
        >
          {p.notificationSettings}
        </Link>
        <Link
          href="/history"
          className="block min-h-11 rounded-xl border border-line bg-surface px-4 py-3 text-center font-semibold"
        >
          {p.history}
        </Link>
        <LogoutButton />
      </div>

      {/* Avatar Modal - with custom builder */}
      {modal === "avatar" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeModal}>
          <div
            className="max-w-2xl w-full max-h-[90vh] overflow-auto rounded-2xl border border-line bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">خصّص صورتك</h2>
            <AvatarBuilder
              initialConfig={avatarConfig}
              gender={user.gender}
              onSave={handleSaveAvatar}
              onCancel={closeModal}
              saving={saving}
              error={error}
            />
          </div>
        </div>
      )}

      {/* Name Modal */}
      {modal === "name" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeModal}>
          <div
            className="max-w-md w-full rounded-2xl border border-line bg-surface p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold">{p.edit.title}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">{p.edit.firstName}</label>
                <input
                  type="text"
                  value={editName.firstName}
                  onChange={(e) => setEditName((prev) => ({ ...prev, firstName: e.target.value }))}
                  className="w-full min-h-11 rounded-xl border border-line bg-background px-4"
                  maxLength={30}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{p.edit.lastName}</label>
                <input
                  type="text"
                  value={editName.lastName}
                  onChange={(e) => setEditName((prev) => ({ ...prev, lastName: e.target.value }))}
                  className="w-full min-h-11 rounded-xl border border-line bg-background px-4"
                  maxLength={30}
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="flex-1 min-h-11 rounded-xl bg-primary text-white font-semibold disabled:opacity-50"
              >
                {saving ? "جاري الحفظ..." : p.edit.save}
              </button>
              <button onClick={closeModal} className="flex-1 min-h-11 rounded-xl border border-line font-semibold">
                {p.edit.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phone Modal */}
      {modal === "phone" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeModal}>
          <div
            className="max-w-md w-full rounded-2xl border border-line bg-surface p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold">{p.phoneChange.title}</h2>
            <div>
              <label className="block text-sm font-medium mb-1">{p.phoneChange.newPhone}</label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+249XXXXXXXXX"
                className="w-full min-h-11 rounded-xl border border-line bg-background px-4"
                dir="ltr"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleSavePhone}
                disabled={saving}
                className="flex-1 min-h-11 rounded-xl bg-primary text-white font-semibold disabled:opacity-50"
              >
                {saving ? "جاري الحفظ..." : p.phoneChange.save}
              </button>
              <button onClick={closeModal} className="flex-1 min-h-11 rounded-xl border border-line font-semibold">
                {p.phoneChange.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Modal */}
      {modal === "pin" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeModal}>
          <div
            className="max-w-md w-full rounded-2xl border border-line bg-surface p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold">{p.pin.title}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">{p.pin.currentPin}</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={editPin.current}
                  onChange={(e) => setEditPin((prev) => ({ ...prev, current: e.target.value }))}
                  maxLength={6}
                  className="w-full min-h-11 rounded-xl border border-line bg-background px-4"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{p.pin.newPin}</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={editPin.new}
                  onChange={(e) => setEditPin((prev) => ({ ...prev, new: e.target.value }))}
                  maxLength={6}
                  className="w-full min-h-11 rounded-xl border border-line bg-background px-4"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{p.pin.confirmPin}</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={editPin.confirm}
                  onChange={(e) => setEditPin((prev) => ({ ...prev, confirm: e.target.value }))}
                  maxLength={6}
                  className="w-full min-h-11 rounded-xl border border-line bg-background px-4"
                  dir="ltr"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleSavePin}
                disabled={saving}
                className="flex-1 min-h-11 rounded-xl bg-primary text-white font-semibold disabled:opacity-50"
              >
                {saving ? "جاري الحفظ..." : p.pin.save}
              </button>
              <button onClick={closeModal} className="flex-1 min-h-11 rounded-xl border border-line font-semibold">
                {p.pin.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
