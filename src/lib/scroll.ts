export const SECTION_SCROLL_OFFSET = 96

/**
 * Smooth-scroll to a landing-page section. Returns false when the current
 * route is not the landing page so callers can fall back to navigation.
 */
export function scrollToLandingSection(sectionId: string): boolean {
  if (typeof window === 'undefined') return false
  if (window.location.pathname !== '/') return false

  const target = document.getElementById(sectionId)
  if (!target) return false

  const top = target.getBoundingClientRect().top + window.scrollY - SECTION_SCROLL_OFFSET
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  window.history.replaceState(null, '', `/#${sectionId}`)
  return true
}
