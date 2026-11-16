import { usePostHog } from "@posthog/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Terminal } from "lucide-react";
import { SkillCard } from "#/components/SkillCard";
import { getSkills } from "#/dataconnect-generated";
import { dataConnect } from "#/lib/firebase";

const getSkillsFn = createServerFn({ method: "GET" }).handler(async () => {
	try {
		const { data } = await getSkills(dataConnect, {
			searchTerm: "",
			limit: 10,
		});
		return data.skills;
	} catch (error) {
		console.error("Failed to fetch skills:", error);
		throw error;
	}
});

export const Route = createFileRoute("/")({
	component: Home,
	loader: () => getSkillsFn(),
});

function Home() {
	const posthog = usePostHog();

	const skills = Route.useLoaderData();

	return (
		<div id="home">
			<section className="hero">
				<div className="copy">
					<h1>
						The Registry for <br />
						<span className="text-gradient">Agentic Intelligence</span>
					</h1>

					<p>
						A high-performance registry for procedural agent skills. Discover,
						publish, and operate reusable agent capabilities from a route-driven
						workspace.
					</p>
				</div>

				<div className="actions">
					<Link
						to="/skills"
						className="btn-primary"
						onClick={() => {
							posthog.logger.info("registry browse requested", {
								action: "registry_browse",
							});
							posthog.capture("registry_browse_requested");
						}}
					>
						<Terminal size={18} />
						<span>Browse Registry</span>
					</Link>

					<Link
						to="/skills/new"
						className="btn-secondary"
						onClick={() => {
							posthog.logger.info("skill publish requested", {
								action: "skill_publish",
							});
							posthog.capture("skill_publish_requested");
						}}
					>
						Publish Skill
					</Link>
				</div>
			</section>

			<section className="latest">
				<div className="space-y-2">
					<h2>
						Recently Created <span className="text-gradient">Skills</span>
					</h2>
					<p>
						{" "}
						Latest skills loaded from database in descending creation order.
					</p>
				</div>

				<div>
					{skills.length > 0 ? (
						<div className="skills-grid">
							{skills.map((skill) => (
								<SkillCard key={skill.id} {...skill} />
							))}
						</div>
					) : (
						<p>No skills have been created yet.</p>
					)}
				</div>
			</section>
		</div>
	);
}
