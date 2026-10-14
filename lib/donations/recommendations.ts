/**
 * Who a donation may recommend, decided on the server. Client-safe and pure so
 * it can be tested.
 *
 * A recommendation is non-binding for everyone — an input to allocation only.
 *
 *   - Corporate gifts may recommend a school but never a student, whatever the
 *     browser sent, including through a campaign that has students.
 *   - An individual who answers NO keeps the campaign attribution but no student,
 *     and is not asked for the relationship acknowledgement.
 *   - An individual who answers YES may recommend only students actually on the
 *     campaign (no free-text names), and must acknowledge the relationship policy.
 */
/**
 * The relationship acknowledgement exactly as the donor sees it. The same
 * string is stored with the gift, with the time it was given, so the record
 * shows what was agreed to.
 */
export const RELATIONSHIP_ACK_TEXT =
  "Relationship policy: I understand that I may not designate or direct this donation to benefit my own dependent or family member.";

export function sanitizeRecommendation(input: {
  corporate: boolean;
  designate: boolean;
  studentIds: string[];
  /** Students linked to the campaign the gift came through. */
  campaignStudentIds: string[];
  schoolId: string | null;
}): { studentIds: string[]; schoolId: string | null; relationshipAckRequired: boolean } {
  if (input.corporate) {
    return { studentIds: [], schoolId: input.schoolId, relationshipAckRequired: false };
  }
  if (!input.designate) {
    return { studentIds: [], schoolId: null, relationshipAckRequired: false };
  }
  const allowed = new Set(input.campaignStudentIds);
  const studentIds = Array.from(new Set(input.studentIds.filter((id) => allowed.has(id))));
  return {
    studentIds,
    schoolId: input.schoolId,
    relationshipAckRequired: studentIds.length > 0,
  };
}
