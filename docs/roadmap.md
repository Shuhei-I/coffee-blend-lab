# Coffee Blend Lab Roadmap

## Current state

The application has completed its migration to Supabase.

Completed:

- Authentication
- Supabase repositories
- Beans persistence
- Brew method persistence
- Recipe series and version persistence
- App settings persistence
- Removal of SQLite runtime
- Removal of localStorage fallback
- Removal of legacy Node API
- Automated tests
- Production build

## v1.0 goal

A new user can:

1. register beans
2. register a brew method
3. create a blend
4. save it as a recipe
5. create another version
6. compare and reuse previous versions

without confusion.

## Release priorities

### P0 — Required before public release

- Production smoke test
- Responsive navigation
- Mobile layout
- Clear loading and error states
- Reliable save confirmation
- Privacy policy
- Terms of use
- Contact or feedback route

Contact route note:

- The initial route may show a "preparing" state until a private feedback channel is available.
- Do not expose a personal email address in frontend source or built assets.
- Future feedback/contact should use a server-side relay, such as a Supabase Edge Function, with the destination address stored outside the client bundle.

### P1 — Core product experience

- Tasting notes
- Rating or preference evaluation
- Version comparison
- Clear previous-version changes
- Continue experiment action
- Recent experiments on home screen

### P2 — Sharing

- Public or link-based recipe sharing
- Share version history
- Copy a shared recipe
- Attribution
- Branch or remix concept

### P3 — Later exploration

- AI blend suggestions
- Inventory management
- PDF export
- Images
- Community features
- App-home structure based on `docs/future-home-ui-structure.md`
