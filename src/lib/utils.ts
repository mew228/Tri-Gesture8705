/**
 * Generates a consistent pair of colors based on a string (e.g., artist name)
 * to create a beautiful gradient when album art is missing.
 */
export function stringToGradient(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 8) - hash);
  }

  const h = Math.abs(hash % 360);
  // Vibrant gradients with subtle shifting
  return `linear-gradient(135deg, hsl(${h}, 85%, 35%), hsl(${(h + 40) % 360}, 75%, 15%))`;
}

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}
