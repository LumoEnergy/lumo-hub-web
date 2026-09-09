/**
 * Rendered for any path inside the demo base that is not a real screen.
 *
 * Deliberately says nothing about what this is. Anything outside the base path never
 * reaches the app at all, because the router is mounted at the base, a static host
 * will serve the bundle at the site root, and the app declining to render is what
 * makes the unguessable path mean anything.
 */
export function NotFoundPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <p className="text-[15px] text-ink-mute">Not found.</p>
    </main>
  );
}
