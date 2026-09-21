import { z } from "zod";

export const courseDeliveryBody = z.object({
  courseId: z.string().min(1),
  learnerId: z.string().min(1),
  educatorId: z.string().min(1),
  deadlineAt: z.string().datetime(),
  deliveryState: z.enum(["delivered", "awaiting_material"]),
});

export type CourseDeliveryBody = z.infer<typeof courseDeliveryBody>;

export type EducatorReport = {
  courseId: string;
  learnerId: string;
  educatorId: string;
  status: "on_track" | "needs_educator_review";
  idempotencyKey: string;
};

export interface ErrorCapture {
  capture(exception: Error, idempotencyKey: string): Promise<void>;
}

export function decideEducatorReport(input: CourseDeliveryBody, now: Date): EducatorReport {
  const lateDelivery = input.deliveryState === "awaiting_material" && new Date(input.deadlineAt) <= now;
  return {
    courseId: input.courseId,
    learnerId: input.learnerId,
    educatorId: input.educatorId,
    status: lateDelivery ? "needs_educator_review" : "on_track",
    idempotencyKey: `course-delivery:${input.courseId}:${input.learnerId}:${input.deadlineAt}`,
  };
}

export async function handleCourseDelivery(
  body: unknown,
  now: Date,
  errors: ErrorCapture,
): Promise<EducatorReport> {
  const input = courseDeliveryBody.parse(body);
  const report = decideEducatorReport(input, now);

  if (report.status === "needs_educator_review") {
    await errors.capture(
      new Error(`Course ${input.courseId} missed learner ${input.learnerId}'s delivery deadline.`),
      report.idempotencyKey,
    );
  }
  return report;
}
