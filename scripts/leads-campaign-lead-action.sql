-- Leads DB: Aktions-Historie für Kampagnen-Abarbeitung
CREATE TABLE IF NOT EXISTS campaign_lead_action (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  campaign_lead_id uuid NOT NULL,
  step_id uuid NOT NULL,
  action text NOT NULL,
  rendered_subject text,
  rendered_body text,
  note text,
  acted_at timestamptz NOT NULL
);
