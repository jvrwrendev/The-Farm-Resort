import { z } from 'zod'
import { isBefore, parseISO, startOfDay } from 'date-fns'

export const bookingSchema = z
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
    checkIn: z.string().min(1, 'Select a check-in date.'),
    checkInPeriod: z.enum(['AM', 'PM']),
    checkOut: z.string().min(1, 'Select a check-out date.'),
    checkOutPeriod: z.enum(['AM', 'PM']),
    adults: z.coerce
      .number({ invalid_type_error: 'Please enter a number.' })
      .int('Please enter a whole number.')
      .min(1, 'At least one adult is required.'),
    children: z.coerce
      .number({ invalid_type_error: 'Please enter a number.' })
      .int('Please enter a whole number.')
      .min(0, 'Children cannot be negative.'),
    specialRequests: z.string().max(500, 'Please keep requests under 500 characters.').optional(),
  })
  .refine((data) => !isBefore(parseISO(data.checkIn), startOfDay(new Date())), {
    message: 'Check-in cannot be in the past.',
    path: ['checkIn'],
  })
  .refine((data) => parseISO(data.checkOut) > parseISO(data.checkIn), {
    message: 'Check-out must be after check-in.',
    path: ['checkOut'],
  })

export type BookingFormValues = z.infer<typeof bookingSchema>
