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
