import { PublicLayout } from '@/components/layout/Navbar'
import { HeroSection, AboutSection } from '@/features/landing/HeroSection'
import { RoomsSection } from '@/features/landing/RoomsSection'
import { GallerySection, AmenitiesSection, PoliciesSection } from '@/features/landing/GallerySection'
import { AvailabilitySection } from '@/features/landing/AvailabilitySection'
import { ChatbotWidget } from '@/features/landing/ChatbotWidget'
import { PickleballTeaserSection } from '@/features/pickleball/PickleballTeaserSection'

export default function LandingPage() {
  return (
    <PublicLayout>
      <HeroSection />
      <AboutSection />
      <RoomsSection />
      <PickleballTeaserSection />
      <AmenitiesSection />
      <GallerySection />
      <AvailabilitySection />
      <PoliciesSection />
      <ChatbotWidget />
    </PublicLayout>
  )
}
