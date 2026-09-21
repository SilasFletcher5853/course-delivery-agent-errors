import { handleCourseDelivery } from "./course_delivery_route.js";
import { infrai } from "./infrai_errors.js";

const report = await handleCourseDelivery(
  {
    courseId: "algebra-101",
    learnerId: "learner-42",
    educatorId: "educator-8",
    deadlineAt: "2026-09-14T09:00:00.000Z",
    deliveryState: "awaiting_material",
  },
  new Date("2026-09-14T10:00:00.000Z"),
  { capture: (exception, idempotencyKey) => infrai.errors.capture(exception, idempotencyKey) },
);

console.log(JSON.stringify(report, null, 2));
