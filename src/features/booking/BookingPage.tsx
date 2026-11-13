import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { addYears, format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import {
  CalendarDays,
  Check,
  Loader2,
  QrCode,
  Receipt,
  ShieldCheck,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { PublicLayout } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DatePickerField } from '@/features/booking/DatePickerField'
import { getAccommodation, getRoomId } from '@/services/accommodation.service'
import { createBooking, isRangeAvailable } from '@/services/booking.service'
import {
  calculateDownPayment,
  getPaymentSettings,
  submitPayment,
  uploadPaymentReceipt,
} from '@/services/payment.service'
import type { BookingFormValues } from '@/features/booking/booking-schema'

import { getCalendarEvents } from '@/services/resort.service'
import { queryKeys } from '@/lib/queryKeys'
import { cn, formatCurrency, nightsBetween } from '@/lib/utils'
import { bookingSchema } from '@/features/booking/booking-schema'

const today = format(new Date(), 'yyyy-MM-dd')
const maxBookingDate = format(addYears(new Date(), 1), 'yyyy-MM-dd')

const PERIODS = ['AM', 'PM'] as const
type Period = (typeof PERIODS)[number]

function PeriodToggle({ value, onChange, ariaLabel }: { value: Period; onChange: (period: Period) => void; ariaLabel: string }) {
  return (
    <div role="group" aria-label={ariaLabel} className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/60 p-1">
      {PERIODS.map((period) => (
        <button
          key={period}
          type="button"
          aria-pressed={value === period}
          className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', value === period ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          onClick={() => onChange(period)}
        >
          {period}
        </button>
      ))}
    </div>
  )
}

const STEPS = ['Booking details', 'Payment receipt', 'Review & confirm']

export default function BookingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState('')
  const [receiptUrl, setReceiptUrl] = useState('')
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const { data: accommodation, isLoading } = useQuery({ queryKey: queryKeys.accommodation, queryFn: getAccommodation })
  const { data: events = [] } = useQuery({ queryKey: queryKeys.calendarEvents(today, maxBookingDate), queryFn: () => getCalendarEvents(today, maxBookingDate), staleTime: 30_000 })
  const { data: roomId } = useQuery({ queryKey: ['room-id'], queryFn: getRoomId, staleTime: 5 * 60_000 })
  const { data: paymentSettings, isLoading: settingsLoading } = useQuery({ queryKey: ['payment-settings'], queryFn: getPaymentSettings })

  const occupied = useMemo(() => new Set(events.map((e: { event_date: string }) => e.event_date)), [events])

  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema) as Resolver<BookingFormValues>,
    defaultValues: { customerName: '', email: '', contactNumber: '', checkIn: '', checkInPeriod: 'PM', checkOut: '', checkOutPeriod: 'PM', adults: 2, children: 0, specialRequests: '' },
  })

  const checkIn = watch('checkIn')
  const checkOut = watch('checkOut')
  const checkInPeriod = watch('checkInPeriod')
  const checkOutPeriod = watch('checkOutPeriod')
  const adults = Number(watch('adults')) || 0
  const children = Number(watch('children')) || 0
  const totalGuests = adults + children
  const nights = nightsBetween(checkIn, checkOut)
  const pricePerNight = accommodation?.pricePerNight ?? 0
  const maxGuests = accommodation?.maxGuests ?? 0
  const total = nights * pricePerNight
  const capacityExceeded = maxGuests > 0 && totalGuests > maxGuests
  const rangeValid = nights > 0 && !!checkIn && !!checkOut

  const { data: available, isFetching: checkingAvailability } = useQuery({
    queryKey: queryKeys.availability(roomId ?? null, checkIn, checkOut),
    queryFn: () => isRangeAvailable(checkIn, checkOut, roomId ?? undefined),
    enabled: rangeValid && !!roomId,
    staleTime: 15_000,
  })

  const { downPayment, remaining } = calculateDownPayment(total)

  const rangeCrossesOccupied = (from: string, to: string): boolean => {
    const start = parseISO(from); const end = parseISO(to); const cursor = new Date(start); cursor.setDate(cursor.getDate() + 1)
    while (cursor < end) { if (occupied.has(format(cursor, 'yyyy-MM-dd'))) return true; cursor.setDate(cursor.getDate() + 1) }
    return false
  }
  const handleCheckInChange = (key: string) => { if (checkOut && checkOut <= key) setValue('checkOut', '', { shouldValidate: true }); setValue('checkIn', key, { shouldValidate: true }) }
  const handleCheckOutChange = (key: string) => setValue('checkOut', key, { shouldValidate: true })
  const setPeriod = (field: 'checkInPeriod' | 'checkOutPeriod', period: Period) => setValue(field, period, { shouldDirty: true })

  const onDetailsNext = () => {
    if (capacityExceeded) { toast.error(`This accommodation hosts up to ${maxGuests} guests.`); return }
    if (available === false) { toast.error('Those dates are already reserved. Please choose another range.'); return }
    if (!rangeValid) { toast.error('Please select valid check-in and check-out dates.'); return }
    setStep(2)
  }

  const handleReceiptFile = (selected: File) => {
    const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!ACCEPTED.includes(selected.type)) { toast.error('Unsupported file type. Please use JPG, PNG, or WebP.'); return }
    if (selected.size > 2 * 1024 * 1024) { toast.error('File is too large. Maximum size is 2 MB.'); return }
    setReceiptFile(selected); setReceiptPreview(URL.createObjectURL(selected)); setReceiptUrl('')
  }

  const onReceiptNext = async () => {
    if (!receiptFile) { toast.error('Please upload your GCash payment receipt.'); return }
    setUploadingReceipt(true)
    try {
      const url = await uploadPaymentReceipt(receiptFile)
      setReceiptUrl(url)
      setStep(3)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to upload receipt.') }
    finally { setUploadingReceipt(false) }
  }

  const handleConfirm = async () => {
    const values = getValues()
    if (!roomId) { toast.error('Accommodation not loaded. Please refresh.'); return }
    if (!receiptUrl) { toast.error('Receipt not uploaded.'); return }
    setConfirming(true)
    try {
      const booking = await createBooking({
        customerName: values.customerName,
        email: values.email,
        contactNumber: values.contactNumber,
        checkIn: values.checkIn,
        checkOut: values.checkOut,
        checkInPeriod: values.checkInPeriod,
        checkOutPeriod: values.checkOutPeriod,
        adults: Number(values.adults),
        children: Number(values.children),
        specialRequests: values.specialRequests ?? '',
      }, roomId)
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      await submitPayment({ bookingType: 'accommodation', bookingReference: booking.bookingReference, totalAmount: booking.totalAmount, receiptUrl })
      toast.success('Reservation submitted! Awaiting verification.')
      navigate(`/book/confirmation/${booking.bookingReference}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unable to complete booking.')
    } finally { setConfirming(false) }
  }

  if (isLoading || !accommodation) {
    return <PublicLayout><div className="flex items-center justify-center py-32 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div></PublicLayout>
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 pt-28 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Book the entire resort</h1>
          <p className="mt-3 text-muted-foreground">One exclusive accommodation. One group at a time.</p>
        </div>

        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => {
            const n = i + 1
            const active = step === n
            const done = step > n
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold', done ? 'bg-primary text-primary-foreground' : active ? 'border-2 border-primary text-primary' : 'border border-muted-foreground/30 text-muted-foreground')}>
                  {done ? <Check className="h-4 w-4" /> : n}
                </div>
                <span className={cn('hidden text-sm sm:inline', active ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{s}</span>
                {i < STEPS.length - 1 && <div className={cn('h-px w-8 sm:w-12', done ? 'bg-primary' : 'bg-muted-foreground/30')} />}
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {step === 1 && (
              <>
                <Card>
                  <CardHeader><CardTitle className="font-display text-xl">Your accommodation</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-5 sm:flex-row">
                      <img src={accommodation.images[0]} alt={accommodation.name} className="h-44 w-full rounded-xl object-cover sm:w-56" />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-lg font-semibold">{accommodation.name}</h2>
                          <Badge variant={accommodation.status === 'available' ? 'success' : 'secondary'}>{accommodation.status === 'available' ? 'Available' : 'Unavailable'}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{accommodation.description}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                          <span className="inline-flex items-center gap-1.5 font-medium"><Users className="h-4 w-4 text-primary" /> Up to {accommodation.maxGuests} guests</span>
                          <span className="font-semibold text-primary">{formatCurrency(accommodation.pricePerNight)}<span className="ml-1 text-xs font-normal text-muted-foreground">/ night</span></span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="font-display text-xl">Guest details</CardTitle></CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit(onDetailsNext)} className="space-y-5" noValidate>
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="customerName">Full name</Label>
                          <Input id="customerName" placeholder="Juan Dela Cruz" error={errors.customerName?.message} {...register('customerName')} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactNumber">Contact number</Label>
                          <Input id="contactNumber" placeholder="+63 9XX XXX XXXX" error={errors.contactNumber?.message} {...register('contactNumber')} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Check-in</Label>
                          <DatePickerField value={checkIn} placeholder="Select check-in date" ariaLabel="Pick check-in date" occupied={occupied} disabledDate={(date) => (checkOut ? format(date, 'yyyy-MM-dd') >= checkOut : false)} onChange={handleCheckInChange} />
                          <PeriodToggle value={checkInPeriod} ariaLabel="Check-in AM or PM" onChange={(period) => setPeriod('checkInPeriod', period)} />
                          {errors.checkIn?.message && <p className="text-sm text-destructive">{errors.checkIn.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label>Check-out</Label>
                          <DatePickerField value={checkOut} placeholder="Select check-out date" ariaLabel="Pick check-out date" occupied={occupied} disabledDate={(date) => { const key = format(date, 'yyyy-MM-dd'); if (checkIn && key <= checkIn) return true; if (checkIn && rangeCrossesOccupied(checkIn, key)) return true; return false }} onChange={handleCheckOutChange} />
                          <PeriodToggle value={checkOutPeriod} ariaLabel="Check-out AM or PM" onChange={(period) => setPeriod('checkOutPeriod', period)} />
                          {errors.checkOut?.message && <p className="text-sm text-destructive">{errors.checkOut.message}</p>}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Shaded dates are already reserved.</p>
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="adults">Adults</Label>
                          <Input id="adults" type="number" min={1} error={errors.adults?.message} {...register('adults')} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="children">Children</Label>
                          <Input id="children" type="number" min={0} error={errors.children?.message} {...register('children')} />
                        </div>
                      </div>
                      {capacityExceeded && <p className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"><X className="h-4 w-4" />This accommodation hosts up to {maxGuests} guests.</p>}
                      {rangeValid && (
                        <div className="flex items-center gap-2 text-sm">
                          {checkingAvailability ? <span className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking availability…</span>
                            : available ? <span className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 font-medium text-primary"><Check className="h-4 w-4" /> These dates are available</span>
                            : <span className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 font-medium text-destructive"><X className="h-4 w-4" /> These dates are already reserved</span>}
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="specialRequests">Special requests</Label>
                        <Textarea id="specialRequests" placeholder="Celebrations, dietary needs…" error={errors.specialRequests?.message} {...register('specialRequests')} />
                      </div>
                      <Button type="submit" size="lg" className="w-full" disabled={!accommodation || accommodation.status === 'unavailable' || available === false}>
                        Continue to payment
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-xl">50% Down Payment (GCash)</CardTitle>
                  <p className="text-sm text-muted-foreground">Scan the QR code, pay the 50% down payment, then upload your receipt.</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {settingsLoading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading payment details…</div> : (
                    <>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border bg-muted/30 p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total amount</p><p className="mt-1 font-display text-xl font-bold">{formatCurrency(total)}</p></div>
                        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4"><p className="text-xs font-medium uppercase tracking-wider text-primary">50% down payment</p><p className="mt-1 font-display text-xl font-bold text-primary">{formatCurrency(downPayment)}</p></div>
                        <div className="rounded-xl border bg-muted/30 p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Remaining balance</p><p className="mt-1 font-display text-xl font-bold">{formatCurrency(remaining)}</p></div>
                      </div>
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="space-y-3">
                          <p className="text-sm font-semibold">GCash QR code</p>
                          {paymentSettings?.gcashQrUrl ? <img src={paymentSettings.gcashQrUrl} alt="GCash QR" className="mx-auto max-h-64 rounded-xl border" /> : <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-muted-foreground"><QrCode className="h-8 w-8" /></div>}
                          <div className="text-sm text-muted-foreground">
                            <p><span className="font-medium text-foreground">Account name:</span> {paymentSettings?.gcashAccountName}</p>
                            <p><span className="font-medium text-foreground">GCash number:</span> {paymentSettings?.gcashNumber}</p>
                            {paymentSettings?.instructions && <p className="mt-2">{paymentSettings.instructions}</p>}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <p className="text-sm font-semibold">Upload receipt</p>
                          <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" id="receiptInput" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReceiptFile(f) }} />
                          {!receiptPreview ? (
                            <label htmlFor="receiptInput" className="flex h-48 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary">
                              <Upload className="h-8 w-8" />
                              <span className="text-sm font-medium">Click to upload receipt</span>
                              <span className="text-xs">JPG, PNG, WebP · max 2 MB</span>
                            </label>
                          ) : (
                            <div className="relative">
                              <img src={receiptPreview} alt="Receipt preview" className="h-48 w-full rounded-xl object-contain border" />
                              <button type="button" onClick={() => { setReceiptFile(null); setReceiptPreview(''); setReceiptUrl('') }} className="absolute right-2 top-2 rounded-full bg-background/80 p-1 shadow"><X className="h-4 w-4" /></button>
                            </div>
                          )}
                          {receiptFile && <p className="text-xs text-muted-foreground flex items-center gap-1"><Receipt className="h-3.5 w-3.5" /> {receiptFile.name}</p>}
                        </div>
                      </div>
                    </>
                  )}
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                    <Button type="button" className="flex-1" loading={uploadingReceipt} onClick={onReceiptNext} disabled={!receiptFile}>
                      Continue to review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardHeader><CardTitle className="font-display text-xl">Review & confirm</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Guest</span><span className="font-medium">{getValues('customerName')}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{getValues('email')}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Check-in</span><span className="font-medium">{checkIn} · {checkInPeriod}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Check-out</span><span className="font-medium">{checkOut} · {checkOutPeriod}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Nights</span><span className="font-medium">{nights}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Guests</span><span className="font-medium">{totalGuests}</span></div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border bg-muted/30 p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</p><p className="mt-1 font-display text-xl font-bold">{formatCurrency(total)}</p></div>
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4"><p className="text-xs font-medium uppercase tracking-wider text-primary">50% down</p><p className="mt-1 font-display text-xl font-bold text-primary">{formatCurrency(downPayment)}</p></div>
                    <div className="rounded-xl border bg-muted/30 p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Remaining</p><p className="mt-1 font-display text-xl font-bold">{formatCurrency(remaining)}</p></div>
                  </div>
                  <p className="text-xs text-muted-foreground">By confirming, your reservation will be created with status Pending and your receipt will be submitted for verification.</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep(2)}>Back</Button>
                    <Button type="button" className="flex-1" loading={confirming} onClick={handleConfirm}>Confirm booking</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="lg:sticky lg:top-28">
              <CardHeader><CardTitle className="flex items-center gap-2 font-display text-lg"><CalendarDays className="h-5 w-5 text-primary" />Booking summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <dl className="space-y-3">
                  {[
                    { label: 'Check-in', value: checkIn ? `${format(parseISO(checkIn), 'MMM d, yyyy')} · ${checkInPeriod}` : 'Select check-in date' },
                    { label: 'Check-out', value: checkOut ? `${format(parseISO(checkOut), 'MMM d, yyyy')} · ${checkOutPeriod}` : 'Select check-out date' },
                    { label: 'Nights', value: nights > 0 ? String(nights) : '—' },
                    { label: 'Guests', value: totalGuests > 0 ? `${totalGuests} (${adults} adults, ${children} children)` : '—' },
                    { label: 'Price per night', value: pricePerNight ? formatCurrency(pricePerNight) : '—' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-start justify-between gap-4 text-sm">
                      <dt className="text-muted-foreground">{row.label}</dt>
                      <dd className="text-right font-medium text-foreground">{row.value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="border-t pt-4">
                  <div className="flex items-end justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-display text-2xl font-bold text-primary">{formatCurrency(total)}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  A 50% GCash down payment is required to secure your reservation.
                </div>
                <Button variant="outline" className="w-full" asChild><Link to="/#calendar">Check availability calendar</Link></Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}