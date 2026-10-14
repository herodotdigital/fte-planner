"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/session";
import { can } from "@/lib/permissions";
import { parseYmd, ym } from "@/lib/timeline";
import { TimeEntrySchema, type TimeEntryFormState } from "@/lib/validation/time";

const TIME_PATH = "/app/czas";

/**
 * Po zamknięciu miesiąca wpisy zostają. Bez tej reguły raport kosztowy potrafi
 * zmienić się po fakcie — ktoś dopisuje godziny do miesiąca, który już
 * rozliczono. Administrator może poprawiać wstecz, bo pomyłki się zdarzają.
 */
function isClosedMonth(date: Date): boolean {
  return ym(date) < ym(new Date());
}

export async function createTimeEntry(
  _state: TimeEntryFormState,
  formData: FormData
): Promise<TimeEntryFormState> {
  const { session, role } = await requireCapability("manageStaffing");

  const v = TimeEntrySchema.safeParse({
    userId: formData.get("userId"),
    projectRoleId: formData.get("projectRoleId"),
    date: formData.get("date"),
    hours: formData.get("hours"),
    category: formData.get("category"),
    note: formData.get("note"),
  });
  if (!v.success) return { errors: z.flattenError(v.error).fieldErrors };

  const date = parseYmd(v.data.date);

  if (isClosedMonth(date) && !can(role, "manageEmployees")) {
    return {
      errors: { date: ["Ten miesiąc jest już zamknięty — poproś administratora."] },
    };
  }

  await prisma.timeEntry.create({
    data: {
      userId: v.data.userId,
      projectRoleId: v.data.projectRoleId,
      date,
      hours: v.data.hours,
      category: v.data.category,
      note: v.data.note,
      createdById: session.user.id,
    },
  });

  revalidatePath(TIME_PATH);
  return { success: true };
}

export async function deleteTimeEntry(formData: FormData) {
  const { role } = await requireCapability("manageStaffing");

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const entry = await prisma.timeEntry.findUnique({
    where: { id },
    select: { date: true },
  });
  if (!entry) return;

  if (isClosedMonth(entry.date) && !can(role, "manageEmployees")) {
    return;
  }

  await prisma.timeEntry.delete({ where: { id } });
  revalidatePath(TIME_PATH);
}
