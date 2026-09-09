-- Leads DB: Templates am Kampagnen-Step
ALTER TABLE campaign_step ADD COLUMN IF NOT EXISTS subject_template text;
ALTER TABLE campaign_step ADD COLUMN IF NOT EXISTS body_template text;
