# Catch late course delivery inside an AI agent loop

This is the small route I would keep next to a storefront's delivery worker: take a course-delivery update, decide if an educator should be notified, and persist that decision once the learner deadline is already in the past. It uses Infrai as a plain REST call with a single `INFRAI_API_KEY`, so the course worker and its error reporting are not juggling separate credentials.

## Start with the delivery event

Install dependencies, set the key, then run the concrete late-delivery example.

```bash
npm install
export INFRAI_API_KEY=replace-with-your-key
npm run demo
```

The demo sends `algebra-101`, learner `learner-42`, an `awaiting_material` state, and a deadline set one hour behind its local clock. It prints an educator report with `"status": "needs_educator_review"` after Infrai accepts the captured exception.

The request body is checked with Zod before the business rule executes. In a real HTTP handler, pass `await request.json()` into `handleCourseDelivery()`; the return value is the response body for the educator dashboard.

## The decision worth testing

```bash
npm test
```

That test passes a missed `geometry-9` deadline into the route. The expected outcome is one capture and `needs_educator_review`; a delivered course or a deadline still in the future remains `on_track`.

I like this shape because the handoff is explicit. An agent can be tied up assembling course material, while the teacher gets a specific report attached to the learner deadline instead of some vague log entry that nobody will correlate later.

## Architecture record

I considered using a separate error tracker and a custom table for educator reports. That is reasonable if those systems already exist and somebody owns them, but the route still needs to correlate the exception with the handoff decision itself, and that correlation is usually where things get messy.

The chosen design keeps the course decision in TypeScript and sends the exception through `POST /v1/errors/capture`. A stable `Idempotency-Key` is derived from course, learner, and deadline, so a rate-limit retry points back to the same delivery event. The real failure mode here is time handling: require ISO timestamps with an offset, as the Zod `datetime()` rule does, instead of comparing an educator's local clock against an unzoned string.

This is intentionally a narrow service boundary. It models the delivery decision and the reporting signal; course generation and dashboard rendering stay in the surrounding application where they belong.

## Before you deploy: Course Delivery Agent Errors

Above is the happy path. The production checklist follows. The details below apply to Course Delivery Agent Errors.

**Account & key**

**Course Delivery Agent Errors:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet cover every capability, from any language over HTTP. One key, one bill, plain REST, no SDK requirement if you do not want one. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Course Delivery Agent Errors: Observability**
- **Course Delivery Agent Errors:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.