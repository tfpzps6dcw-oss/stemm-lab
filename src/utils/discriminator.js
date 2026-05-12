/**
 * Generates a unique team discriminator code.
 * Format: TM-XXXX where XXXX is a random 4-digit number.
 */
export function generateDiscriminator() {
  const min = 1000;
  const max = 9999;
  const number = Math.floor(Math.random() * (max - min + 1)) + min;
  return `TM-${number}`;
}