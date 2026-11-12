import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import {
  CheckCircle2,
  CreditCard,
  ImagePlus,
  Loader2,
  QrCode,
  Receipt,
  Save,
  Upload,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeading } from '@/features/admin/components'
import {
  getPaymentSettings,
  listPaymentRecords,
  updatePaymentSettings,
  uploadPaymentQr,
  verifyPayment,
  type PaymentRecord,
  type PaymentSettings,
} from '@/services/payment.service'
import { formatCurrency } from '@/lib/utils'

const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024

const TYPE_LABELS: Record<PaymentRecord['bookingType'], string> = {
  accommodation: 'Accommodation',
  pickleball: 'Pickleball',
  billiards: 'Billiards',
  atv: 'ATV Rental',
}

function formatDate(value: string): string {
  try {
    return format(parseISO(value), 'MMM d, yyyy h:mm a')
  } catch {
    return value
  }
}

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient()
  const qrRef = useRef<HTMLInputElement>(null)

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: getPaymentSettings,
  })

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['payment-records'],
    queryFn: () => listPaymentRecords(),
  })

  const [form, setForm] = useState<PaymentSettings | null>(null)
  const [qrFile, setQrFile] = useState<File | null>(null)
  const [qrPreview, setQrPreview] = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    if (settings) setForm({ ...settings })
  }, [settings])

  useEffect(
    () => () => {
      if (qrPreview) URL.revokeObjectURL(qrPreview)
    },
    [qrPreview],
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error('Settings not loaded.')
      let gcashQrUrl = form.gcashQrUrl
      if (qrFile) {
        gcashQrUrl = await uploadPaymentQr(qrFile)
      }
      return updatePaymentSettings({ ...form, gcashQrUrl })
    },
    onSuccess: (updated) => {
      toast.success('GCash payment settings saved.')
      setForm(updated)
      setQrFile(null)
      setQrPreview('')
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings.')
    },
  })

  const verifyMutation = useMutation({
    mutationFn: ({ id, approve, reason }: { id: string; approve: boolean; reason?: string }) =>
      verifyPayment(id, approve, reason),
    onSuccess: (_, variables) => {
      toast.success(variables.approve ? 'Payment verified. Booking marked as partially paid.' : 'Payment rejected.')
      setRejectingId(null)
      setRejectReason('')
      queryClient.invalidateQueries({ queryKey: ['payment-records'] })
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['activity-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['pickleball'] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update payment.')
    },
  })

  const handleQrSelect = (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Unsupported file type. Please use JPG, PNG, or WebP.')
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error('File is too large. Maximum size is 2 MB.')
      return
    }
    setQrFile(file)
    setQrPreview(URL.createObjectURL(file))
  }

  const removeQr = () => {
    setQrFile(null)
    setQrPreview('')
    setForm((prev) => (prev ? { ...prev, gcashQrUrl: '' } : prev))
    if (qrRef.current) qrRef.current.value = ''
  }

  const pending = records.filter((r) => r.status === 'pending_verification')
  const reviewed = records.filter((r) => r.status !== 'pending_verification')

  return (
    <div className="space-y-6">
      <PageHeading
        title="Payments"
        description="Manage GCash settings and verify customer down payment receipts."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <QrCode className="h-5 w-5 text-primary" /> GCash Payment Settings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure the GCash QR code and account details shown to customers during checkout.
          </p>
        </CardHeader>
        <CardContent>
          {settingsLoading || !form ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px,1fr]">
              <div className="space-y-3">
                <Label>GCash QR code</Label>
                <div className="flex aspect-square w-full max-w-xs items-center justify-center overflow-hidden rounded-2xl border bg-white p-3">
                  {qrPreview || form.gcashQrUrl ? (
                    <img
                      src={qrPreview || form.gcashQrUrl}
                      alt="GCash QR code"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ImagePlus className="h-10 w-10" />
                      <span className="text-xs">No QR code uploaded</span>
                    </div>
                  )}
                </div>
                <input
                  ref={qrRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleQrSelect(file)
                    e.target.value = ''
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => qrRef.current?.click()}>
                    <Upload className="h-4 w-4" /> {form.gcashQrUrl || qrPreview ? 'Replace QR' : 'Upload QR'}
                  </Button>
                  {(form.gcashQrUrl || qrPreview) && (
                    <Button type="button" variant="ghost" onClick={removeQr}>Remove</Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">JPG, PNG, or WebP · max 2 MB</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gcash-name">GCash account name</Label>
                    <Input
                      id="gcash-name"
                      value={form.gcashAccountName}
                      onChange={(e) => setForm((p) => (p ? { ...p, gcashAccountName: e.target.value } : p))}
                      placeholder="The Farm Resort"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gcash-number">GCash number</Label>
                    <Input
                      id="gcash-number"
                      value={form.gcashNumber}
                      onChange={(e) => setForm((p) => (p ? { ...p, gcashNumber: e.target.value } : p))}
                      placeholder="09XX XXX XXXX"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gcash-instructions">Payment instructions</Label>
                  <Textarea
                    id="gcash-instructions"
                    rows={4}
                    value={form.instructions}
                    onChange={(e) => setForm((p) => (p ? { ...p, instructions: e.target.value } : p))}
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
                    <Save className="h-4 w-4" /> Save payment settings
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <CreditCard className="h-5 w-5 text-primary" /> Payment Verifications
            {pending.length > 0 && (
              <Badge variant="warning" className="ml-1">{pending.length} pending</Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Review submitted receipts and verify or reject 50% down payments.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {recordsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading payments…
            </div>
          ) : records.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No payment submissions yet.</div>
          ) : (
            <>
              {pending.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Pending verification</h3>
                  <div className="space-y-4">
                    {pending.map((record) => (
                      <div key={record.id} className="rounded-xl border p-4">
                        <div className="flex flex-col gap-4 lg:flex-row">
                          <a
                            href={record.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-full max-w-[200px] shrink-0 overflow-hidden rounded-lg border bg-muted/20"
                          >
                            {record.receiptUrl ? (
                              <img src={record.receiptUrl} alt="Payment receipt" className="aspect-[3/4] w-full object-cover" />
                            ) : (
                              <div className="flex aspect-[3/4] items-center justify-center text-muted-foreground"><Receipt className="h-8 w-8" /></div>
                            )}
                          </a>
                          <div className="flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm font-semibold">{record.bookingReference}</span>
                              <Badge variant="secondary">{TYPE_LABELS[record.bookingType]}</Badge>
                              <Badge variant="warning">Pending verification</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                              <div><p className="text-xs text-muted-foreground">Total</p><p className="font-medium">{formatCurrency(record.totalAmount)}</p></div>
                              <div><p className="text-xs text-muted-foreground">Down payment (50%)</p><p className="font-medium">{formatCurrency(record.downPaymentAmount)}</p></div>
                              <div><p className="text-xs text-muted-foreground">Remaining</p><p className="font-medium">{formatCurrency(record.remainingBalance)}</p></div>
                              <div><p className="text-xs text-muted-foreground">Submitted</p><p className="font-medium">{formatDate(record.createdAt)}</p></div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                onClick={() => verifyMutation.mutate({ id: record.id, approve: true })}
                                loading={verifyMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setRejectingId(record.id)}
                              >
                                <XCircle className="h-4 w-4" /> Reject
                              </Button>
                              {record.receiptUrl && (
                                <Button size="sm" variant="ghost" asChild>
                                  <a href={record.receiptUrl} target="_blank" rel="noreferrer">View receipt</a>
                                </Button>
                              )}
                            </div>
                            {rejectingId === record.id && (
                              <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                                <Label htmlFor={`reason-${record.id}`}>Rejection reason (optional)</Label>
                                <Textarea
                                  id={`reason-${record.id}`}
                                  rows={2}
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder="e.g. Receipt amount does not match, unclear screenshot…"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() =>
                                      verifyMutation.mutate({ id: record.id, approve: false, reason: rejectReason })
                                    }
                                    loading={verifyMutation.isPending}
                                  >
                                    Confirm rejection
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason('') }}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reviewed.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Reviewed</h3>
                  <div className="space-y-2">
                    {reviewed.map((record) => (
                      <div key={record.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-semibold">{record.bookingReference}</span>
                            <Badge variant="secondary">{TYPE_LABELS[record.bookingType]}</Badge>
                            <Badge variant={record.status === 'verified' ? 'success' : 'destructive'}>
                              {record.status === 'verified' ? 'Verified (50%)' : 'Rejected'}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Down payment {formatCurrency(record.downPaymentAmount)} · Remaining {formatCurrency(record.remainingBalance)}
                          </p>
                          {record.rejectionReason && (
                            <p className="mt-1 text-xs text-destructive">Reason: {record.rejectionReason}</p>
                          )}
                        </div>
                        {record.receiptUrl && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={record.receiptUrl} target="_blank" rel="noreferrer">View receipt</a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
