import type { Reminder } from '../prisma/generated/client'
import { prisma } from '../db/index.js'

export type { Reminder }

export interface CreateReminderInput {
  domainId: number
  daysBefore: number
}

export async function createReminder(input: CreateReminderInput): Promise<Reminder> {
  return prisma.reminder.create({
    data: {
      domainId: input.domainId,
      daysBefore: input.daysBefore,
    },
  })
}

export async function getReminderById(id: number): Promise<Reminder | null> {
  return prisma.reminder.findUnique({
    where: { id },
  })
}

export async function getRemindersByDomainId(domainId: number): Promise<Reminder[]> {
  return prisma.reminder.findMany({
    where: { domainId },
  })
}

export async function getAllReminders(): Promise<Reminder[]> {
  return prisma.reminder.findMany()
}

export async function updateReminder(
  id: number,
  input: Partial<Omit<Reminder, 'id' | 'domainId' | 'createdAt'>>,
): Promise<Reminder | null> {
  return prisma.reminder.update({
    where: { id },
    data: {
      daysBefore: input.daysBefore,
      notified: input.notified,
      notifyDate: input.notifyDate,
    },
  })
}

export async function deleteReminder(id: number): Promise<boolean> {
  try {
    await prisma.reminder.delete({
      where: { id },
    })
    return true
  }
  catch {
    return false
  }
}

export async function deleteRemindersByDomainId(domainId: number): Promise<boolean> {
  try {
    await prisma.reminder.deleteMany({
      where: { domainId },
    })
    return true
  }
  catch {
    return false
  }
}
