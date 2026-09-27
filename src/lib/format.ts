const tz = "Africa/Khartoum";
export const khTime = (d: Date) => d.toLocaleTimeString("ar", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
export const khDateTime = (d: Date) => d.toLocaleString("ar", { timeZone: tz, dateStyle: "short", timeStyle: "short" });
