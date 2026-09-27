/** Code fallback for every notification. Admin edits are stored in notification_templates and take priority (BR-36). */
export const DEFAULT_TEMPLATES: Record<string, { title: string; body: string }> = {
  assigned: { title: "أُضفت إلى ختمة", body: "أهلًا {{name}}، تمت إضافتك إلى مجموعة {{group}}. ستظهر مشاركتك اليومية في الرئيسية." },
  reading_reminder: { title: "تذكير بالقراءة", body: "الجزء {{part}} بانتظارك اليوم في {{group}}." },
  strong_reminder: { title: "⏰ اقترب وقت الفجر", body: "لم تُقرأ بعد الجزء {{part}} في {{group}}. بقي وقت قصير قبل إغلاق الختمة." },
  missing_part_user: { title: "فاتك جزء اليوم", body: "لم تُقرأ الجزء {{part}} في {{group}} قبل الفجر. يمكنك قراءته كتعويض من صفحة السجل." },
  missing_part_admin: { title: "جزء لم يُقرأ", body: "الجزء {{part}} في {{group}} لم يُقرأ من {{name}} قبل الفجر." },
  backup_assigned: { title: "أنت بديل اليوم", body: "عيّنك المشرف بديلًا للجزء {{part}} في {{group}}." },
  streak_warning: { title: "باقي القليل للحفاظ على الـStreak 🔥", body: "اقرأ الجزء {{part}} قبل الفجر حتى لا ينقطع تتابعك." },
  streak_protection_earned: { title: "حماية جديدة 🛡", body: "أحسنت! 15 يومًا متتاليًا من الالتزام منحتك حماية إضافية لـStreak." },
  streak_broken: { title: "انقطع الـStreak", body: "لم تُقرأ جزء أمس، وبدأ عدّاد الـStreak من جديد. يمكنك البدء اليوم." },
  khatmah_started: { title: "بداية ختمة جديدة", body: "بدأت ختمة جديدة في مجموعة {{group}}. وفّقكم الله." },
  khatmah_completed: { title: "اكتملت الختمة 🎉", body: "أكملت مجموعة {{group}} ختمة اليوم كاملة. جزاكم الله خيرًا." },
  admin_alert: { title: "تنبيه إداري", body: "{{body}}" },
  admin_message: { title: "{{title}}", body: "{{body}}" },
};
/** Types the user may turn off. Anything not listed here is critical and always sent (BR-35). */
export const OPTIONAL_TYPES = ["assigned", "reading_reminder", "backup_assigned", "streak_warning", "streak_protection_earned", "khatmah_started", "khatmah_completed"] as const;
export const TYPE_LABELS: Record<string, string> = { assigned: "الإضافة لختمة", reading_reminder: "تذكير القراءة", backup_assigned: "تعيين كبديل", streak_warning: "قرب كسر الـStreak", streak_protection_earned: "اكتساب حماية", khatmah_started: "بداية ختمة جديدة", khatmah_completed: "اكتمال الختمة" };
