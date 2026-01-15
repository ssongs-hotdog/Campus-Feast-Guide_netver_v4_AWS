# H-Eat PoC Design Guidelines

## Design Approach
**Reference-Based Approach**: Mobile-first utility application inspired by modern transit/food delivery apps (Kakao Bus, Yogiyo) with university identity integration. Focus on information clarity and speed of comprehension.

## Core Design Principles
- **Mobile-First**: Optimized for smartphone viewport, compact cards
- **Information Hierarchy**: Critical data (wait times, congestion) prioritized
- **Hanyang University Identity**: Blue accent tones, clean institutional aesthetic
- **Minimal Distraction**: No unnecessary animations, stable UX

## Typography
- **Font Family**: System fonts (SF Pro/Roboto) for optimal readability
- **Hierarchy**:
  - Page titles: 24px/bold
  - Card menu names: 18px/semibold (large, prominent)
  - Corner labels: 12px/medium
  - Wait times: 14px/regular
  - Body text: 14px/regular

## Layout System
**Spacing**: Tailwind units of 2, 4, 6, and 8 (p-2, m-4, gap-6, py-8)
- Card padding: p-4
- Section spacing: py-6 to py-8
- Button gaps: gap-2
- Tight grouping for related buttons (location/hours): gap-1

## Color System
**Brand**: Hanyang blue (#0066CC or similar) for accents, CTAs
**Congestion Gradient** (5-level system):
- Level 1 (매우여유): Green (#10B981)
- Level 2 (여유): Yellow-green (#84CC16)
- Level 3 (보통): Yellow (#EAB308)
- Level 4 (혼잡): Orange (#F97316)
- Level 5 (매우혼잡): Red (#EF4444)
**Neutrals**: White backgrounds, gray-100/200 for cards, gray-500/700 for text

## Component Library

### Main Screen Layout
1. **Top Bar**: Date display (center) + left/right arrows (minimal interaction)
2. **Time Controls Strip**: 
   - Mode badge (realtime/sim)
   - Time slider (1-minute increments)
   - Play/Pause button
   - Demo speed toggle
   - "실시간으로 돌아가기" button
3. **Restaurant Sections** (vertical scroll):
   - Section header: Restaurant name + two adjacent buttons [위치] [운영시간] (minimal gap)
   - Corner cards grid below each header

### Corner Card Design (Compact)
- **Fixed corner display order** per restaurant
- Layout quadrants:
  - Top-left: Corner label pill (horizontal text, colored background)
  - Center-left: Menu name (large, bold)
  - Right side: 5-bar horizontal congestion indicator + label text
  - Bottom: "예상 대기시간: n분" (subtle gray)
- Card style: White background, subtle shadow, rounded corners (8px)
- Tap area: Full card clickable

### Congestion Bar Component
- 5 horizontal segments (equal width)
- Fill from left based on congestion level
- Filled segments use gradient colors, unfilled use gray-200
- Height: 8-10px, rounded ends

### Detail Page Layout
- Back button (top-left)
- Congestion summary card: Wait time + bar + label + **queue_len displayed here only**
- Menu card:
  - Left: Square placeholder image (gray box with "사진" text)
  - Right: Menu name, price ("3,500원" format, NO emoji), items list
- Bottom: Full-width CTA button "결제하기"

### Ticket/QR Page
- Single ticket display (1인 1주문권)
- States: stored/active/used/expired
- QR code: **Black fill, white background**
- Countdown timer below QR (실제 시간 기준)
- Action buttons: "수령 시작(활성화)" / "사용 완료"

### Info Popovers
- Triggered by [위치] [운영시간] buttons
- Clean text display with proper line breaks
- No strikethrough, no markdown artifacts
- Close button (X) top-right

## Images
**No hero images** - This is a utility app focused on data clarity
**Menu placeholder images**: Gray boxes with "사진" text on detail pages (120x120px squares)

## Navigation
- Main screen: Vertical scroll through restaurant sections
- Detail navigation: Click card → detail page
- Ticket access: Post-payment redirect to /ticket

## Accessibility
- High contrast for congestion colors
- Readable font sizes (minimum 14px)
- Touch targets minimum 44x44px
- Clear visual states for interactive elements

## Key UX Flows
1. **Quick scan**: Open app → see all restaurants/corners at a glance
2. **Detail check**: Tap corner card → view menu/price/wait details → pay
3. **Ticket activation**: Navigate to ticket → activate → show QR → staff scan
4. **Demo mode**: Toggle simulation → scrub timeline → show congestion changes

## Critical Constraints
- **No emoji in prices** (always "원" suffix with comma separator)
- **Fixed corner order** per restaurant (western→korean→instant→ramen for Hanyang Plaza)
- **QR timer independence**: Always real-time countdown, never affected by simulation speed
- **Location/Hours buttons**: Must be visually adjacent (gap-1)
- **Data-driven**: All congestion/wait times from CSV, no hardcoded values