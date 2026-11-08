import type { PickleballBooking, PickleballCourt } from './types'
import { formatBookingDate, formatTimeLabel } from './utils'

const PDF_CURRENCY = (amount: number) =>
  `PHP ${amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export async function downloadPickleballSummaryPdf(
  booking: PickleballBooking,
  court: PickleballCourt,
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 48
  let y = 60

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(32, 56, 42)
  doc.text('The Farm Resort', margin, y)

  y += 22
  doc.setFontSize(13)
  doc.text('Pickleball Court Reservation Summary', margin, y)

  y += 28
  doc.setDrawColor(210, 216, 205)
  doc.line(margin, y, 547, y)
  y += 28

  const row = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(105, 115, 105)
    doc.text(label.toUpperCase(), margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(32, 40, 32)
    doc.text(value, margin + 160, y)
    y += 22
  }

  row('Booking reference', booking.reference)
  row('Status', booking.status.charAt(0).toUpperCase() + booking.status.slice(1))
  row('Customer', booking.customerName)
  row('Email', booking.email)
  row('Contact number', booking.contactNumber)
  row('Court', court.name)
  row('Date', formatBookingDate(booking.bookingDate, 'EEEE, MMMM d, yyyy'))
  row('Time', `${formatTimeLabel(booking.startTime)} – ${formatTimeLabel(booking.endTime)}`)
  row('Duration', `${booking.durationHours} hour${booking.durationHours === 1 ? '' : 's'}`)
  row('Players', String(booking.players))
  row('Hourly rate', PDF_CURRENCY(booking.hourlyRate))
  row('Estimated total', PDF_CURRENCY(booking.totalAmount))

  if (booking.notes) {
    y += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(105, 115, 105)
    doc.text('ADDITIONAL NOTES', margin, y)
    y += 18
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(32, 40, 32)
    const notes = doc.splitTextToSize(booking.notes, 499) as string[]
    doc.text(notes, margin, y)
    y += notes.length * 15
  }

  y += 18
  doc.setDrawColor(210, 216, 205)
  doc.line(margin, y, 547, y)
  y += 20
  doc.setFontSize(9)
  doc.setTextColor(105, 115, 105)
  doc.text(
    'No payment has been taken online. Our team will contact you to confirm the court reservation.',
    margin,
    y,
    { maxWidth: 499 },
  )

  doc.save(`pickleball-${booking.reference}.pdf`)
}
