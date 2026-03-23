export default function Loading() {
  // This route segment's `loading.tsx` should not visibly override the app.
  // The global `PageTransition` overlay handles the UX while the route is loading.
  return <div className="hidden" aria-hidden />;
}
