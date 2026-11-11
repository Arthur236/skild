import { ClerkProvider, useUser } from "@clerk/tanstack-react-start";
import { PostHogProvider, usePostHog } from "@posthog/react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect, useRef, useState } from "react";
import { Crosshair } from "#/components/Crosshair";
import { Navbar } from "#/components/Navbar";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

const posthogToken = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

function PostHogUserIdentification() {
	const { isLoaded, user } = useUser();
	const posthog = usePostHog();
	const identifiedUserId = useRef<string | null>(null);
	const [isPostHogReady, setIsPostHogReady] = useState(false);

	// PostHogProvider calls init() in its own effect, which runs after this
	// child's effects. Defer one tick so persisted identity is readable.
	useEffect(() => {
		if (posthog.__loaded) {
			setIsPostHogReady(true);
			return;
		}

		const timeout = window.setTimeout(() => {
			setIsPostHogReady(posthog.__loaded);
		}, 0);
		return () => window.clearTimeout(timeout);
	}, [posthog]);

	useEffect(() => {
		if (!isLoaded || !isPostHogReady) return;

		// PostHog persists identity across page loads, so check its stored state
		// as well as the mount-local ref (which is null after a fresh load).
		const hasPersistedIdentity =
			posthog.get_property("$user_state") === "identified";

		if (!user) {
			if (identifiedUserId.current || hasPersistedIdentity) {
				posthog.reset();
			}
			identifiedUserId.current = null;
			return;
		}

		if (identifiedUserId.current === user.id) return;

		const isDifferentIdentifiedUser =
			identifiedUserId.current !== null ||
			(hasPersistedIdentity && posthog.get_distinct_id() !== user.id);

		if (isDifferentIdentifiedUser) {
			posthog.reset();
		}

		posthog.identify(user.id, {
			email: user.primaryEmailAddress?.emailAddress,
			name: user.fullName ?? undefined,
		});
		identifiedUserId.current = user.id;
	}, [isLoaded, isPostHogReady, posthog, user]);

	return null;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Skild - The registry for agentic intelligence",
			},
			{
				name: "description",
				content:
					"Discover, publish and operate re-usable agent capabilities from a route-driven workspace",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	if (typeof window !== "undefined" && import.meta.env.DEV) {
		if (!posthogToken) {
			throw new Error(
				"VITE_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
			);
		}

		if (!posthogHost) {
			throw new Error(
				"VITE_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_PUBLIC_POSTHOG_HOST is configured",
			);
		}
	}

	const app = (
		<ClerkProvider>
			<PostHogUserIdentification />
			<div id="root-layout">
				<header>
					<div className="frame">
						<Navbar />
						<Crosshair />
						<Crosshair />
					</div>
				</header>

				<main>
					<div className="frame">{children}</div>
				</main>
			</div>

			<TanStackDevtools
				config={{
					position: "bottom-right",
				}}
				plugins={[
					{
						name: "Tanstack Router",
						render: <TanStackRouterDevtoolsPanel />,
					},
					TanStackQueryDevtools,
				]}
			/>
		</ClerkProvider>
	);

	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
				<HeadContent />
			</head>

			<body className="font-sans antialiased wrap-anywhere">
				{posthogToken && posthogHost ? (
					<PostHogProvider
						apiKey={posthogToken}
						options={{
							api_host: posthogHost,
							capture_exceptions: true,
							debug: import.meta.env.DEV,
							logs: {
								serviceName: "skild-web",
								environment: import.meta.env.MODE,
							},
						}}
					>
						{app}
					</PostHogProvider>
				) : (
					app
				)}
				<Scripts />
			</body>
		</html>
	);
}
