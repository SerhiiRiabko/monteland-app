"""Email service — Resend in prod, console log in dev."""
import os
from ..core.config import settings


def _dev_log(to: str, subject: str, html: str):
    import re, sys
    out = sys.stdout
    def p(s: str):
        try:
            print(s)
        except UnicodeEncodeError:
            print(s.encode("ascii", "replace").decode())

    p("\n" + "="*60)
    p(f"[EMAIL DEV] To: {to}")
    p("[EMAIL DEV] Subject: MonteLand - seller registration")
    link = re.search(r'href="([^"]*set-password[^"]*)"', html)
    if link:
        p(f"[EMAIL DEV] >>> Set-password link: {link.group(1)}")
    p("="*60 + "\n")


async def send_seller_welcome(to: str, name: str, token: str):
    """Send welcome email to new seller with password setup link."""
    set_password_url = f"{settings.FRONTEND_URL}/set-password?token={token}"
    subject = "Вас зареєстровано як продавця на MonteLand 🏔️"
    html = f"""
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937">
  <div style="text-align:center;margin-bottom:32px">
    <span style="font-size:32px">🏔️</span>
    <h1 style="font-size:22px;font-weight:700;color:#111827;margin:8px 0">MonteLand</h1>
  </div>

  <h2 style="font-size:18px;font-weight:700;margin-bottom:8px">Ваше оголошення прийнято!</h2>
  <p style="color:#6b7280;line-height:1.6">
    Вітаємо{f", {name}" if name else ""}! Ваша ділянка розміщена на платформі MonteLand.
    Щоб отримати доступ до особистого кабінету — встановіть пароль за посиланням нижче.
  </p>

  <div style="margin:28px 0;text-align:center">
    <a href="{set_password_url}"
       style="display:inline-block;padding:14px 32px;background:#10b981;color:white;
              text-decoration:none;border-radius:100px;font-weight:600;font-size:15px">
      Встановити пароль →
    </a>
  </div>

  <p style="font-size:13px;color:#9ca3af;line-height:1.5">
    Посилання дійсне 48 годин. Якщо ви не розміщували оголошення — просто ігноруйте цей лист.
  </p>

  <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0">
  <p style="font-size:12px;color:#d1d5db;text-align:center">© 2026 MonteLand · Земельний ринок Чорногорії</p>
</body>
</html>"""

    if not settings.RESEND_API_KEY:
        _dev_log(to, subject, html)
        return

    try:
        import resend
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>",
            "to": [to],
            "subject": subject,
            "html": html,
        })
    except Exception as e:
        print(f"[email] send error: {e}")
        _dev_log(to, subject, html)