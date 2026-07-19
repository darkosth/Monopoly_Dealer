export function problem(status, title, detail) {
  return Response.json({ type: "about:blank", title, status, detail }, { status, headers: { "Content-Type": "application/problem+json" } });
}
