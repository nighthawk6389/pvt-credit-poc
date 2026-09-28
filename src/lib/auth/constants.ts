// Shared between client and server — must not import server-only modules.
/// Holds the acting user's id. A stand-in for a real authenticated session:
/// identity is now a database row, but there is still no credential check.
export const USER_COOKIE = "pcdr_user";
