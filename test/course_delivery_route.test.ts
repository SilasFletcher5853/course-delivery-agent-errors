import assert from "node:assert/strict";
import test from "node:test";
import { handleCourseDelivery } from "../src/course_delivery_route.js";

test("a missed course delivery creates an educator review report and one error capture", async () => {
  const calls: Array<{ message: string; key: string }> = [];
  const report = await handleCourseDelivery(
    {
      courseId: "geometry-9",
      learnerId: "learner-17",
      educatorId: "educator-3",
      deadlineAt: "2026-09-14T08:00:00.000Z",
      deliveryState: "awaiting_material",
    },
    new Date("2026-09-14T08:01:00.000Z"),
    { capture: async (exception, key) => { calls.push({ message: exception.message, key }); } },
  );

  assert.equal(report.status, "needs_educator_review");
  assert.equal(calls.length, 1);
  assert.match(calls[0].message, /geometry-9/);
  assert.equal(calls[0].key, "course-delivery:geometry-9:learner-17:2026-09-14T08:00:00.000Z");
});
