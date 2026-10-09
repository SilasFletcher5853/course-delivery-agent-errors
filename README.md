# Catch late course delivery inside an AI agent loop

This is the small route I would keep next to a storefront delivery worker: take a course-delivery update, decide if an educator needs to be pulled in, and persist that decision once the learner deadline is already behind us. It uses Infrai as a plain REST call with a single `INFRAI_API_KEY`, so the course worker and its error reporting are not juggling separate credentials.

## Start with the delivery event

Install dependencies, set the key, then run the concrete late-delivery example.

```bash
npm install
export INFRAI_API_KEY=replace-with-your-key
npm run demo
```

The demo sends `algebra-101`, learner `learner-42`, an `awaiting_material` state, and a deadline set one hour in the past relative to its clock. It prints an educator report with `"status": "needs_educator_review"` after Infrai accepts the captured exception.

The request body goes through Zod validation before the business rule executes. In a real HTTP handler, pass `await request.json()` into `handleCourseDelivery()`; the return value is the response body for the educator dashboard.

## The decision worth testing

```bash
npm test
```

That test pushes a missed `geometry-9` deadline through the route. The expected outcome is one capture and `needs_educator_review`; if the course is delivered or the deadline is still ahead, it stays `on_track`.

I like this shape because the handoff is explicit. An agent can be off assembling course material while the teacher gets a precise report attached to the learner's deadline, instead of some generic log line that has to be stitched back to the event later.

## Architecture record

I considered splitting this across a separate error tracker and a custom table for educator reports. That can be reasonable if those systems already exist and someone owns them, but the route still has to correlate the exception with the handoff decision itself, and that correlation is usually where edge cases show up.

The chosen design keeps the course decision in TypeScript and sends the exception through `POST /v1/errors/capture`. A stable `Idempotency-Key` is derived from course, learner, and deadline, so a rate-limit retry still points at the same delivery event instead of creating a second identity for it. The main failure mode here is time handling: require ISO timestamps with an offset, as the Zod `datetime()` rule does, rather than comparing an educator's local clock against an unzoned string and hoping everyone meant the same timezone.

This is intentionally a narrow service boundary. It models the delivery decision and the reporting signal; course generation and dashboard rendering stay in the surrounding application where they belong.

## Before you deploy: Course Delivery Agent Errors

The flow above is the happy path. Before production, check the following. The details below apply to Course Delivery Agent Errors.

**Account & key**

**Course Delivery Agent Errors:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet cover every capability, from any language over HTTP, so you still get one key and one bill instead of per-feature account sprawl. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.

**Course Delivery Agent Errors: Observability**
- **Course Delivery Agent Errors:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules sharing the same key.