import { relations } from "drizzle-orm/relations";
import { project, task, company, trip, companyContact, contact } from "./schema";

export const taskRelations = relations(task, ({one}) => ({
	project: one(project, {
		fields: [task.projectId],
		references: [project.id]
	}),
}));

export const projectRelations = relations(project, ({one, many}) => ({
	tasks: many(task),
	company: one(company, {
		fields: [project.companyId],
		references: [company.id]
	}),
}));

export const tripRelations = relations(trip, ({one}) => ({
	company: one(company, {
		fields: [trip.companyId],
		references: [company.id]
	}),
}));

export const companyRelations = relations(company, ({many}) => ({
	trips: many(trip),
	projects: many(project),
	companyContacts: many(companyContact),
}));

export const companyContactRelations = relations(companyContact, ({one}) => ({
	company: one(company, {
		fields: [companyContact.companyId],
		references: [company.id]
	}),
	contact: one(contact, {
		fields: [companyContact.contactId],
		references: [contact.id]
	}),
}));

export const contactRelations = relations(contact, ({many}) => ({
	companyContacts: many(companyContact),
}));