import type { Lang } from "./i18n";

/** Supabase Auth error codes in the visitor's language; anything unknown falls back to a general line. */
const TEXT: Record<string, { tr: string; en: string }> = {
  invalid_credentials: { tr: "E-posta ya da şifre hatalı.", en: "Wrong e-mail or password." },
  user_already_exists: { tr: "Bu e-postayla zaten bir hesap var. Giriş yapmayı dene.", en: "An account already uses this e-mail. Try signing in." },
  email_exists: { tr: "Bu e-postayla zaten bir hesap var. Giriş yapmayı dene.", en: "An account already uses this e-mail. Try signing in." },
  weak_password: {
    tr: "Şifre çok zayıf. En az 8 karakter kullan; harf ve rakam karıştır.",
    en: "That password is too weak. Use 8+ characters with letters and digits.",
  },
  same_password: { tr: "Yeni şifre eskisiyle aynı olamaz.", en: "The new password must differ from the old one." },
  email_address_invalid: { tr: "Geçerli bir e-posta adresi gir.", en: "Enter a valid e-mail address." },
  validation_failed: { tr: "Bilgileri kontrol edip tekrar dene.", en: "Check the details and try again." },
  email_not_confirmed: { tr: "Önce e-postana gelen bağlantıyla hesabını onayla.", en: "Confirm your account with the link we e-mailed first." },
  signup_disabled: { tr: "Kayıt şu an kapalı.", en: "Sign-ups are closed right now." },
  email_provider_disabled: { tr: "E-postayla giriş şu an kapalı.", en: "E-mail sign-in is off right now." },
  over_email_send_rate_limit: {
    tr: "Çok fazla e-posta istendi. Birkaç dakika bekleyip tekrar dene.",
    en: "Too many e-mails requested. Wait a few minutes and try again.",
  },
  over_request_rate_limit: { tr: "Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.", en: "Too many attempts. Wait a little and try again." },
  user_not_found: { tr: "Bu e-postayla bir hesap bulunamadı.", en: "No account uses this e-mail." },
  session_expired: { tr: "Oturumun sona erdi, tekrar giriş yap.", en: "Your session expired; sign in again." },
  otp_expired: { tr: "Bağlantının süresi dolmuş. Yeni bir sıfırlama bağlantısı iste.", en: "That link has expired. Ask for a new reset link." },
  network: { tr: "Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.", en: "Could not reach the server. Check your connection." },
};

export function authError(err: { code?: string; name?: string; message?: string; status?: number } | null | undefined, lang: Lang, fallback: string): string {
  if (!err) return fallback;
  const code = err.code ?? (err.name === "AuthRetryableFetchError" ? "network" : /invalid login/i.test(err.message ?? "") ? "invalid_credentials" : "");
  return TEXT[code]?.[lang] ?? fallback;
}
