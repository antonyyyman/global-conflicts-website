import Head from "next/head";
import Image from "next/image";
import ReactDOM from "react-dom";
import Countdown from "react-countdown";
import React, { useEffect, useState } from "react";
import Link from "next/link";

import MyMongo from "../../lib/mongodb";
import { Params } from "next/dist/server/router";
import moment from "moment";

import { serialize } from "next-mdx-remote/serialize";
import { MDXRemote } from "next-mdx-remote";
import SlotSelectionModal from "../../components/modals/slot_selection_modal";
import axios from "axios";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import QuestionMarkCircleIcon from "@heroicons/react/outline/QuestionMarkCircleIcon";
import AboutSignUpModal from "../../components/modals/about_sign_ups_modal";
import NavBarItem from "../../components/navbar_item";
import EventCard from "../../components/event_list_card";

const Completionist = () => (
	<div className="my-10 prose">
		<h3>It has begun!</h3>
	</div>
);

// Renderer callback with condition
const renderer = ({ days, hours, minutes, seconds, completed }) => {
	if (completed) {
		// Render a complete state
		return <Completionist />;
	} else {
		// Render a countdown
		var daysStyle = { "--value": days } as React.CSSProperties;
		var hoursStyle = { "--value": hours } as React.CSSProperties;
		var minutesStyle = { "--value": minutes } as React.CSSProperties;
		var secondsStyle = { "--value": seconds } as React.CSSProperties;
		return (
			<>
				<div className="my-10 prose">
					<h1>Starts in:</h1>
				</div>
				<div className="flex items-center grid-flow-col gap-5 mx-10 text-sm text-center auto-cols-max">
					<div className="flex flex-col">
						<span className="font-mono text-2xl countdown">
							<span style={daysStyle}></span>
						</span>
						days
					</div>
					<div className="flex flex-col">
						<span className="font-mono text-2xl countdown">
							<span style={hoursStyle}></span>
						</span>
						hours
					</div>
					<div className="flex flex-col">
						<span className="font-mono text-2xl countdown">
							<span style={minutesStyle}></span>
						</span>
						min
					</div>
					<div className="flex flex-col">
						<span className="font-mono text-2xl countdown">
							<span style={secondsStyle}></span>
						</span>
						sec
					</div>
				</div>
			</>
		);
	}
};

async function callReserveSlot(
	event,
	onSuccess,
	onError,
	slot?,
	factionTitle?
) {
	axios
		.post("/api/events/reserve", {
			eventSlug: event.slug,
			slot: slot,
			factionTitle: factionTitle,
		})
		.then((response) => {
			console.log(response);
			onSuccess();
		})
		.catch((error) => {
			console.log(error);
			onError();
		});
}

async function callCantMakeIt(event, onSuccess, onError, cantMakeIt) {
	axios
		.post("/api/events/cant_make_it", {
			eventSlug: event.slug,
			cantMakeIt: cantMakeIt,
		})
		.then((response) => {
			console.log(response);
			onSuccess();
		})
		.catch((error) => {
			console.log(error);
			onError();
		});
}

async function callSignUp(event, onSuccess, onError, doSignup) {
	axios
		.post("/api/events/sign_up", {
			eventSlug: event.slug,
			doSignup: doSignup,
		})
		.then((response) => {
			console.log(response);
			onSuccess();
		})
		.catch((error) => {
			console.log(error);
			onError();
		});
}

export default function EventHome({ event }) {
	const [currentContentPage, setCurrentContentPage] = useState(
		event.contentPages[0]
	);

	let [slotsModalOpen, setSlotsModalOpen] = useState(false);
	let [aboutSignUpModalOpen, setAboutSignUpModalOpen] = useState(false);
	const { data: session, status } = useSession();

	let [isSignedUp, setIsSignedUp] = useState(false);
	let [reservedSlotName, setReservedSlotName] = useState(null);
	let [reservedSlotFactionTitle, setReservedSlotFactionTitle] = useState(null);
	let [cantMakeIt, setCantMakeIt] = useState(false);

	useEffect(() => {
		if (session != null) {
			if (session.user["eventsSignedUp"]) {
				for (const eventSingedUp of session.user["eventsSignedUp"]) {
					if (eventSingedUp["eventSlug"] == event.slug) {
						console.log("aaaaaaa");
						setIsSignedUp(true);
						setReservedSlotName(eventSingedUp["reservedSlotName"]);
						setReservedSlotFactionTitle(eventSingedUp["reservedSlotFactionTitle"]);
						break;
					}
				}

				for (const eventCantMakeIt of session.user["cantMakeIt"] ?? []) {
					if (eventCantMakeIt["eventSlug"] == event.slug) {
						setCantMakeIt(true);
						break;
					}
				}
			}
		}
	}, [event, session]);

	return (
		<>
			<Head>
				<title>{event.name}</title>

				<meta property="og:url" content="https://globalconflicts.net/" />
				<meta property="og:type" content="website" />

				<meta property="og:title" content={event.name} />
				<meta property="og:image" content={event.image} />
				<meta name="twitter:card" content={event.description} />
				<meta property="og:description" content={event.description} />
			</Head>

			<div className="flex flex-col max-w-screen-lg px-2 mx-auto mb-10 xl:max-w-screen-xl ">
				{event.completed ? (
					<div className="my-10 prose">
						<h1>Event concluded</h1>
					</div>
				) : (
					<div className="flex flex-row">
						<Countdown date={event.when} renderer={renderer}></Countdown>
					</div>
				)}

				<EventCard event={event} aspectRatio={"16/9"} isViewOnly={true}></EventCard>

				<div className="my-5 ml-auto">
					<Link href="/guides/events#signup-and-slotting-procedure" passHref>
						<a className="btn btn-ghost btn-md" target="_blank">
							How it works{" "}
							<QuestionMarkCircleIcon height={25}></QuestionMarkCircleIcon>
						</a>
					</Link>
				</div>
				{!event.completed &&
					(session?.user["roles"] ? (
						isSignedUp ? (
							reservedSlotName ? (
								<div className="flex flex-1 space-x-2">
									<button
										className="flex-1 flex-grow btn btn-lg btn-primary"
										onClick={() => {
											setSlotsModalOpen(true);
										}}
									>
										<div>
											<div className="text-sm">Slot reserved: {reservedSlotName}</div>
											<div className="text-xs">Click here to change</div>
										</div>
									</button>
									<button
										onClick={async () => {
											await callReserveSlot(
												event,
												() => {
													setReservedSlotName(null);
													toast.success(`Retract from reserved slot`);
												},
												() => {}
											);
										}}
										className="flex-1 btn btn-lg btn-warning"
									>
										Retract from reserved slot
									</button>
								</div>
							) : (
								<div className="flex flex-1 space-x-2">
									<button
										className="flex-1 flex-grow btn btn-lg btn-primary"
										onClick={() => {
											setSlotsModalOpen(true);
										}}
									>
										Reserve Slot (Optional)
									</button>

									<button
										onClick={async () => {
											await callSignUp(
												event,
												() => {
													setIsSignedUp(false);
													toast.success(`You have retracted your sign up`);
												},
												() => {},
												false
											);
										}}
										className="flex-1 btn btn-lg btn-warning"
									>
										Retract sign up
									</button>
								</div>
							)
						) : cantMakeIt ? (
							<div className="flex flex-1 space-x-2">
								<button
									onClick={async () => {
										await callCantMakeIt(
											event,
											() => {
												setReservedSlotName(null);
												setCantMakeIt(false);
												toast.success(`Good! You can make it now!`);
											},
											() => {},
											false
										);
									}}
									className="flex-1 btn btn-lg btn-warning"
								>
									<div>
										<div className="text-sm">You Can&apos;t make it</div>
										<div className="text-sm">Click here to change this</div>
									</div>
								</button>
							</div>
						) : (
							<div className="flex flex-1 space-x-2">
								<button
									className="flex-1 flex-grow btn btn-lg btn-primary"
									onClick={() => {
										callSignUp(
											event,
											() => {
												toast.success(`You have signed up for this event`);
												setIsSignedUp(true);
											},
											() => {},
											true
										);
									}}
								>
									Sign up
								</button>

								<button
									onClick={async () => {
										await callCantMakeIt(
											event,
											() => {
												setReservedSlotName(null);
												setCantMakeIt(true);
												toast.success(`Roger, you can't make it.`);
											},
											() => {},
											true
										);
									}}
									className="flex-1 btn btn-lg btn-warning"
								>
									Can&apos;t make it
								</button>
							</div>
						)
					) : (
						<div className="m-auto my-10 bg-gray-600 cursor-pointer btn btn-lg btn-block no-animation hover:bg-gray-600">
							<h2 className="w-full text-center">
								You must join our Discord to register for events.
							</h2>
						</div>
					))}
			</div>
			<div className="max-w-screen-lg mx-auto xl:max-w-screen-xl">
				<div className="flex flex-row">
					<aside className={"px-4 py-6  relative h-full overflow-y-auto "}>
						<nav>
							{event.contentPages.map((contentPage) => (
								<ul key={contentPage["title"]} className="">
									<NavBarItem
										item={contentPage}
										isSelected={contentPage.title == currentContentPage.title}
										onClick={(child) => {
											setCurrentContentPage(contentPage);
										}}
									></NavBarItem>
								</ul>
							))}
						</nav>
					</aside>
					<main className="flex-grow">
						<div className="prose">
							<h1>Event Details:</h1>
						</div>
						<article className="max-w-3xl prose">
							<kbd className="hidden kbd"></kbd>
							<MDXRemote {...currentContentPage.parsedMarkdownContent} />
						</article>
					</main>
				</div>
			</div>

			<SlotSelectionModal
				isOpen={slotsModalOpen}
				event={event}
				reservedSlotFactionTitle={reservedSlotFactionTitle}
				reservedSlotName={reservedSlotName}
				onReserve={async (slot, factionTitle) => {
					await callReserveSlot(
						event,
						() => {
							setReservedSlotName(slot.name);
							setReservedSlotFactionTitle(factionTitle);
							setSlotsModalOpen(false);
							toast.success(`Slot "${slot.name}" Reserved`);
						},
						() => {},
						slot,
						factionTitle
					);
				}}
				onClose={() => {
					setSlotsModalOpen(false);
				}}
			></SlotSelectionModal>

			<AboutSignUpModal
				isOpen={aboutSignUpModalOpen}
				onClose={() => {
					setAboutSignUpModalOpen(false);
				}}
			></AboutSignUpModal>
		</>
	);
}

export async function getStaticProps({ params }: Params) {
	console.log(params);
	const event = await MyMongo.collection("events").findOne(
		{ slug: params.slug },
		{ projection: { _id: 0 } }
	);

	// const content = await markdownToHtml(post.content || "");
	// const mdxSource = await serialize(post.content);

	async function iterateContentPages(contentPages) {
		await Promise.all(
			contentPages.map(async (contentPage) => {
				if (contentPage.markdownContent) {
					contentPage.parsedMarkdownContent = await serialize(
						contentPage.markdownContent
					);
				}
			})
		);
	}

	await iterateContentPages(event.contentPages);

	return { props: { event: event } };
}

// This function gets called at build time on server-side.
// It may be called again, on a serverless function, if
// the path has not been generated.
export async function getStaticPaths() {
	const events = await MyMongo.collection("events")
		.find(
			{},
			{
				projection: {
					_id: 0,
					name: 1,
					slug: 1,
				},
			}
		)
		.toArray();

	// Get the paths we want to pre-render based on posts
	const paths = events.map((event) => ({
		params: { slug: event.slug },
	}));

	// We'll pre-render only these paths at build time.
	// { fallback: blocking } will server-render pages
	// on-demand if the path doesn't exist.
	return { paths, fallback: false };
}
