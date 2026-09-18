import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeading } from '@/features/admin/components'
import { getCustomers } from '@/services/admin.service'
import { queryKeys } from '@/lib/queryKeys'
import { formatCurrency, getInitials } from '@/lib/utils'

export default function AdminCustomersPage() {
  const [search, setSearch] = useState('')

  const { data: customers = [], isLoading } = useQuery({
    queryKey: queryKeys.customers,
    queryFn: getCustomers,
  })

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return customers
    return customers.filter((customer) =>
      [customer.name, customer.email, customer.contactNumber].some((value) =>
        value.toLowerCase().includes(query),
      ),
    )
  }, [customers, search])

  return (
    <div className="space-y-6">
      <PageHeading title="Customers" description="Guests derived from your booking history." />

      <Card>
        <CardContent className="p-5">
          <div className="max-w-md space-y-2">
            <Label htmlFor="customer-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="customer-search"
                placeholder="Name, email, or contact"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Last booking</TableHead>
                <TableHead className="text-right">Total spending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Loading customers…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No customers found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {getInitials(customer.name)}
                        </span>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">{customer.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{customer.contactNumber}</TableCell>
                    <TableCell>{customer.bookingCount}</TableCell>
                    <TableCell>
                      {customer.lastBooking ? format(parseISO(customer.lastBooking), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(customer.totalSpending)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
