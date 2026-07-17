import type { RatingInput } from "@/types/models";

export const SCORE_WEIGHTS = {
  taste: 0.4,
  texture: 0.2,
  value: 0.2,
  packaging: 0.1,
  buy_again: 0.1,
} as const;

export function calculateOverallScore(
  rating: Pick<RatingInput, keyof typeof SCORE_WEIGHTS>,
): number {
  const score = Object.entries(SCORE_WEIGHTS).reduce(
    (total, [factor, weight]) =>
      total + rating[factor as keyof typeof SCORE_WEIGHTS] * weight,
    0,
  );
  return Math.round(score * 10) / 10;
}
