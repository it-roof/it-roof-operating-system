const PRESETS: Record<string, { imapHost: string; smtpHost: string; smtpPort: number; smtpSecure: boolean }> = {
  'gmail.com': { imapHost: 'imap.gmail.com', smtpHost: 'smtp.gmail.com', smtpPort: 587, smtpSecure: false },
  'googlemail.com': { imapHost: 'imap.gmail.com', smtpHost: 'smtp.gmail.com', smtpPort: 587, smtpSecure: false },
  'outlook.com': { imapHost: 'outlook.office365.com', smtpHost: 'smtp.office365.com', smtpPort: 587, smtpSecure: false },
  'hotmail.com': { imapHost: 'outlook.office365.com', smtpHost: 'smtp.office365.com', smtpPort: 587, smtpSecure: false },
  'live.com': { imapHost: 'outlook.office365.com', smtpHost: 'smtp.office365.com', smtpPort: 587, smtpSecure: false },
  'ionos.de': { imapHost: 'imap.ionos.de', smtpHost: 'smtp.ionos.de', smtpPort: 587, smtpSecure: false },
  'ionos.com': { imapHost: 'imap.ionos.com', smtpHost: 'smtp.ionos.com', smtpPort: 587, smtpSecure: false },
  '1und1.de': { imapHost: 'imap.1und1.de', smtpHost: 'smtp.1und1.de', smtpPort: 587, smtpSecure: false },
  'strato.de': { imapHost: 'imap.strato.de', smtpHost: 'smtp.strato.de', smtpPort: 587, smtpSecure: false },
  'mailbox.org': { imapHost: 'imap.mailbox.org', smtpHost: 'smtp.mailbox.org', smtpPort: 587, smtpSecure: false },
  'gmx.de': { imapHost: 'imap.gmx.net', smtpHost: 'mail.gmx.net', smtpPort: 587, smtpSecure: false },
  'gmx.net': { imapHost: 'imap.gmx.net', smtpHost: 'mail.gmx.net', smtpPort: 587, smtpSecure: false },
  'web.de': { imapHost: 'imap.web.de', smtpHost: 'smtp.web.de', smtpPort: 587, smtpSecure: false },
  't-online.de': { imapHost: 'secureimap.t-online.de', smtpHost: 'securesmtp.t-online.de', smtpPort: 587, smtpSecure: false },
};

export function guessMailHosts(email: string) {
  const domain = email.split('@')[1]?.trim().toLowerCase() ?? '';
  const preset = PRESETS[domain];
  if (preset) {
    return {
      imapHost: preset.imapHost,
      imapPort: 993,
      imapSecure: true,
      smtpHost: preset.smtpHost,
      smtpPort: preset.smtpPort,
      smtpSecure: preset.smtpSecure,
    };
  }
  return {
    imapHost: domain ? `imap.${domain}` : '',
    imapPort: 993,
    imapSecure: true,
    smtpHost: domain ? `smtp.${domain}` : '',
    smtpPort: 587,
    smtpSecure: false,
  };
}
