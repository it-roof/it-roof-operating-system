import { redirect } from 'next/navigation';

/** Öffentlicher Passwort-Reset-Request ist deaktiviert (Angriffsfläche). */
export default function ForgotPasswordPage() {
  redirect('/login');
}
