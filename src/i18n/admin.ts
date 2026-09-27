export const ad = {
  title: "الإدارة", ok: "تأكيد", cancel: "إلغاء", none: "—", noGroup: "بلا مجموعة", empty: "لا توجد بيانات",
  nav: { dashboard: "لوحة التحكم", users: "المستخدمون", groups: "المجموعات", daily: "الختمة اليومية", history: "السجل", notifications: "الإشعارات", audit: "سجل التدقيق", admins: "المشرفون", app: "التطبيق" },
  status: { assigned: "لم تبدأ", reading: "جارٍ", completed: "تمت", missed: "فائتة", backup_assigned: "بديل معيَّن", completed_by_backup: "تمت بالبديل" } as Record<string, string>,
  err: { generic: "تعذّر تنفيذ العملية", forbidden: "لا تملك الصلاحية", invalid: "بيانات غير صالحة", user_in_group: "المستخدم في مجموعة أخرى", slot_taken: "الخانة مشغولة", slot_invalid: "خانة غير صالحة (الحد 30)", not_member: "ليس عضوًا في المجموعة",
    group_not_found: "المجموعة غير موجودة", day_closed: "انتهى وقت الختمة", already_completed: "الجزء مكتمل بالفعل", backup_is_primary: "البديل هو القارئ نفسه", user_not_found: "المستخدم غير موجود", invalid_phone: "رقم غير صالح، استخدم المفتاح الدولي",
    phone_taken: "الرقم مستخدم", weak_pin: "رمز ضعيف: 6 أرقام غير متكررة أو متسلسلة", no_reader: "لا يوجد قارئ لهذا الجزء", last_super_admin: "لا يمكن إزالة آخر Super Admin", not_admin: "ليس مشرفًا", no_backup: "لا يوجد بديل" } as Record<string, string>,
} as const;
