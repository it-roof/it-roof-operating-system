import { pgTable, uuid, text, timestamp, index, foreignKey, check, date, integer, time, boolean, numeric, primaryKey } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

export const company = pgTable('company', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: text().notNull(),
  status: text().default('Aktiv'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  street: text(),
  zip: text(),
  city: text(),
  country: text().default('DE'),
});

export const contact = pgTable('contact', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').default('').notNull(),
  email: text(),
  phone: text(),
  notes: text(),
  role: text(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const project = pgTable('project', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: text().notNull(),
  companyId: uuid('company_id').notNull(),
  status: text().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
  index('idx_projects_company').using('btree', table.companyId.asc().nullsLast().op('uuid_ops')),
  index('idx_projects_status').using('btree', table.status.asc().nullsLast().op('text_ops')),
  foreignKey({
    columns: [table.companyId],
    foreignColumns: [company.id],
    name: 'projects_company_id_fkey',
  }).onDelete('cascade'),
  check('projects_status_check', sql`status = ANY (ARRAY['active'::text, 'completed'::text, 'archived'::text])`),
]);

export const task = pgTable('task', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  title: text().notNull(),
  status: text().default('open'),
  priority: text().default('medium'),
  plannedDate: date('planned_date'),
  deadline: date(),
  timeEstimateMinutes: integer('time_estimate_minutes'),
  completedAt: timestamp('completed_at', { withTimezone: true, mode: 'string' }),
  projectId: uuid('project_id').notNull(),
  type: text().default('task').notNull(),
  appointmentTime: time('appointment_time'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
  index('idx_tasks_deadline').using('btree', table.deadline.asc().nullsLast().op('date_ops')),
  index('idx_tasks_planned').using('btree', table.plannedDate.asc().nullsLast().op('date_ops')),
  index('idx_tasks_priority').using('btree', table.priority.asc().nullsLast().op('text_ops')),
  index('idx_tasks_status').using('btree', table.status.asc().nullsLast().op('text_ops')),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [project.id],
    name: 'tasks_project_id_fkey',
  }),
  check('tasks_status_check', sql`status = ANY (ARRAY['open'::text, 'in_progress'::text, 'done'::text])`),
  check('tasks_priority_check', sql`priority = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])`),
  check('tasks_type_check', sql`type = ANY (ARRAY['task'::text, 'appointment_in_person'::text, 'appointment_remote'::text])`),
]);

export const companyContact = pgTable('company_contact', {
  companyId: uuid('company_id').notNull(),
  contactId: uuid('contact_id').notNull(),
}, (table) => [
  foreignKey({
    columns: [table.companyId],
    foreignColumns: [company.id],
    name: 'company_contacts_company_id_fkey',
  }).onDelete('cascade'),
  foreignKey({
    columns: [table.contactId],
    foreignColumns: [contact.id],
    name: 'company_contacts_contact_id_fkey',
  }).onDelete('cascade'),
  primaryKey({ columns: [table.companyId, table.contactId], name: 'company_contacts_pkey' }),
]);

export const trip = pgTable('trip', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  date: date().notNull(),
  fromAddress: text('from_address').default('Odinweg 2, 95448 Bayreuth').notNull(),
  toAddress: text('to_address').notNull(),
  purpose: text(),
  companyId: uuid('company_id'),
  roundTrip: boolean('round_trip').default(false).notNull(),
  km: numeric({ precision: 8, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.companyId],
    foreignColumns: [company.id],
    name: 'trip_company_id_fkey',
  }),
]);

export const aiProvider = pgTable('ai_provider', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: text().notNull(),
  baseUrl: text('base_url').notNull(),
  apiKey: text('api_key').default('').notNull(),
  model: text().notNull(),
  enabled: boolean().default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const aiConversation = pgTable('ai_conversation', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  title: text().default('Neuer Chat').notNull(),
  providerId: uuid('provider_id'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
  index('idx_ai_conversation_updated').using('btree', table.updatedAt.asc().nullsLast()),
  foreignKey({
    columns: [table.providerId],
    foreignColumns: [aiProvider.id],
    name: 'ai_conversation_provider_id_fkey',
  }).onDelete('set null'),
]);

export const aiMessage = pgTable('ai_message', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  conversationId: uuid('conversation_id').notNull(),
  role: text().notNull(),
  content: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
  index('idx_ai_message_conversation').using('btree', table.conversationId.asc().nullsLast().op('uuid_ops')),
  foreignKey({
    columns: [table.conversationId],
    foreignColumns: [aiConversation.id],
    name: 'ai_message_conversation_id_fkey',
  }).onDelete('cascade'),
  check('ai_message_role_check', sql`role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])`),
]);

// Relations
export const companyRelations = relations(company, ({ many }) => ({
  projects: many(project),
  companyContacts: many(companyContact),
  trips: many(trip),
}));

export const contactRelations = relations(contact, ({ many }) => ({
  companyContacts: many(companyContact),
}));

export const companyContactRelations = relations(companyContact, ({ one }) => ({
  company: one(company, { fields: [companyContact.companyId], references: [company.id] }),
  contact: one(contact, { fields: [companyContact.contactId], references: [contact.id] }),
}));

export const projectRelations = relations(project, ({ one, many }) => ({
  company: one(company, { fields: [project.companyId], references: [company.id] }),
  tasks: many(task),
}));

export const taskRelations = relations(task, ({ one }) => ({
  project: one(project, { fields: [task.projectId], references: [project.id] }),
}));

export const tripRelations = relations(trip, ({ one }) => ({
  company: one(company, { fields: [trip.companyId], references: [company.id] }),
}));

export const aiProviderRelations = relations(aiProvider, ({ many }) => ({
  conversations: many(aiConversation),
}));

export const aiConversationRelations = relations(aiConversation, ({ one, many }) => ({
  provider: one(aiProvider, { fields: [aiConversation.providerId], references: [aiProvider.id] }),
  messages: many(aiMessage),
}));

export const aiMessageRelations = relations(aiMessage, ({ one }) => ({
  conversation: one(aiConversation, { fields: [aiMessage.conversationId], references: [aiConversation.id] }),
}));

export const studioJob = pgTable('studio_job', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  kind: text().notNull(),
  prompt: text().notNull(),
  seed: integer().notNull(),
  variantCount: integer('variant_count').default(1).notNull(),
  status: text().default('queued').notNull(),
  estimatedCents: integer('estimated_cents').default(0).notNull(),
  actualCents: integer('actual_cents').default(0).notNull(),
  error: text(),
  providerState: text('provider_state'),
  parentJobId: uuid('parent_job_id'),
  parentAssetId: uuid('parent_asset_id'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
  index('idx_studio_job_created').using('btree', table.createdAt.desc().nullsLast()),
  index('idx_studio_job_status').using('btree', table.status.asc().nullsLast().op('text_ops')),
  check('studio_job_kind_check', sql`kind = ANY (ARRAY['image'::text, 'video_draft'::text, 'video_final'::text])`),
  check('studio_job_status_check', sql`status = ANY (ARRAY['queued'::text, 'running'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text])`),
]);

export const studioAsset = pgTable('studio_asset', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  jobId: uuid('job_id').notNull(),
  variantIndex: integer('variant_index').default(0).notNull(),
  seed: integer().notNull(),
  media: text().notNull(),
  storageKey: text('storage_key'),
  originalUrl: text('original_url'),
  mime: text(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
  index('idx_studio_asset_job').using('btree', table.jobId.asc().nullsLast().op('uuid_ops')),
  foreignKey({
    columns: [table.jobId],
    foreignColumns: [studioJob.id],
    name: 'studio_asset_job_id_fkey',
  }).onDelete('cascade'),
  check('studio_asset_media_check', sql`media = ANY (ARRAY['image'::text, 'video'::text])`),
]);

export const studioJobRelations = relations(studioJob, ({ many }) => ({
  assets: many(studioAsset),
}));

export const studioAssetRelations = relations(studioAsset, ({ one }) => ({
  job: one(studioJob, { fields: [studioAsset.jobId], references: [studioJob.id] }),
}));

/** Auth.js / NextAuth tables (Haupt-DB) */
export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  password: text('password'),
});

export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);
