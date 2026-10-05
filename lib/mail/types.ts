export type MailboxPublic = {
  id: string;
  email: string;
  display_name: string | null;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  username: string;
  last_sync_at: string | null;
  last_sync_error: string | null;
};

export type MailFolder = {
  id: string;
  mailbox_id: string;
  imap_path: string;
  name: string;
  role: string;
  unread: number;
};

export type MailAddress = {
  name: string | null;
  address: string;
};

export type MailMessageListItem = {
  id: string;
  mailbox_id: string;
  mailbox_email: string;
  folder_id: string;
  folder_role: string;
  thread_id: string;
  from_name: string | null;
  from_address: string | null;
  to_addresses: MailAddress[];
  subject: string | null;
  date: string | null;
  seen: boolean;
  flagged: boolean;
  draft: boolean;
  snippet: string | null;
  has_attachments: boolean;
  thread_count: number;
};

export type MailAttachmentMeta = {
  id: string;
  filename: string | null;
  content_type: string | null;
  size: number;
};

export type MailMessageDetail = MailMessageListItem & {
  cc_addresses: MailAddress[];
  text_body: string | null;
  html_body: string | null;
  message_id_header: string | null;
  in_reply_to: string | null;
  attachments: MailAttachmentMeta[];
};
