import DataTable, { Media } from "react-data-table-component";

import MyMongo from "../../../lib/mongodb";
import moment from "moment";
import NotPresentIcon from "../../../components/icons/not_present";
import PresentIcon from "../../../components/icons/present";
import ValidatedIcon from "../../../components/icons/validated";
import InvalidIcon from "../../../components/icons/invalid";
import DownloadIcon from "../../../components/icons/download";
import fs from "fs";
import React, { useEffect, useState } from "react";
import CommentBox from "../../../components/comments_box";
import ActionsIcon from "../../../components/icons/actions";
import SubmitReviewReportModal from "../../../components/modals/submit_review_report_modal";
import ActionsModal from "../../../components/modals/actions_modal";
import AddIcon from "../../../components/icons/add";
import GameplayHistoryModal from "../../../components/modals/gameplay_history";
import MissionMediaCard from "../../../components/mission_media_card";

import Shimmer from "react-shimmer-effect";
import Head from "next/head";
import Image from "next/image";

import Link from "next/link";

import axios from "axios";
import { getSession, useSession } from "next-auth/react";
import { toast } from "react-toastify";

import rehypeSanitize from "rehype-sanitize";

import remarkParse from "remark-parse";
import { unified } from "unified";
import remarkRehype from "remark-rehype";

import rehypeStringify from "rehype-stringify";
import rehypeFormat from "rehype-format";
import remarkGfm from "remark-gfm";

import { REVIEW_STATE_PENDING } from "../../../lib/reviewStates";
import {
	BanIcon,
	CheckCircleIcon,
	ChevronRightIcon,
	ClockIcon,
	ExclamationCircleIcon,
	QuestionMarkCircleIcon,
} from "@heroicons/react/outline";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import hasCreds from "../../../lib/credsChecker";
import NewVersionModal from "../../../components/modals/new_version_modal";
import useSWR from "swr";
import fetcher from "../../../lib/fetcher";
import { Disclosure, Transition } from "@headlessui/react";

export default function MissionDetails({
	_mission,
	discordUsers,
	hasVoted,
	missionTestingQuestions,
}) {
	let [actionsModalOpen, setActionsModalIsOpen] = useState(false);
	let [newVersionModalOpen, setNewVersionModalOpen] = useState(false);
	let [actionsModalData, setActionsModalData] = useState(null);
	let [isLoadingVote, setIsLoadingVote] = useState(false);
	let [hasVotedLocal, setHasVoted] = useState(hasVoted);
	let [mission, setMission] = useState(_mission);

	let [commentModalOpen, setCommentModalIsOpen] = useState(false);
	let [commentModalData, setCommentModalData] = useState(null);

	let [gameplayHistoryModalData, setgameplayHistoryModalData] = useState(null);
	let [gameplayHistoryModalOpen, setgameplayHistoryModalOpen] = useState(false);

	const [windowSize, setWindowSize] = useState({
		width: undefined,
		height: undefined,
	});
	function handleResize() {
		// Set window width/height to state
		setWindowSize({
			width: window.innerWidth,
			height: window.innerHeight,
		});
	}

	const _windowSize = useWindowSize();
	function useWindowSize() {
		// Initialize state with undefined width/height so server and client renders match
		// Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/

		useEffect(() => {
			// only execute all the code below in client side
			if (typeof window !== "undefined") {
				// Handler to call on window resize

				// Add event listener
				window.addEventListener("resize", handleResize);

				// Call handler right away so state gets updated with initial window size
				handleResize();

				// Remove event listener on cleanup
				return () => window.removeEventListener("resize", handleResize);
			}
		}, []); // Empty array ensures that effect is only run on mount
		return windowSize;
	}
	const { data: session } = useSession();
	function getAuditIcon(reviewState) {
		if (reviewState == null) {
			return (
				<div data-tip="Audit not yet requested" className="tooltip">
					<QuestionMarkCircleIcon className="w-6 h-6"></QuestionMarkCircleIcon>
				</div>
			);
		}
		if (reviewState == "review_pending") {
			return (
				<div data-tip="Pending audit" className="tooltip">
					<ClockIcon color={"#58baff"} className="w-6 h-6"></ClockIcon>
				</div>
			);
		}
		if (reviewState == "review_reproved") {
			return (
				<div data-tip="Rejected" className="tooltip">
					<ExclamationCircleIcon
						color={"#ff2d0b"}
						className="w-6 h-6"
					></ExclamationCircleIcon>
				</div>
			);
		}
		if (reviewState == "review_accepted") {
			return (
				<div data-tip="Accepted" className="tooltip">
					<CheckCircleIcon color={"#2ced4c"} className="w-6 h-6"></CheckCircleIcon>
				</div>
			);
		}
	}

	function omitActions() {
		return !(
			mission.authorID == session?.user["discord_id"] ||
			hasCreds(session, CREDENTIAL.MISSION_REVIEWER)
		);
	}
	function omitDownload() {
		return session != null;
	}

	function canSubmitAAR(leader) {
		return (
			leader.discordID == session?.user["discord_id"] ||
			hasCreds(session, CREDENTIAL.ADMIN)
		);
	}

	const columns = [
		{
			name: "Date",
			selector: (row) => row.date,
			sortable: true,
			hide: Media.MD,
			width: "115px",
		},
		{
			name: "Version",
			selector: (row) => {
				return row.version.major + (row.version.minor ?? "");
			},
			sortable: true,
			width: "88px",
		},
		{
			name: "Author",
			selector: (row) => row.authorName,
			hide: Media.SM,
		},

		{
			name: "Archived",
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				return row.archive ? (
					<div data-tip="Mission archived" className="tooltip">
						<CheckCircleIcon color={"#2ced4c"} className="w-6 h-6 "></CheckCircleIcon>
					</div>
				) : (
					<div data-tip="Mission not archived" className="tooltip">
						<BanIcon className="w-6 h-6 "></BanIcon>
					</div>
				);
			},
			compact: true,
			center: true,
			width: windowSize.width <= 700 ? "50px" : "70px",
		},

		{
			name: "Main",
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				return row.main ? (
					<div data-tip="Present on Main Server" className="tooltip">
						<CheckCircleIcon color={"#2ced4c"} className="w-6 h-6 "></CheckCircleIcon>
					</div>
				) : (
					<div data-tip="Not present" className="tooltip">
						<BanIcon className="w-6 h-6 "></BanIcon>
					</div>
				);
			},
			compact: true,
			center: true,
			width: windowSize.width <= 700 ? "50px" : "70px",
		},

		{
			name: "Test",
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				return row.test ? (
					<div data-tip="Present on the Test Server" className="tooltip">
						<CheckCircleIcon color={"#2ced4c"} className="w-6 h-6 "></CheckCircleIcon>
					</div>
				) : (
					<div data-tip="Not present" className="tooltip">
						<BanIcon className="w-6 h-6 "></BanIcon>
					</div>
				);
			},
			compact: true,
			center: true,
			width: windowSize.width <= 700 ? "50px" : "70px",
		},
		{
			name: "Validated",
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				return getAuditIcon(row.testingAudit?.reviewState);
			},
			compact: true,
			center: true,
			width: windowSize.width <= 700 ? "53px" : "70px",
		},

		{
			minWidth: "0px",
			grow: 1,
			compact: true,
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				return <></>;
			},
		},
		{
			name: "Download",
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				return (
					<button
						onClick={() => {
							setActionsModalIsOpen(true);
							setActionsModalData(row);
						}}
						className="btn btn-sm"
					>
						<DownloadIcon></DownloadIcon>
					</button>
				);
			},
			omit: session == null,
			center: true,
			grow: 1,
			width: "88px",
		},
		{
			name: "Actions",
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				return (
					<button
						onClick={() => {
							setActionsModalIsOpen(true);
							setActionsModalData(row);
						}}
						className="btn btn-sm"
					>
						<ActionsIcon></ActionsIcon>
					</button>
				);
			},
			omit: omitActions(),
			center: true,
			width: "88px",
		},
	];

	function doVote(event) {
		if (!session) {
			toast.error("You must be logged in to vote!");
			return;
		}
		setIsLoadingVote(true);
		axios
			.put(`/api/missions/${mission.uniqueName}/vote`)
			.then((response) => {
				setHasVoted(true);
				toast.success("Vote submited!");
			})
			.catch((error) => {
				if (error.response.data && error.response.data.error) {
					toast.error(error.response.data.error);
				}
			})
			.finally(() => {
				setIsLoadingVote(false);
			});
	}
	function retractVote(event) {
		setIsLoadingVote(true);
		axios
			.delete(`/api/missions/${mission.uniqueName}/vote`)
			.then((response) => {
				setHasVoted(false);
				toast.info("Vote retracted");
			})
			.catch((error) => {
				if (error.response.data && error.response.data.error) {
					toast.error(error.response.data.error);
				}
			})
			.finally(() => {
				setIsLoadingVote(false);
			});
	}

	function getMissionMediaPath(absolute = false) {
		if (mission.mediaFileName) {
			return absolute
				? `https://gc-next-website.vercel.app/missionsCoverMedia/${mission.mediaFileName}`
				: `/missionsCoverMedia/${mission.mediaFileName}`;
		} else {
			return absolute
				? `https://gc-next-website.vercel.app/terrain_pics/${mission.terrain.toLowerCase()}`
				: `/terrain_pics/${mission.terrain.toLowerCase()}.jpg`;
		}
	}

	const { data: history, error } = useSWR(
		`/api/missions/${mission.uniqueName}/history`,
		fetcher
	);
	function getHistory() {
		return history || mission.history;
	}

	return (
		<>
			<Head>
				<title>{mission.name}</title>

				<meta property="og:url" content="https://globalconflicts.net/" />
				<meta property="og:type" content="website" />

				<meta property="og:title" content={mission.name} />
				<meta property="og:image" content={getMissionMediaPath(true)} />
				<meta property="twitter:image" content={getMissionMediaPath(true)} />

				<meta name="twitter:card" content="summary_large_image" />
				<meta property="og:description" content={mission.descriptionNoMarkdown} />

				<meta property="og:site_name" content="Global Conflicts" />
			</Head>
			<div className="flex flex-col max-w-screen-lg mx-auto mt-5 xl:max-w-screen-xl ">
				<div className="mt-10 mb-5">
					<div className="mb-1 font-bold prose">
						<h1>{mission.name}</h1>
					</div>

					<div className="flex flex-row items-center">
						<h2 className="mr-5 text-1xl">
							Author: <span className="font-bold">{mission.missionMaker}</span>
						</h2>
						<div
							data-tip={
								hasVotedLocal ? "Retract vote" : " Vote for this mission to be played"
							}
							className="z-10 tooltip tooltip-bottom tooltip-primary"
						>
							<button
								className={`btn btn-sm btn-primary min-w-187 ${
									isLoadingVote ? "loading" : ""
								}`}
								onClick={hasVotedLocal ? retractVote : doVote}
							>
								{hasVotedLocal ? "Retract vote" : "Vote"}
							</button>
						</div>

						<div
							data-tip="Edit the details of your mission"
							className="z-10 tooltip tooltip-bottom"
						>
							<Link href={`/missions/${mission.uniqueName}/edit`}>
								<a className="ml-5 text-white btn btn-sm">Edit details</a>
							</Link>
						</div>
					</div>
				</div>

				<div className="flex flex-row md:space-x-10">
					<div
						className="flex-1 hidden overflow-hidden rounded-lg shadow-lg md:block"
						style={{ height: "fit-content" }}
					>
						<MissionMediaCard
							createObjectURL={getMissionMediaPath()}
							mission={mission}
							isVideo={false}
						></MissionMediaCard>
					</div>

					<div className="flex-1 ">
						<div className="mde-preview">
							<div className="ml-2 mde-preview-content">
								<div className="max-w-3xl prose">
									{mission.descriptionMarkdown ? (
										<div
											className="max-w-3xl"
											dangerouslySetInnerHTML={{
												__html: mission.descriptionMarkdown,
											}}
										></div>
									) : (
										mission.description
									)}
								</div>
							</div>
						</div>

						<div className="flex flex-row flex-wrap w-full stats">
							<div className="m-2">
								<div className=" stat-title">Players</div>
								<div className="text-sm stat-value ">
									{mission.size.min} to {mission.size.max}
								</div>
							</div>
							<div className="m-2 ">
								<div className="stat-title">Map</div>
								<div className="text-sm stat-value">
									{mission.terrainName ?? mission.terrain}
								</div>
							</div>

							<div className="m-2">
								<div className="stat-title">Type</div>
								<div className="text-sm stat-value ">{mission.type}</div>
							</div>
							<div className="m-2">
								<div className="stat-title">Time of day</div>
								<div className="text-sm stat-value ">{mission.timeOfDay}</div>
							</div>
							<div className="m-2">
								<div className="stat-title">Era</div>
								<div className="text-sm stat-value ">{mission.era}</div>
							</div>
							<div className="m-2">
								<div className="stat-title">Respawn</div>
								<div className="text-sm stat-value">{mission.respawn}</div>
							</div>
							<div className="m-2">
								<div className="stat-title">JIP</div>
								<div className="text-sm stat-value ">{mission.jip}</div>
							</div>
						</div>
					</div>
				</div>
				<div className="mt-4">
					{mission.tags.map((role) => (
						<span
							style={{ color: role.color }}
							className="box-content my-1 mr-1 border-2 select-text btn btn-disabled no-animation btn-sm btn-outline rounded-box"
							key={role}
						>
							{role}
						</span>
					))}
				</div>
				<hr className="my-5"></hr>
				<h2 className="flex flex-row justify-between py-2 font-bold">
					Versions{" "}
					{(mission.authorID == session?.user["discord_id"] ||
						hasCreds(session, CREDENTIAL.MISSION_REVIEWER)) && (
						<button
							onClick={() => {
								setNewVersionModalOpen(true);
							}}
							className="btn btn-sm"
						>
							<AddIcon></AddIcon> Upload new version
						</button>
					)}
				</h2>

				<DataTable
					className="ease-in-out"
					highlightOnHover={true}
					striped={true}
					columns={columns}
					data={mission.updates}
				></DataTable>
				<hr className="my-5"></hr>
				<h2 className="flex flex-row justify-between py-2 font-bold">
					Gameplay History{" "}
					{hasCreds(session, CREDENTIAL.ADMIN) && (
						<button
							onClick={() => {
								setgameplayHistoryModalOpen(true);
								setgameplayHistoryModalData(mission);
							}}
							className="btn btn-sm"
						>
							<AddIcon></AddIcon>
						</button>
					)}
				</h2>
				<div>
					{getHistory() ? (
						getHistory().map((history, index) => {
							return (
								<div key={history._id}>
									<div className="flex flex-row justify-between mb-2 align-baseline">
										<div className="font-bold align-text-bottom">
											<div>{moment(history.date).format("LL")}</div>
											<div>Outcome: {history.outcome}</div>
										</div>
										<div className="flex flex-row items-center space-x-1">
											<button className="btn btn-xs" onClick={() => {}}>
												AAR Replay
											</button>
											<button className="btn btn-xs" onClick={() => {}}>
												GM Notes
											</button>
										</div>
									</div>

									{history.leaders.map((leader) => {
										return (
											<Disclosure key={leader.discordID}>
												{({ open }) => (
													<>
														<Disclosure.Button className="flex flex-row items-center justify-between w-full p-2 mb-2 text-white bg-gray-600 rounded-lg">
															<div className="flex flex-row items-center ">
																{" "}
																{!leader.avatar && (
																	<Shimmer>
																		<div
																			className="avatar mask mask-circle"
																			style={{ width: 50, height: 50 }}
																		/>
																	</Shimmer>
																)}
																{leader.avatar && (
																	<Image
																		className="avatar mask mask-circle"
																		src={leader.avatar}
																		width={50}
																		height={50}
																		alt="user avatar"
																	/>
																)}
																<div className="flex flex-row items-end ml-5 text-2xl">
																	{!leader.avatar && (
																		<Shimmer>
																			<div
																				className="rounded-lg "
																				style={{ width: 90, height: 26 }}
																			/>
																		</Shimmer>
																	)}
																	<div>
																		{leader.name},{" "}
																		<span
																			className={`font-bold text-${leader.side.toLowerCase()}`}
																		>
																			{" "}
																			{leader.side}
																		</span>{" "}
																		Leader AAR:
																	</div>
																</div>
															</div>

															<ChevronRightIcon
																className={`duration-100 ${open ? "transform rotate-90" : ""}`}
																width={35}
																height={35}
																color="white"
															>
																{" "}
															</ChevronRightIcon>
														</Disclosure.Button>

														<Transition
															show={open}
															enter="transition duration-100 ease-out"
															enterFrom="transform scale-95 opacity-0 max-h-0"
															enterTo="transform scale-100 opacity-100 max-h-9000px"
															leave="transition duration-75 ease-out"
															leaveFrom="transform scale-100 opacity-100"
															leaveTo="transform scale-95 opacity-0"
														>
															<Disclosure.Panel static className="mb-3 prose">
																{leader.aar ? (
																	<p>{leader.aar}</p>
																) : (
																	<div className="flex flex-row items-center">
																		<div>No AAR Submited yet.</div>
																		{canSubmitAAR(leader) && (
																			<button className="z-10 ml-2 btn btn-xs " onClick={() => {}}>
																				Click here to submit your AAR
																			</button>
																		)}
																	</div>
																)}
															</Disclosure.Panel>
														</Transition>
													</>
												)}
											</Disclosure>
										);
									})}

									{index + 1 != getHistory().length && <hr className="mt-5 mb-3"></hr>}
								</div>
							);
						})
					) : (
						<div>No History yet</div>
					)}
				</div>
				<hr className="my-5"></hr>
				<div className="flex flex-row justify-between mb-16 space-x-6">
					<CommentBox
						title="Bug Reports"
						btnText="Submit Report"
						onSubmitClick={() => {
							setCommentModalIsOpen(true);
							setCommentModalData({
								title: "Submit Bug Report",
								placeholder: "Enter the description of the bug here",
							});
						}}
						onEditClick={(comment) => {
							setCommentModalIsOpen(true);
							setCommentModalData({
								title: "Edit Bug Report",
								placeholder: "Enter the description of the bug here",
								comment: comment,
							});
						}}
						comments={mission["reports"]}
					></CommentBox>

					<CommentBox
						onSubmitClick={() => {
							setCommentModalIsOpen(true);
							setCommentModalData({
								title: "Submit review",
								placeholder: "Enter your review of this mission here",
							});
						}}
						onEditClick={(comment) => {
							setCommentModalIsOpen(true);
							setCommentModalData({
								title: "Edit review",
								placeholder: "Enter your review of this mission here",
								comment: comment,
							});
						}}
						title="Reviews"
						btnText="Submit Review"
					></CommentBox>
				</div>

				<SubmitReviewReportModal
					isOpen={commentModalOpen}
					data={commentModalData}
					onClose={() => {
						setCommentModalIsOpen(false);
						setTimeout(() => {
							setCommentModalData(null);
						}, 200);
					}}
				></SubmitReviewReportModal>

				<ActionsModal
					isOpen={actionsModalOpen}
					update={actionsModalData}
					questions={missionTestingQuestions}
					mission={mission}
					updateTestingAudit={(testingAudit) => {
						if (testingAudit) {
							let updates: any[] = mission.updates;
							const index = updates.indexOf(actionsModalData);
							updates[index].testingAudit = testingAudit;
							mission.updates = [...updates];
							setActionsModalData(updates[index]);
						}
						setActionsModalIsOpen(true);
					}}
					updateCopyMission={(destination, present) => {
						setActionsModalIsOpen(false);
						let updates: any[] = mission.updates;
						const index = updates.indexOf(actionsModalData);
						updates[index][destination] = present;

						mission.updates = [...updates];
						setActionsModalData(updates[index]);
					}}
					updateAskAudit={() => {
						setActionsModalIsOpen(false);
						let updates: any[] = mission.updates;
						const index = updates.indexOf(actionsModalData);
						updates[index].testingAudit = {
							reviewState: REVIEW_STATE_PENDING,
						};

						mission.updates = [...updates];
						setActionsModalData(updates[index]);
					}}
					onAuditOpen={() => {}}
					onClose={() => {
						setActionsModalIsOpen(false);
					}}
				></ActionsModal>

				<NewVersionModal
					isOpen={newVersionModalOpen}
					mission={mission}
					onClose={(update) => {
						if (!update) {
							setNewVersionModalOpen(false);
							return;
						}
						let updates: any[] = mission.updates;
						update.authorName = session.user["nickname"] ?? session.user["username"];
						update.archive = true;
						updates.push(update);
						mission.updates = [...updates];
						setNewVersionModalOpen(false);
					}}
				></NewVersionModal>

				<GameplayHistoryModal
					discordUsers={discordUsers}
					mission={mission}
					isOpen={gameplayHistoryModalOpen}
					onClose={() => {
						setgameplayHistoryModalOpen(false);
					}}
				></GameplayHistoryModal>
			</div>
		</>
	);
}

// This function gets called at build time on server-side.
// It may be called again, on a serverless function, if
// revalidation is enabled and a new request comes in

export async function getServerSideProps(context) {
	const mission = (
		await MyMongo.collection("missions")
			.aggregate([
				{
					$match: { uniqueName: context.params.uniqueName },
				},

				{
					$unwind: {
						path: "$updates",
						preserveNullAndEmptyArrays: true,
					},
				},
				{
					$lookup: {
						from: "users",
						localField: "updates.authorID",
						foreignField: "discord_id",
						as: "author",
					},
				},
				{
					$addFields: {
						"updates.author": {
							$cond: [
								{
									$ne: ["$author", []],
								},
								{
									$arrayElemAt: ["$author", 0],
								},
								"$updates.author",
							],
						},
					},
				},
				{
					$group: {
						_id: "$_id",
						data: {
							$first: "$$ROOT",
						},
						updates: {
							$push: "$updates",
						},
					},
				},
				{
					$addFields: {
						"data.updates": "$updates",
					},
				},
				{
					$project: {
						"data.author": 0,
					},
				},
				{
					$replaceRoot: {
						newRoot: "$data",
					},
				},
				{
					$lookup: {
						from: "users",
						localField: "authorID",
						foreignField: "discord_id",
						as: "missionMaker",
					},
				},
				{
					$project: {
						"updates.author._id": 0,
						"updates.author.image": 0,
						"updates.author.roles": 0,
						"updates.author.email": 0,
						"updates.author.discord_id": 0,
						"updates.author.emailVerified": 0,
					},
				},
			])
			.toArray()
	)[0];

	mission["uploadDate"] = mission["uploadDate"]?.getTime();
	mission["lastPlayed"] = mission["lastPlayed"]?.getTime();

	mission["missionMaker"] =
		mission["missionMaker"][0]?.nickname ??
		mission["missionMaker"][0]?.username ??
		"Unknown";

	if (mission["reports"]) {
		await Promise.all(
			mission["reports"].map(async (report): Promise<any> => {
				var user = await MyMongo.collection("users").findOne(
					{ discord_id: report["authorID"] },
					{ projection: { username: 1, nickname: 1, image: 1 } }
				);

				report["_id"] = report["_id"].toString();
				report["authorName"] = user?.nickname ?? user?.username ?? "Unknown";
				report["authorAvatar"] = user?.image;
			})
		);
	}

	if (mission["reviews"]) {
		await Promise.all(
			mission["reviews"].map(async (review): Promise<any> => {
				var user = await MyMongo.collection("users").findOne(
					{ _id: review["_id"] },
					{ projection: { username: 1, nickname: 1, image: 1 } }
				);

				review["_id"] = review["_id"].toString();
				review["authorName"] = user?.nickname ?? user?.username ?? "Unknown";
				review["authorAvatar"] = user?.image;
			})
		);
	}

	if (mission["history"]) {
		await Promise.all(
			mission["history"]?.map(async (history) => {
				history["_id"] = history["_id"].toString();

				await Promise.all(
					history["leaders"]?.map(async (leader) => {
						var user = await MyMongo.collection("users").findOne(
							{ discord_id: leader["discordID"] },
							{ projection: { username: 1, nickname: 1 } }
						);
						if (user) {
							leader["name"] = user?.nickname ?? user?.username ?? "Unknown";
							leader["discordID"] = leader["discordID"].toString();
						}
						leader["aar"] = leader["aar"];
					})
				);
			})
		);
	}

	mission["updates"]?.map((update) => {
		update.main = fs.existsSync(
			`${process.env.ROOT_FOLDER}/${process.env.MAIN_SERVER_MPMissions}/${update.filename}`
		);

		update.test = fs.existsSync(
			`${process.env.ROOT_FOLDER}/${process.env.TEST_SERVER_MPMissions}/${update.filename}`
		);

		update.archive = fs.existsSync(
			`${process.env.ROOT_FOLDER}/${process.env.ARCHIVE_FOLDER}/${update.filename}`
		);
		update["_id"] = update["_id"].toString();
		update["date"] = moment(update["date"]).format("ll");
		update["authorName"] =
			update["author"]?.nickname ?? update["author"]?.username ?? "Unknown";
		delete update["author"];
	});

	mission["_id"] = mission["_id"].toString();
	mission["_id"] = mission["_id"].toString();

	try {
		const thing = await unified()
			.use(remarkParse)
			.use(remarkGfm)
			.use(remarkRehype)
			.use(rehypeFormat)
			.use(rehypeStringify)
			.use(rehypeSanitize)

			.process(mission["description"]);

		mission["descriptionMarkdown"] = thing.value.toString();
	} catch (error) {}

	const session = await getSession(context);

	const isMissionReviewer = hasCreds(session, CREDENTIAL.MISSION_REVIEWER);
	let missionTestingQuestions = null;
	if (isMissionReviewer) {
		const configs = await MyMongo.collection("configs").findOne(
			{},
			{ projection: { mission_review_questions: 1 } }
		);
		missionTestingQuestions = configs["mission_review_questions"];
	}

	let discordUsers = [];
	if (hasCreds(session, CREDENTIAL.ADMIN)) {
		const botResponse = await axios.get(`http://localhost:3001/users`);
		discordUsers = botResponse.data;
	}

	return {
		props: {
			_mission: mission,
			discordUsers: discordUsers,
			hasVoted: session
				? mission.votes?.includes(session?.user["discord_id"])
				: false,
			missionTestingQuestions,
		},
	};
}

// // This function gets called at build time on server-side.
// // It may be called again, on a serverless function, if
// // the path has not been generated.
// export async function getStaticPaths() {
// 	const missions = await MyMongo.collection("missions")
// 		.find(
// 			{},
// 			{
// 				projection: {
// 					_id: 0,
// 					uniqueName: 1,
// 				},
// 			}
// 		)
// 		.toArray();

// 	// Get the paths we want to pre-render based on posts
// 	const paths = missions.map((mission) => ({
// 		params: { uniqueName: mission.uniqueName },
// 	}));

// 	// We'll pre-render only these paths at build time.
// 	// { fallback: blocking } will server-render pages
// 	// on-demand if the path doesn't exist.
// 	return { paths, fallback: "blocking" };
// }