const SERVICE_RATE_PEOPLE_PER_MIN: Record<string, number> = {
  western: 4.2,
  korean: 3.6,
  ramen: 1.6,
  instant: 2.35,
  set_meal: 3.2,
  single_dish: 2.8,
  dam_a: 2.9,
  pangeos: 2.35,
};

const OVERHEAD_MIN: Record<string, number> = {
  ramen: 1,
  instant: 1,
  pangeos: 1,
};

export function computeWaitMinutes(
  queueLen: number,
  restaurantId: string,
  cornerId: string
): number {
  const serviceRate = SERVICE_RATE_PEOPLE_PER_MIN[cornerId] ?? 2.5;
  const overhead = OVERHEAD_MIN[cornerId] ?? 0;

  let wait = Math.ceil(queueLen / serviceRate + overhead);

  const isInstantPlaza = restaurantId === 'hanyang_plaza' && cornerId === 'instant';
  const isPangeosLife = restaurantId === 'life_science' && cornerId === 'pangeos';

  if (isInstantPlaza) {
    wait = Math.min(wait, 18);
  } else if (isPangeosLife) {
    wait = Math.min(wait, 16);
  } else {
    wait = Math.min(wait, 12);
  }

  return wait;
}
