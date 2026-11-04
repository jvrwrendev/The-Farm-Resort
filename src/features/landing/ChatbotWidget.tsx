import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowUp, MessageCircle, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { BRAND_LOGO_URL, BRAND_NAME } from '@/lib/brand'
import { DEFAULT_MAX_GUESTS, DEFAULT_PRICE_PER_NIGHT } from '@/lib/constants'
import { isSupabaseConfigured } from '@/lib/supabase'
import { cn, uid } from '@/lib/utils'
import { queryKeys } from '@/lib/queryKeys'
import { getAccommodation } from '@/services/accommodation.service'
import { getSettings } from '@/services/settings.service'
import { getPolicies } from '@/services/resort.service'
import { MOCK_POLICIES } from '@/features/landing/mockContent'
import {
  buildAnswer,
  buildFallbackAnswer,
  matchTopic,
  QUICK_REPLIES,
  type ChatAction,
  type ChatContext,
  type ChatTopicId,
} from '@/features/landing/chatFaq'

interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  text: string
  actions?: ChatAction[]
}

const GREETING: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: `Hi! I'm your ${BRAND_NAME} concierge. Ask me about rates, availability, policies, amenities, or booking your private stay.`,
  actions: [
    { label: 'View rates', href: '#rooms' },
    { label: 'Check availability', href: '#calendar' },
  ],
}

const FALLBACK_CANCELLATION =
  MOCK_POLICIES.find((policy) => /cancel/i.test(policy.title))?.description ??
  'Free cancellation up to 7 days before check-in. Cancellations made within 7 days are subject to a one-night charge.'

function ChatActionLink({ action, onNavigate }: { action: ChatAction; onNavigate: () => void }) {
  const className =
    'inline-flex items-center rounded-full border border-primary/20 bg-background/70 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10'

  if (action.href.startsWith('/')) {
    return (
      <Link to={action.href} onClick={onNavigate} className={className}>
        {action.label}
      </Link>
    )
  }

  const isHttp = action.href.startsWith('http')

  return (
    <a
      href={action.href}
      onClick={onNavigate}
      className={className}
      target={isHttp ? '_blank' : undefined}
      rel={isHttp ? 'noreferrer noopener' : undefined}
    >
      {action.label}
    </a>
  )
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const launcherRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<number[]>([])
  const reduceMotion = useReducedMotion()

  const { data: accommodation } = useQuery({
    queryKey: queryKeys.accommodation,
    queryFn: getAccommodation,
    enabled: open,
    retry: false,
  })

  const { data: settings } = useQuery({
    queryKey: queryKeys.resortSettings,
    queryFn: getSettings,
    enabled: open && isSupabaseConfigured,
    retry: false,
  })

  const { data: policies } = useQuery({
    queryKey: queryKeys.policies,
    queryFn: getPolicies,
    enabled: open,
  })

  const context: ChatContext = useMemo(
    () => ({
      price: accommodation?.pricePerNight ?? DEFAULT_PRICE_PER_NIGHT,
      maxGuests: accommodation?.maxGuests ?? settings?.maxGuests ?? DEFAULT_MAX_GUESTS,
      checkInTime: settings?.checkInTime ?? '14:00',
      checkOutTime: settings?.checkOutTime ?? '12:00',
      cancellationPolicy: settings?.cancellationPolicy ?? FALLBACK_CANCELLATION,
      address: settings?.address ?? 'Brgy. San Isidro, Antipolo City',
      phone: settings?.phone ?? '+63 912 345 6789',
      email: settings?.email ?? 'stay@thefarm.ph',
      amenities: accommodation?.amenities ?? [],
      policies: policies && policies.length > 0 ? policies : MOCK_POLICIES,
    }),
    [accommodation, settings, policies],
  )

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const node = scrollRef.current
    if (!node) return
    node.scrollTo({ top: node.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [messages, isTyping, open, reduceMotion])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 250)
    return () => window.clearTimeout(timer)
  }, [open])

  const close = useCallback(() => {
    setOpen(false)
    window.setTimeout(() => launcherRef.current?.focus(), 0)
  }, [])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, close])

  const reply = useCallback(
    (answer: ReturnType<typeof buildAnswer>) => {
      setIsTyping(true)
      const timer = window.setTimeout(() => {
        setMessages((prev) => [...prev, { id: uid(), role: 'assistant', ...answer }])
        setIsTyping(false)
      }, 450)
      timersRef.current.push(timer)
    },
    [],
  )

  const askTopic = useCallback(
    (topic: ChatTopicId, label: string) => {
      if (isTyping) return
      setMessages((prev) => [...prev, { id: uid(), role: 'user', text: label }])
      reply(buildAnswer(topic, context))
    },
    [context, isTyping, reply],
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = input.trim()
    if (!value || isTyping) return

    setInput('')
    setMessages((prev) => [...prev, { id: uid(), role: 'user', text: value }])

    const topic = matchTopic(value)
    reply(topic ? buildAnswer(topic, context) : buildFallbackAnswer(context))
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            id="farm-chatbot-panel"
            role="dialog"
            aria-label={`Chat with ${BRAND_NAME}`}
            aria-modal="false"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            className="fixed bottom-24 right-4 z-[60] flex h-[min(520px,calc(100dvh-8rem))] w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:bottom-28 sm:right-6"
          >
            <div className="flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-foreground/15">
                <img src={BRAND_LOGO_URL} alt="" className="h-full w-full object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold">{BRAND_NAME} Concierge</p>
                <p className="flex items-center gap-1.5 text-[11px] text-primary-foreground/75">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Here to help · replies instantly
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close chat"
                className="rounded-full p-2 transition-colors hover:bg-primary-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              ref={scrollRef}
              role="log"
              aria-live="polite"
              className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                      message.role === 'user'
                        ? 'rounded-br-md bg-primary text-primary-foreground'
                        : 'rounded-bl-md bg-muted text-foreground',
                    )}
                  >
                    <p className="whitespace-pre-line">{message.text}</p>
                    {message.actions && message.actions.length > 0 && message.role === 'assistant' && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {message.actions.map((action) => (
                          <ChatActionLink key={`${message.id}-${action.label}`} action={action} onNavigate={close} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start" aria-label="Concierge is typing">
                  <div className="flex w-fit items-center gap-1.5 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                    {[0, 1, 2].map((index) => (
                      <span
                        key={index}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
                        style={{ animationDelay: `${index * 120}ms`, animationDuration: '900ms' }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto border-t bg-muted/30 px-3 py-2.5">
              {QUICK_REPLIES.map((quickReply) => (
                <button
                  key={quickReply.id}
                  type="button"
                  onClick={() => askTopic(quickReply.id, quickReply.label)}
                  disabled={isTyping}
                  className="shrink-0 rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {quickReply.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t bg-background px-3 py-3">
              <Input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about rates, policies…"
                aria-label="Type your question"
                maxLength={200}
                className="h-10 rounded-full"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isTyping}
                aria-label="Send message"
                className="h-10 w-10 shrink-0 rounded-full"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        aria-expanded={open}
        aria-controls="farm-chatbot-panel"
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:bottom-6 sm:right-6"
      >
        {!open && (
          <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-md sm:block">
            Need help?
          </span>
        )}
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: reduceMotion ? 0 : 0.15 }}
            >
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span
              key="chat"
              initial={{ opacity: 0, rotate: 90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -90 }}
              transition={{ duration: reduceMotion ? 0 : 0.15 }}
            >
              <MessageCircle className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-background" />
        )}
      </motion.button>
    </>
  )
}
