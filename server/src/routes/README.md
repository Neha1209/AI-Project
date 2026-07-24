Say your frontend sends a POST to /api/ask.

Express looks at the full path: /api/ask
It matches the rule app.use('/api/ask', askRouter) — the path does start with /api/ask
Express removes that matched prefix from the path. What's left? An empty string, which Express treats as /
Express now looks inside askRouter for something that handles / — and finds your router.post('/', ...) — match found, that function runs

That's the whole mechanism. askRouter never even sees the string /api/ask — by the time the request reaches it, that part has already been stripped off. As far as ask.js is concerned, it only ever exists to handle paths relative to wherever it gets mounted.

Suppose instead you'd written this inside ask.js:

router.post('/foo', (req, res) => { ... })

Now walk a request to /api/ask/foo through the same steps:

Full path: /api/ask/foo
Matches app.use('/api/ask', askRouter) — starts with /api/ask, yes
Strip /api/ask off the front. What's left? /foo
Express looks inside askRouter for something handling /foo — finds router.post('/foo', ...) — match

But if a request came in to just /api/ask (no /foo) with that same router code, step 3 would leave behind /, and there'd be no router.post('/', ...) registered to match it — you'd get a 404, because nothing inside askRouter handles the empty/root path.

we could write router.post('/', ...) in both ask.js and review.js without them colliding — one is mounted at /api/ask, the other at /api/review, so their identical-looking '/' routes actually answer to two completely different full URLs.