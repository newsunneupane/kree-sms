import { z } from "zod";
import { fail } from "./api.js";

const email = z.string().trim().email("Valid email is required.");
const password = z.string().min(6, "Password must be at least 6 characters.");
const positiveInt = z.coerce.number().int().min(1);

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required."),
});

export const verifyOtpSchema = z.object({
  email,
  otp: z.string().trim().min(1, "Verification code is required."),
});

export const sendSmsSchema = z
  .object({
    sms_type: z.enum(["single", "bulk", "dynamic"], { message: "Invalid SMS type." }),
    to: z.string().trim().optional(),
    message: z.string().trim().optional(),
    csv_raw_text: z.string().optional(),
    global_message: z.string().optional(),
    scheduled_at: z.string().optional().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.sms_type === "single") {
      if (!v.to?.trim()) ctx.addIssue({ code: "custom", message: "Recipient number is required.", path: ["to"] });
      if (!v.message?.trim()) ctx.addIssue({ code: "custom", message: "Message is required.", path: ["message"] });
    }
    if (v.sms_type === "bulk") {
      if (!v.csv_raw_text) ctx.addIssue({ code: "custom", message: "Please add recipients and a message.", path: ["csv_raw_text"] });
      if (!v.global_message) ctx.addIssue({ code: "custom", message: "Please add recipients and a message.", path: ["global_message"] });
    }
    if (v.sms_type === "dynamic") {
      if (!v.csv_raw_text) ctx.addIssue({ code: "custom", message: "Please add recipient data.", path: ["csv_raw_text"] });
    }
  });

export const scheduleSmsSchema = z.object({
  recipient: z.string().trim().min(1, "Please fill in all fields."),
  message: z.string().trim().min(1, "Please fill in all fields."),
  scheduled_at: z.string().min(1, "Please fill in all fields."),
});

export const buyCreditsSchema = z.object({
  credits: positiveInt.withMessage?.("Credits must be a positive number.") ?? positiveInt,
  reference: z.string().trim().min(1, "Payment reference is required."),
});

export const addContactSchema = z.object({
  firstname: z.string().trim().min(1, "First name is required."),
  lastname: z.string().trim().optional().nullable(),
  mobile: z.string().trim().min(1, "Mobile number is required."),
});

export const addBulkContactsSchema = z.object({
  contacts: z.array(z.object({ firstname: z.string(), lastname: z.string().optional(), mobile: z.string() })).min(1, "No contacts to import."),
});

export const addGroupSchema = z.object({
  group_name: z.string().trim().min(1, "Group name is required."),
  description: z.string().optional().nullable(),
  contact_ids: z.array(z.coerce.number().int()).min(1, "Select at least one contact."),
});

export const addGatewayCreditSchema = z.object({ credits: positiveInt });

// Public third-party gateway DTO (POST /api/public/send-sms). Single-message
// only — external products fan out themselves; one row per call keeps credit
// math and idempotency exact.
export const publicSendSmsSchema = z.object({
  to: z
    .string()
    .trim()
    .min(10, "Recipient number is required.")
    .max(20, "Recipient number is too long.")
    .regex(/^\+?977-?98\d{8}$|^98\d{8}$/, "Invalid Nepal mobile number (expect 98XXXXXXXX)."),
  message: z.string().trim().min(1, "Message is required.").max(1000, "Message too long (max 1000 chars)."),
  senderId: z.string().trim().max(11, "Sender ID too long.").optional(),
  clientRef: z.string().trim().max(64, "clientRef too long.").optional(),
});

const nepalMobile = z
  .string()
  .trim()
  .min(10, "Recipient number is required.")
  .max(20, "Recipient number is too long.")
  .regex(/^\+?977-?98\d{8}$|^98\d{8}$/, "Invalid Nepal mobile number (expect 98XXXXXXXX).");

// Public bulk gateway DTO (POST /api/public/send-bulk). Same message to many
// recipients (2-100), all-or-nothing: any invalid number or short balance
// fails the whole batch with zero sends.
export const publicSendBulkSchema = z
  .object({
    to: z.array(nepalMobile).min(2, "Provide at least 2 recipients.").max(100, "Max 100 recipients per bulk call."),
    message: z.string().trim().min(1, "Message is required.").max(1000, "Message too long (max 1000 chars)."),
    senderId: z.string().trim().max(11, "Sender ID too long.").optional(),
    clientRef: z.string().trim().max(64, "clientRef too long.").optional(),
  })
  .superRefine((v, ctx) => {
    if (Array.isArray(v.to)) {
      const seen = new Set(v.to.map((n) => String(n).replace(/\D/g, "").slice(-10)));
      if (seen.size !== v.to.length) {
        ctx.addIssue({ code: "custom", message: "Duplicate recipient numbers.", path: ["to"] });
      }
    }
  });

export function validate(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ");
    return { error: fail(message || "Validation error.", 400) };
  }
  return { data: parsed.data };
}
