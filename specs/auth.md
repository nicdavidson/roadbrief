# RoadBrief — Authentication

Three tiers. Keep it dead simple.

## Tiers

### Tier 1: Anonymous Viewer
- No account, no token needed
- Can: view ride plan, browse POIs, export routes
- Can't: post photos, have a profile
- Access: open the share link, that's it

### Tier 2: Local-Only Rider
- Enters first name in the app, stored in localStorage
- Gets a JWT stored in localStorage (issued by server, tied to a Rider record with auth_type="local")
- Can: everything Tier 1 + post photos with their name
- Can't: recover their identity if they clear browser data
- No email, no password

### Tier 3: Full Account
- Creates account with display_name + password
- Email is OPTIONAL — if omitted, show warning: "Without an email, you can't reset your password if you forget it."
- Can: everything Tier 2 + persistent identity across devices
- Profile: photo, motorcycle, emergency contact

## Implementation

### JWT
- Library: `python-jose` or `PyJWT`
- Payload: `{ sub: rider_id, role: "admin"|"leader"|"rider", auth_type: "anonymous"|"local"|"account", exp: ... }`
- Expiry: 30 days (these are ride-length sessions, not banking)
- Stored in localStorage on client

### Password Hashing
- `bcrypt` via `passlib`
- Only for Tier 3 accounts

### Middleware
```python
# Three decorators / dependencies:
# public — no auth required
# requires_rider — valid JWT required (any tier with a token)
# requires_admin — valid JWT + role="admin"
```

### Registration Flow
```
POST /api/v1/auth/register
Body: { display_name: "Dave" }
→ Creates Rider(auth_type="local"), returns JWT

POST /api/v1/auth/register
Body: { display_name: "Nic", password: "..." }
→ Creates Rider(auth_type="account"), returns JWT + warning about no email

POST /api/v1/auth/register
Body: { display_name: "Nic", email: "nic@...", password: "..." }
→ Creates Rider(auth_type="account"), returns JWT
```

### Upgrade Path
Local-only riders can later add email+password to upgrade to full account without losing their photos/identity.
```
POST /api/v1/riders/me/upgrade
Body: { email?, password }
```
