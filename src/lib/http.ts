import { DomainError } from "./groups";
export const domainFail = (e: unknown) => {
  if (e instanceof DomainError) return Response.json({ error: e.code }, { status: e.code === "forbidden" ? 403 : e.code === "not_found" || e.code === "group_not_found" ? 404 : 409 });
  throw e;
};
