import { pgTable, uuid, text, timestamp, varchar, integer, boolean, primaryKey } from 'drizzle-orm/pg-core';

export const lead = pgTable('lead', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  companyName: text('company_name').notNull(),
  domain: text(),
  street: text(),
  city: text(),
  countryCode: text('country_code'),
  phone: text(),
  industry: text(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
  status: text().notNull(),
  searchQueryId: uuid('search_query_id'),
});

export const leadContact = pgTable('lead_contact', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  leadId: uuid('lead_id').notNull(),
  salutation: varchar({ length: 255 }),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  position: varchar({ length: 255 }),
  email: varchar({ length: 255 }),
  phone: varchar({ length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
});

export const campaign = pgTable('campaign', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: text().notNull(),
  description: text(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
});

export const campaignStep = pgTable('campaign_step', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  campaignId: uuid('campaign_id').notNull(),
  stepOrder: integer('step_order').notNull(),
  type: text().notNull(),
  delayDays: integer('delay_days').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
});

export const campaignLead = pgTable('campaign_lead', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  campaignId: uuid('campaign_id').notNull(),
  leadId: uuid('lead_id').notNull(),
  currentStepId: uuid('current_step_id'),
  status: text().notNull(),
  lastActionAt: timestamp('last_action_at', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
});

export const searchQuery = pgTable('search_query', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  query: text().notNull(),
  searched: boolean().notNull(),
  searchedAt: timestamp('searched_at', { mode: 'string' }),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
});

export const tag = pgTable('tag', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
});

export const searchQueryTag = pgTable('search_query_tag', {
  searchQueryId: uuid('search_query_id').notNull(),
  tagId: uuid('tag_id').notNull(),
}, (table) => [
  primaryKey({ columns: [table.searchQueryId, table.tagId] }),
]);
