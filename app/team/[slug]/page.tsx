import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TeamMemberBioView } from "@/components/team/team-member-bio-view";
import { getLeadershipMember, leadershipTeam } from "@/lib/team-leadership";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return leadershipTeam.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const member = getLeadershipMember(slug);
  if (!member) return { title: "Team" };
  return {
    title: `${member.name} — ${member.role}`,
    description: member.excerpt,
  };
}

export default async function TeamMemberBioPage({ params }: Props) {
  const { slug } = await params;
  const member = getLeadershipMember(slug);
  if (!member) notFound();

  return <TeamMemberBioView member={member} />;
}
