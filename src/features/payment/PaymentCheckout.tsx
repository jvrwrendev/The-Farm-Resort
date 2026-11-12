import { useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, QrCode, Receipt, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  calculateDownPayment,
  getPaymentSettings,
  submitPayment,
  uploadPaymentReceipt,
  type PaymentBookingType,
  type PaymentRecord,
} from '@/services/payment.service'
import { formatCurrency } from '@/lib/utils'

const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024

interface PaymentCheckoutProps {
  bookingType: PaymentBookingType
  bookingReference: string
  totalAmount: number
  onSubmitted: (record: PaymentRecord) => void
  onCancel?: () => void
}

export function PaymentCheckout({
  bookingType,
  bookingReference,
  totalAmount,
  onSubmitted,
  onCancel,
}: PaymentCheckoutProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')

  const { data: settings, isLoading } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: getPaymentSettings,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Please upload your GCash payment receipt.')
      const receiptUrl = await uploadPaymentReceipt(file)
      return submitPayment({
        bookingType,
        bookingReference,
        totalAmount,
        receiptUrl,
      })
    },
    onSuccess: (record) => {
      toast.success('Payment receipt submitted. Awaiting verification.')
      onSubmitted(record)
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to submit payment.')
    },
  })

  const { downPayment, remaining } = calculateDownPayment(totalAmount)

  const handleFile = (selected: File) => {
    if (!ACCEPTED.includes(selected.type)) {
      toast.error('Unsupported file type. Please use JPG, PNG, or WebP.')
      return
    }
    if (selected.size > MAX_SIZE) {
      toast.error('File is too large. Maximum size is 2 MB.')
      return
    }
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  const clearFile = () => {
    setFile(null)
    setPreview('')
    if (fileRef.current) fileRef.current.value = ''
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading payment details…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="font-display text-xl">50% Down Payment Required</CardTitle>
          <p className="text-sm text-muted-foreground">
            To secure your reservation ({bookingReference}), please pay the down payment via GCash
            and upload your receipt.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total amount</p>
              <p className="mt-1 font-display text-xl font-bold text-foreground">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-primary">50% down payment</p>
              <p className="mt-1 font-display text-xl font-bold text-primary">{formatCurrency(downPayment)}</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Remaining balance</p>
              <p className="mt-1 font-display text-xl font-bold text-foreground">{formatCurrency(remaining)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Pay via GCash</h3>
              </div>
              <div className="flex flex-col items-center rounded-2xl border bg-white p-4">
                {settings?.gcashQrUrl ? (
                  <img
                    src={settings.gcashQrUrl}
                    alt="GCash QR code"
                    className="h-56 w-56 rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex h-56 w-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 text-muted-foreground">
                    <QrCode className="h-10 w-10" />
                    <p className="text-center text-xs">GCash QR code not yet configured. Please contact the resort.</p>
                  </div>
                )}
              </div>
              {(settings?.gcashAccountName || settings?.gcashNumber) && (
                <div className="rounded-xl border bg-muted/30 p-4 text-sm">
                  {settings.gcashAccountName && (
                    <p><span className="text-muted-foreground">Account name:</span> <span className="font-medium">{settings.gcashAccountName}</span></p>
                  )}
                  {settings.gcashNumber && (
                    <p className="mt-1"><span className="text-muted-foreground">GCash number:</span> <span className="font-medium">{settings.gcashNumber}</span></p>
                  )}
                </div>
              )}
              {settings?.instructions && (
                <p className="text-sm text-muted-foreground">{settings.instructions}</p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Upload payment receipt</h3>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
              {preview ? (
                <div className="relative overflow-hidden rounded-2xl border">
                  <img src={preview} alt="Receipt preview" className="max-h-72 w-full object-contain bg-muted/20" />
                  <button
                    type="button"
                    onClick={clearFile}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                    aria-label="Remove receipt"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-muted/20 p-10 text-center transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Upload GCash receipt</p>
                    <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, or WebP · max 2 MB</p>
                  </div>
                </button>
              )}
              {file && (
                <p className="truncate text-xs text-muted-foreground">Selected: {file.name}</p>
              )}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
                Your payment status will be <strong>Pending Verification</strong> until our team confirms the receipt.
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
                Cancel
              </Button>
            )}
            <Button
              type="button"
              onClick={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={!file}
            >
              <Receipt className="h-4 w-4" /> Submit payment receipt
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
