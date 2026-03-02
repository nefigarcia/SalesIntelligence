# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Mobile / OAuth notes

- The app now detects mobile devices and uses redirect-based Google sign-in on phones to avoid popup blockers and inconsistent mobile popup behavior. Desktop still uses popup sign-in.
- A mobile sidebar trigger was added to the header so the sidebar sheet can be opened on small screens.
- Safe-area insets (for notches and home indicators) have been added to the global CSS.

If you want this behavior changed (e.g., detect mobile by UA instead of viewport), open an issue or ask for a tweak.
