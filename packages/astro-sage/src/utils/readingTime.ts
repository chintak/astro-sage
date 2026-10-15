/** Estimated minutes to read `markdown`, at ~230 words per minute. */
export function readingTime(markdown: string | undefined): number {
  const words = (markdown ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}
