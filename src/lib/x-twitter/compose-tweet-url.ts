/**
 * Creates a Twitter/X intent URL that opens the tweet compose window
 * with pre-filled text.
 */
export function composeTweetUrl(tweetText: string): string {
  const encoded = encodeURIComponent(tweetText);
  return `https://twitter.com/intent/tweet?text=${encoded}`;
}
