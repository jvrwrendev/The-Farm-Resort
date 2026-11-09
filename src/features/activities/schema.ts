import { z } from 'zod'

export const activityBookingSchema = z
  .object({
    customerName: z
      .string()
      .trim()
      .min(2, 'Please enter your full name.')
      .max(120, 'Name is too long.'),
    email: z.string().trim().email('Please enter a valid email address.'),
    contactNumber: z
      .string()
      .trim()
      .min(7, 'Please enter a valid contact number.')
      .max(20, 'Contact number is too long.'),
    activityId: z.string().min(1, 'Please select an activity.'),
    bookingDate: z.string().min(1, 'Please select a booking date.'),
    startTime: z.string().min(1, 'Please select a start time.'),
    durationHours: z.coerce.number().int().min(1, 'Minimum duration is 1 hour.').max(6, 'Maximum duration is 6 hours.'),
    quantity: z.coerce
      .number({ invalid_type_error: 'Please enter a quantity.' })
      .int('Please enter a whole number.')
      .min(1, 'At least one unit is required.'),
    players: z.coerce
      .number({ invalid_type_error: 'Please enter the number of participants.' })
      .int('Please enter a whole number.')
      .min(1, 'At least one participant is required.'),
    notes: z.string().trim().max(500, 'Notes must be 500 characters or fewer.').optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.bookingDate) return
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selected = new Date(`${value.bookingDate}T00:00:00`)
    if (Number.isNaN(selected.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bookingDate'], message: 'Please choose a valid date.' })
      return
    }
    if (selected < today) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bookingDate'], message: 'Please choose a future date.' })
    }
  })

export type ActivityBookingFormValues = z.infer<typeof activityBookingSchema>
