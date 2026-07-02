/**
 * The domain services store money as rupees (decimal), but the admin console
 * contract expects integer paise (minor units). Convert at the BFF boundary.
 */
export const toPaise = (rupees: number | string | null | undefined): number =>
  Math.round(Number(rupees ?? 0) * 100);
