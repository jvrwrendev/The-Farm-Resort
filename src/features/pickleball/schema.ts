import { z } from 'zod'
import { addDays, differenceInCalendarDays, parseISO, startOfDay } from 'date-fns'
import { PICKLEBALL_SETTINGS } from './mockData'
import { timeToMinutes } from './utils'

export const pickleballBookingSchema = z
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
    courtId: z.string().min(1, 'Please select a court.'),
    bookingDate: z.string().min(1, 'Please select a booking date.'),
    startTime: z.string().min(1, 'Please select a start time.'),
    endTime: z.string().min(1, 'Please select an end time.'),
    players: z.coerce
      .number({ invalid_type_error: 'Please enter the number of players.' })
      .int('Please enter a whole number.')
      .min(1, 'At least one player is required.')
      .max(PICKLEBALL_SETTINGS.maxPlayers, `A court hosts up to ${PICKLEBALL_SETTINGS.maxPlayers} players.`),
    notes: z.string().trim().max(500, 'Notes must be 500 characters or fewer.').optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.bookingDate) return

    const parsedDate = parseISO(value.bookingDate)
    const today = startOfDay(new Date())

    if (Number.isNaN(parsedDate.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bookingDate'], message: 'Please choose a valid date.' })
      return
    }

    if (parsedDate < today) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bookingDate'], message: 'Please choose a future date.' })
    }

    const latestDate = addDays(today, PICKLEBALL_SETTINGS.bookingWindowDays)
    if (differenceInCalendarDays(parsedDate, today) > PICKLEBALL_SETTINGS.bookingWindowDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bookingDate'],
        message: `Bookings can be made up to ${PICKLEBALL_SETTINGS.bookingWindowDays} days ahead.`,
      })
    }

    if (parsedDate > latestDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bookingDate'],
        message: `Bookings can be made up to ${PICKLEBALL_SETTINGS.bookingWindowDays} days ahead.`,
      })
    }

    if (!value.startTime || !value.endTime) return

    const start = timeToMinutes(value.startTime)
    const end = timeToMinutes(value.endTime)
    const open = timeToMinutes(PICKLEBALL_SETTINGS.openTime)
    const close = timeToMinutes(PICKLEBALL_SETTINGS.closeTime)

    if (Number.isNaN(start) || Number.isNaN(end)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startTime'], message: 'Please choose a valid time.' })
      return
    }

    if (end <= start) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endTime'], message: 'End time must be after start time.' })
    }

    if (start < open || end > close) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startTime'],
        message: `Courts are open from ${PICKLEBALL_SETTINGS.openTime} to ${PICKLEBALL_SETTINGS.closeTime}.`,
      })
    }

    if ((end - start) / 60 > PICKLEBALL_SETTINGS.maxDurationHours) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: `A reservation can be up to ${PICKLEBALL_SETTINGS.maxDurationHours} hours.`,
      })
    }
  })

export type PickleballBookingFormValues = z.infer<typeof pickleballBookingSchema>
