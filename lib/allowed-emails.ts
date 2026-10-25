// Single-user lock: only emails listed in ALLOWED_EMAILS (comma-separated) may use the app.
// Fails closed: an empty or missing list lets nobody in.
// No "server-only" import because middleware (edge runtime) uses it too.
export function isEmailAllowed(email: string | null | undefined): boolean {
    if (!email) return false;
    const allowed = (process.env.ALLOWED_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
    return allowed.includes(email.trim().toLowerCase());
}
