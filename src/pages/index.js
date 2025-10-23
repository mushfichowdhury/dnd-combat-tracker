import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import styles from "@/styles/Home.module.css";

const generateId = () => {
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const emptyPartyForm = { name: "", initiative: "" };
const emptyEnemyForm = {
	name: "",
	armorClass: "",
	hitPoints: "",
	initiative: "",
	notes: "",
};

const formatClassSummary = (classes = []) => {
	if (!Array.isArray(classes) || classes.length === 0) {
		return "";
	}

	const parts = classes
		.filter((entry) => entry && entry.name)
		.map((entry) => {
			if (entry.level) {
				return `${entry.name} ${entry.level}`;
			}
			return entry.name;
		});

	return parts.join(" / ");
};

const parseInitiativeValue = (value) => {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
	}

	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) {
			return Number.NEGATIVE_INFINITY;
		}

		const parsed = Number(trimmed);
		return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
	}

	return Number.NEGATIVE_INFINITY;
};

const formatInitiativeDisplay = (value) => {
        if (typeof value === "number" && Number.isFinite(value)) {
                return value;
        }

        if (typeof value === "string" && value.trim() !== "") {
                return value.trim();
        }

        return "--";
};

const formatMonsterArmorClass = (armorClass) => {
        if (Array.isArray(armorClass)) {
                const parts = armorClass
                        .map((entry) => {
                                if (!entry) {
                                        return null;
                                }

                                if (typeof entry === "number") {
                                        return entry;
                                }

                                if (typeof entry === "object") {
                                        const value = entry.value ?? entry.amount ?? entry.ac;
                                        const type = entry.type ?? entry.notes;

                                        if (value && type) {
                                                return `${value} (${type})`;
                                        }

                                        if (value) {
                                                return value;
                                        }
                                }

                                return null;
                        })
                        .filter(Boolean);

                return parts.join(", ");
        }

        if (
                typeof armorClass === "number" ||
                (typeof armorClass === "string" && armorClass.trim() !== "")
        ) {
                return armorClass;
        }

        return "";
};

const formatMonsterActions = (actions) => {
        if (!Array.isArray(actions)) {
                return "";
        }

        const formatted = actions
                .map((action) => {
                        if (!action) {
                                return "";
                        }

                        const name = typeof action.name === "string" ? action.name.trim() : "";
                        const description =
                                typeof action.desc === "string" ? action.desc.trim() : "";

                        if (name && description) {
                                return `${name}: ${description}`;
                        }

                        return name || description;
                })
                .filter(Boolean);

        return formatted.join("\n\n");
};

const mapMonsterToEnemyForm = (monster, previousForm = emptyEnemyForm) => {
        if (!monster || typeof monster !== "object") {
                return previousForm;
        }

        const formattedArmorClass = formatMonsterArmorClass(monster.armor_class);
        const formattedActions = formatMonsterActions(monster.actions);

        return {
                ...previousForm,
                name: monster.name ?? previousForm.name ?? "",
                armorClass:
                        formattedArmorClass !== ""
                                ? String(formattedArmorClass)
                                : previousForm.armorClass ?? "",
                hitPoints:
                        monster.hit_points !== undefined && monster.hit_points !== null
                                ? String(monster.hit_points)
                                : previousForm.hitPoints ?? "",
                notes: formattedActions || previousForm.notes || "",
        };
};

export default function Home() {
        const [partyMembers, setPartyMembers] = useState([]);
        const [enemies, setEnemies] = useState([]);
        const [partyForm, setPartyForm] = useState(emptyPartyForm);
        const [enemyForm, setEnemyForm] = useState(emptyEnemyForm);
        const [monsterSearch, setMonsterSearch] = useState("");
        const [monsterResults, setMonsterResults] = useState([]);
        const [isSearchingMonsters, setIsSearchingMonsters] = useState(false);
        const [monsterSearchError, setMonsterSearchError] = useState("");
	const [activeCombatantId, setActiveCombatantId] = useState(null);
	const [dndBeyondIdentifier, setDndBeyondIdentifier] = useState("");
	const [isImportingDndBeyond, setIsImportingDndBeyond] = useState(false);
	const [dndBeyondError, setDndBeyondError] = useState("");
        const [dndBeyondNotice, setDndBeyondNotice] = useState("");
        const [isRefreshingDndBeyondHp, setIsRefreshingDndBeyondHp] = useState(false);
        const [dndBeyondRefreshError, setDndBeyondRefreshError] = useState("");

        useEffect(() => {
                const searchTerm = monsterSearch.trim();

                if (searchTerm.length < 2) {
                        setMonsterResults([]);
                        setMonsterSearchError("");
                        setIsSearchingMonsters(false);
                        return;
                }

                let isActive = true;
                setIsSearchingMonsters(true);
                setMonsterSearchError("");

                const timeoutId = setTimeout(async () => {
                        try {
                                const response = await fetch(
                                        `/api/monsters?query=${encodeURIComponent(searchTerm)}`
                                );

                                if (!isActive) {
                                        return;
                                }

                                if (!response.ok) {
                                        let errorMessage = "Failed to search for monsters.";
                                        try {
                                                const errorData = await response.json();
                                                if (errorData?.error) {
                                                        errorMessage = errorData.error;
                                                }
                                        } catch (error) {
                                                console.error(error);
                                        }

                                        throw new Error(errorMessage);
                                }

                                const data = await response.json();

                                if (!isActive) {
                                        return;
                                }

                                const monsters = Array.isArray(data?.monsters)
                                        ? data.monsters
                                        : [];
                                setMonsterResults(monsters);
                                setMonsterSearchError("");
                        } catch (error) {
                                if (!isActive) {
                                        return;
                                }

                                console.error(error);
                                setMonsterResults([]);
                                setMonsterSearchError(
                                        error instanceof Error && error.message
                                                ? error.message
                                                : "Failed to search for monsters."
                                );
                        } finally {
                                if (isActive) {
                                        setIsSearchingMonsters(false);
                                }
                        }
                }, 300);

                return () => {
                        isActive = false;
                        clearTimeout(timeoutId);
                };
        }, [monsterSearch]);

        const handleMonsterSelect = (monster) => {
                setEnemyForm((prev) => mapMonsterToEnemyForm(monster, prev));
                setMonsterSearch("");
                setMonsterResults([]);
                setMonsterSearchError("");
                setIsSearchingMonsters(false);
        };

        const createPartyMemberFromDndBeyond = (data) => {
                if (!data || !data.name) {
                        return null;
                }

		const initiativeNumber = Number(data.initiative);
		const levelNumber = Number(data.level);
		const classSummary = formatClassSummary(data.classes);

		return {
			id: generateId(),
			name: data.name,
			initiative: null,
			source: "dndbeyond",
			classSummary: classSummary || undefined,
			level:
				Number.isFinite(levelNumber) && levelNumber > 0
					? levelNumber
					: undefined,
			playerName: data.playerName || undefined,
			ddbCharacterId: data.id || undefined,
			abilityScores: Array.isArray(data.abilityScores)
				? data.abilityScores
				: undefined,
			hitPoints: data.hitPoints || undefined,
			calculatedInitiative: Number.isFinite(initiativeNumber)
				? initiativeNumber
				: undefined,
		};
	};

	const handlePartySubmit = (event) => {
		event.preventDefault();
		if (!partyForm.name.trim()) return;

		setPartyMembers((prev) => [
			...prev,
			{
				id: generateId(),
				name: partyForm.name.trim(),
				initiative: Number(partyForm.initiative) || 0,
			},
		]);
		setPartyForm(emptyPartyForm);
	};

	const handleDndBeyondImport = async (event) => {
		event.preventDefault();
		const identifier = dndBeyondIdentifier.trim();
		if (!identifier) {
			return;
		}

		setDndBeyondError("");
		setDndBeyondNotice("");
		setDndBeyondRefreshError("");
		setIsImportingDndBeyond(true);

		try {
			const response = await fetch("/api/import-dndbeyond", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ identifier }),
			});

			let data = null;
			try {
				data = await response.json();
			} catch (parseError) {
				data = null;
			}

			if (!response.ok) {
				const message =
					data && data.error
						? data.error
						: "Failed to import character from D&D Beyond.";
				throw new Error(message);
			}

			if (!data || !data.name) {
				throw new Error("The character response was missing a name.");
			}

			if (
				data.id &&
				partyMembers.some((member) => member.ddbCharacterId === data.id)
			) {
				setDndBeyondError("That character is already in your party.");
				return;
			}

			const newMember = createPartyMemberFromDndBeyond(data);
			if (!newMember) {
				throw new Error("The character response was missing required data.");
			}

			setPartyMembers((prev) => [...prev, newMember]);

			setDndBeyondIdentifier("");
			setDndBeyondNotice(`Imported ${data.name} from D&D Beyond.`);
		} catch (error) {
			console.error(error);
			setDndBeyondError(
				error instanceof Error && error.message
					? error.message
					: "Failed to import character from D&D Beyond."
			);
		} finally {
			setIsImportingDndBeyond(false);
		}
	};

	const handleDndBeyondCampaignImport = async (event) => {
		event.preventDefault();
		const identifier = dndBeyondIdentifier.trim();
		if (!identifier) {
			return;
		}

		setDndBeyondError("");
		setDndBeyondNotice("");
		setDndBeyondRefreshError("");
		setIsImportingDndBeyond(true);

		try {
			const response = await fetch("/api/import-dndbeyond-campaign", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ identifier }),
			});

			let data = null;
			try {
				data = await response.json();
			} catch (parseError) {
				data = null;
			}

			if (!response.ok) {
				const message =
					data && data.error
						? data.error
						: "Failed to import campaign from D&D Beyond.";
				throw new Error(message);
			}

			if (!data || !Array.isArray(data.characters)) {
				throw new Error("The campaign response was missing character data.");
			}

			const existingIds = new Set(
				partyMembers
					.filter((member) => member.ddbCharacterId)
					.map((member) => member.ddbCharacterId)
			);

			const newMembers = [];
			const skipped = [];

			for (const character of data.characters) {
				if (character?.id && existingIds.has(character.id)) {
					skipped.push(character.name || character.id);
					continue;
				}

				const newMember = createPartyMemberFromDndBeyond(character);
				if (newMember) {
					newMembers.push(newMember);
					if (character?.id) {
						existingIds.add(character.id);
					}
				}
			}

			if (newMembers.length > 0) {
				setPartyMembers((prev) => [...prev, ...newMembers]);
				setDndBeyondIdentifier("");
			}

			if (newMembers.length === 0) {
				if (skipped.length > 0) {
					setDndBeyondError(
						`All characters in that campaign are already in your party: ${skipped.join(
							", "
						)}.`
					);
				} else {
					setDndBeyondError(
						"No characters were available to import from that campaign."
					);
				}
				setDndBeyondNotice("");
				return;
			}

			const noticeParts = [];
			const campaignName =
				typeof data.campaignName === "string" && data.campaignName.trim()
					? data.campaignName.trim()
					: "";

			noticeParts.push(
				campaignName
					? `Imported ${newMembers.length} ${
							newMembers.length === 1 ? "character" : "characters"
					  } from ${campaignName}.`
					: `Imported ${newMembers.length} ${
							newMembers.length === 1 ? "character" : "characters"
					  } from D&D Beyond.`
			);

			if (skipped.length > 0) {
				noticeParts.push(`Skipped already in party: ${skipped.join(", ")}.`);
			}

			setDndBeyondNotice(noticeParts.join(" "));
			setDndBeyondError("");
		} catch (error) {
			console.error(error);
			setDndBeyondError(
				error instanceof Error && error.message
					? error.message
					: "Failed to import campaign from D&D Beyond."
			);
			setDndBeyondNotice("");
		} finally {
			setIsImportingDndBeyond(false);
		}
	};

	const handleEnemySubmit = (event) => {
		event.preventDefault();
		if (!enemyForm.name.trim()) return;

		setEnemies((prev) => [
			...prev,
			{
				id: generateId(),
				name: enemyForm.name.trim(),
				armorClass: enemyForm.armorClass.trim(),
				hitPoints: enemyForm.hitPoints.trim(),
				initiative: Number(enemyForm.initiative) || 0,
				notes: enemyForm.notes.trim(),
			},
		]);
		setEnemyForm(emptyEnemyForm);
	};

	const removePartyMember = (id) => {
		setPartyMembers((prev) => prev.filter((member) => member.id !== id));
	};

	const removeEnemy = (id) => {
		setEnemies((prev) => prev.filter((enemy) => enemy.id !== id));
	};

	const handleImportedInitiativeChange = (id, value) => {
		setPartyMembers((prev) =>
			prev.map((member) => {
				if (member.id !== id) {
					return member;
				}

				if (value === "") {
					return {
						...member,
						initiative: null,
					};
				}

				const numericValue = Number(value);

				if (!Number.isFinite(numericValue)) {
					return member;
				}

				return {
					...member,
					initiative: numericValue,
				};
			})
		);
	};

	const refreshDndBeyondHitPoints = async () => {
		const dndBeyondMembers = partyMembers.filter(
			(member) => member.source === "dndbeyond" && member.ddbCharacterId
		);

		if (dndBeyondMembers.length === 0) {
			return;
		}

		setDndBeyondRefreshError("");
		setIsRefreshingDndBeyondHp(true);

		try {
			const updates = [];

			for (const member of dndBeyondMembers) {
				const response = await fetch("/api/import-dndbeyond", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ identifier: member.ddbCharacterId }),
				});

				let data = null;
				try {
					data = await response.json();
				} catch (parseError) {
					data = null;
				}

				if (!response.ok || !data) {
					const message = data?.error
						? `${member.name}: ${data.error}`
						: `Failed to refresh hit points for ${member.name}.`;
					throw new Error(message);
				}

				updates.push({ memberId: member.id, data });
			}

			setPartyMembers((prev) =>
				prev.map((member) => {
					const update = updates.find((entry) => entry.memberId === member.id);
					if (!update) {
						return member;
					}

					const { data } = update;
					const updatedInitiative = Number(data.initiative);
					const updatedClassSummary = formatClassSummary(data.classes);
					const updatedLevel = Number(data.level);

					return {
						...member,
						abilityScores: Array.isArray(data.abilityScores)
							? data.abilityScores
							: member.abilityScores,
						hitPoints: data.hitPoints || member.hitPoints,
						classSummary: updatedClassSummary || member.classSummary,
						level:
							Number.isFinite(updatedLevel) && updatedLevel > 0
								? updatedLevel
								: member.level,
						playerName: data.playerName || member.playerName,
						calculatedInitiative: Number.isFinite(updatedInitiative)
							? updatedInitiative
							: member.calculatedInitiative,
					};
				})
			);
		} catch (error) {
			console.error(error);
			setDndBeyondRefreshError(
				error instanceof Error && error.message
					? error.message
					: "Failed to refresh hit points from D&D Beyond."
			);
		} finally {
			setIsRefreshingDndBeyondHp(false);
		}
	};

	const combatOrder = useMemo(() => {
		const partyCombatants = partyMembers.map((member) => ({
			...member,
			type: "party",
		}));
		const enemyCombatants = enemies.map((enemy) => ({
			...enemy,
			type: "enemy",
		}));

		return [...partyCombatants, ...enemyCombatants].sort((a, b) => {
			const initiativeA = parseInitiativeValue(a.initiative);
			const initiativeB = parseInitiativeValue(b.initiative);

			if (initiativeB === initiativeA) {
				return a.name.localeCompare(b.name);
			}

			return initiativeB - initiativeA;
		});
	}, [partyMembers, enemies]);

	const advanceTurn = () => {
		if (combatOrder.length === 0) return;
		const currentIndex = combatOrder.findIndex(
			(combatant) => combatant.id === activeCombatantId
		);
		if (currentIndex === -1) {
			setActiveCombatantId(combatOrder[0].id);
			return;
		}
		const nextIndex = (currentIndex + 1) % combatOrder.length;
		setActiveCombatantId(combatOrder[nextIndex].id);
	};

	const resetTurn = () => {
		if (combatOrder.length === 0) {
			setActiveCombatantId(null);
			return;
		}
		setActiveCombatantId(combatOrder[0].id);
	};

	const currentTurnIndex = useMemo(() => {
		if (combatOrder.length === 0) return -1;
		if (!activeCombatantId) return -1;
		return combatOrder.findIndex(
			(combatant) => combatant.id === activeCombatantId
		);
	}, [combatOrder, activeCombatantId]);

	const highlightedIndex = useMemo(() => {
		if (combatOrder.length === 0) return -1;
		return currentTurnIndex === -1 ? 0 : currentTurnIndex;
	}, [combatOrder, currentTurnIndex]);

	const hasDndBeyondMembers = useMemo(
		() => partyMembers.some((member) => member.source === "dndbeyond"),
		[partyMembers]
	);

        const monsterSearchTerm = monsterSearch.trim();
        const shouldShowMonsterDropdown =
                monsterSearchTerm.length >= 2 || isSearchingMonsters || Boolean(monsterSearchError);

        return (
                <>
                        <Head>
                                <title>D&D Combat Tracker</title>
				<meta
					name='description'
					content='Track party members, enemies, and turn order for your D&D combat encounters.'
				/>
			</Head>
			<div className={styles.page}>
				<main className={styles.main}>
					<header className={styles.header}>
						<h1>Dungeons &amp; Dragons Combat Tracker</h1>
						<p>
							Keep your battles organized by capturing party initiatives, enemy
							statblocks, and cycling through turn order.
						</p>
					</header>

					<section className={styles.section}>
						<h2>Combat Order</h2>
						<p className={styles.sectionDescription}>
							Automatically sorted by initiative. Advance turns as combat
							progresses.
						</p>
						<div className={styles.combatControls}>
							<button
								type='button'
								className={styles.primaryButton}
								onClick={advanceTurn}
								disabled={combatOrder.length === 0}>
								Next Turn
							</button>
							<button
								type='button'
								className={styles.secondaryButton}
								onClick={resetTurn}
								disabled={combatOrder.length === 0}>
								Reset to Top
							</button>
							<button
								type='button'
								className={styles.secondaryButton}
								onClick={refreshDndBeyondHitPoints}
								disabled={
									isRefreshingDndBeyondHp ||
									!hasDndBeyondMembers ||
									combatOrder.length === 0
								}>
								{isRefreshingDndBeyondHp ? "Refreshing HP..." : "Refresh HP"}
							</button>
						</div>
						{dndBeyondRefreshError && (
							<p className={styles.errorMessage}>{dndBeyondRefreshError}</p>
						)}
						{combatOrder.length === 0 ? (
							<p className={styles.emptyState}>
								Add party members and enemies to build the initiative order.
							</p>
						) : (
							<ol className={styles.combatList}>
								{combatOrder.map((combatant, index) => {
									const showHitPoints =
										combatant.type === "party" && combatant.hitPoints;
									const currentHitPoints = showHitPoints
										? Number(combatant.hitPoints.current)
										: null;
									const isLowHitPoints =
										Number.isFinite(currentHitPoints) && currentHitPoints <= 5;

									return (
										<li
											key={combatant.id}
											className={`${styles.combatant} ${
												index === highlightedIndex ? styles.activeCombatant : ""
											}`}>
											<div className={styles.combatantContent}>
												<div className={styles.combatantInfo}>
													<h3>
														{combatant.name}
														<span className={styles.tag}>
															{combatant.type === "party" ? "Party" : "Enemy"}
														</span>
													</h3>
													<p className={styles.statLine}>
														Initiative:{" "}
														<strong>
															{formatInitiativeDisplay(combatant.initiative)}
														</strong>
													</p>
												</div>
												{showHitPoints && (
													<div className={styles.combatantVitals}>
														<div className={styles.currentHp}>
															<span className={styles.currentHpLabel}>HP</span>
															<span
																className={`${styles.currentHpValue} ${
																	isLowHitPoints ? styles.lowHp : ""
																}`}>
																{combatant.hitPoints.current}
															</span>
															{typeof combatant.hitPoints.max === "number" &&
															Number.isFinite(combatant.hitPoints.max) &&
															combatant.hitPoints.max > 0 ? (
																<span className={styles.currentHpMax}>
																	/ {combatant.hitPoints.max}
																</span>
															) : null}
														</div>
														{combatant.hitPoints.temporary ? (
															<span className={styles.tempHpNote}>
																{`(+${combatant.hitPoints.temporary} temp)`}
															</span>
														) : null}
													</div>
												)}
											</div>
											{combatant.type === "enemy" && (
												<div className={styles.combatantDetails}>
													{combatant.armorClass && (
														<span>AC {combatant.armorClass}</span>
													)}
													{combatant.hitPoints && (
														<span>HP {combatant.hitPoints}</span>
													)}
													{combatant.notes && <span>{combatant.notes}</span>}
												</div>
											)}
										</li>
									);
								})}
							</ol>
						)}
					</section>

					<div className={styles.sectionColumns}>
						<section className={styles.section}>
							<h2>Party Members</h2>
							<p className={styles.sectionDescription}>
								Add each adventurer and their initiative roll.
							</p>
							<form onSubmit={handlePartySubmit} className={styles.form}>
								<div className={styles.formGrid}>
									<label className={styles.inputGroup}>
										<span>Character Name</span>
										<input
											type='text'
											value={partyForm.name}
											onChange={(event) =>
												setPartyForm((prev) => ({
													...prev,
													name: event.target.value,
												}))
											}
											placeholder='e.g. Lyra the Swift'
											required
										/>
									</label>
									<label className={styles.inputGroup}>
										<span>Initiative</span>
										<input
											type='number'
											value={partyForm.initiative}
											onChange={(event) =>
												setPartyForm((prev) => ({
													...prev,
													initiative: event.target.value,
												}))
											}
											placeholder='e.g. 17'
										/>
									</label>
								</div>
								<button type='submit' className={styles.primaryButton}>
									Add Party Member
								</button>
							</form>
							<div className={styles.importBox}>
								<h3>Import from D&amp;D Beyond</h3>
								<p className={styles.helperText}>
									Paste a shareable character link or ID or a campaign link to
									import their stats and current hit points. Enter initiative
									manually after importing.
								</p>
								<form
									onSubmit={handleDndBeyondImport}
									className={styles.importForm}>
									<label className={styles.inputGroup}>
										<input
											type='text'
											value={dndBeyondIdentifier}
											onChange={(event) =>
												setDndBeyondIdentifier(event.target.value)
											}
											placeholder='https://www.dndbeyond.com/characters/12345678'
										/>
									</label>
									{dndBeyondNotice && (
										<p className={styles.infoMessage}>{dndBeyondNotice}</p>
									)}
									{dndBeyondError && (
										<p className={styles.errorMessage}>{dndBeyondError}</p>
									)}
									<div className={styles.importActions}>
										<button
											type='submit'
											className={styles.secondaryButton}
											disabled={
												isImportingDndBeyond || !dndBeyondIdentifier.trim()
											}>
											{isImportingDndBeyond
												? "Importing..."
												: "Import Character"}
										</button>
										<button
											type='button'
											className={styles.secondaryButton}
											onClick={handleDndBeyondCampaignImport}
											disabled={
												isImportingDndBeyond || !dndBeyondIdentifier.trim()
											}>
											{isImportingDndBeyond
												? "Importing..."
												: "Import Campaign"}
										</button>
									</div>
								</form>
							</div>
							{partyMembers.length > 0 && (
								<ul className={styles.cardList}>
									{partyMembers.map((member) => (
										<li key={member.id} className={styles.card}>
											<div>
												<h3>{member.name}</h3>
												{member.source === "dndbeyond" && (
													<span className={styles.sourceTag}>
														Imported from D&amp;D Beyond
													</span>
												)}
												{member.classSummary && (
													<p className={styles.statLine}>
														Class: <strong>{member.classSummary}</strong>
													</p>
												)}
												{typeof member.level === "number" &&
													member.level > 0 && (
														<p className={styles.statLine}>
															Level: <strong>{member.level}</strong>
														</p>
													)}
												{member.playerName && (
													<p className={styles.statLine}>
														Player: <strong>{member.playerName}</strong>
													</p>
												)}
												{member.source === "dndbeyond" ? (
													<label
														className={`${styles.inputGroup} ${styles.initiativeEditor}`}>
														<span>Initiative</span>
														<input
															type='number'
															className={styles.initiativeInput}
															value={member.initiative ?? ""}
															onChange={(event) =>
																handleImportedInitiativeChange(
																	member.id,
																	event.target.value
																)
															}
															placeholder='Enter initiative'
														/>
													</label>
												) : (
													<p className={styles.statLine}>
														Initiative:{" "}
														<strong>
															{formatInitiativeDisplay(member.initiative)}
														</strong>
													</p>
												)}
												{member.source === "dndbeyond" && (
													<details className={styles.statsDropdown}>
														<summary className={styles.dropdownSummary}>
															View Stats
														</summary>
														<div className={styles.statsContent}>
															{Array.isArray(member.abilityScores) &&
																member.abilityScores.length > 0 && (
																	<div>
																		<h4 className={styles.statsHeading}>
																			Ability Scores
																		</h4>
																		<ul className={styles.abilityGrid}>
																			{member.abilityScores.map((ability) => (
																				<li
																					key={ability.id}
																					className={styles.abilityCell}>
																					<div
																						className={styles.abilityNameGroup}>
																						<span
																							className={styles.abilityName}>
																							{ability.name || "Ability"}
																						</span>
																					</div>
																					<div
																						className={
																							styles.abilityScoreGroup
																						}>
																						<span
																							className={styles.abilityScore}>
																							{Number.isFinite(ability.total)
																								? ability.total
																								: Number.isFinite(ability.score)
																								? ability.score
																								: "--"}
																						</span>
																					</div>
																				</li>
																			))}
																		</ul>
																	</div>
																)}
														</div>
													</details>
												)}
											</div>
											<button
												type='button'
												className={styles.removeButton}
												onClick={() => removePartyMember(member.id)}>
												Remove
											</button>
										</li>
									))}
								</ul>
							)}
						</section>

						<section className={styles.section}>
							<h2>Enemies</h2>
							<p className={styles.sectionDescription}>
								Capture statblocks, attacks, and initiatives for the creatures
								your party faces.
							</p>
                                                        <form onSubmit={handleEnemySubmit} className={styles.form}>
                                                                <div className={styles.monsterSearchContainer}>
                                                                        <label className={styles.inputGroup}>
                                                                                <span>Search Monsters</span>
                                                                                <input
                                                                                        type='text'
                                                                                        value={monsterSearch}
                                                                                        onChange={(event) =>
                                                                                                setMonsterSearch(
                                                                                                        event.target.value
                                                                                                )
                                                                                        }
                                                                                        placeholder='Start typing to search Open5e monsters...'
                                                                                        autoComplete='off'
                                                                                />
                                                                        </label>
                                                                        {shouldShowMonsterDropdown && (
                                                                                <div className={styles.monsterSearchDropdown}>
                                                                                        {isSearchingMonsters && (
                                                                                                <p className={styles.monsterSearchMessage}>
                                                                                                        Searching monsters...
                                                                                                </p>
                                                                                        )}
                                                                                        {!isSearchingMonsters &&
                                                                                        monsterSearchError && (
                                                                                                <p
                                                                                                        className={`${styles.monsterSearchMessage} ${styles.monsterSearchError}`}
                                                                                                >
                                                                                                        {monsterSearchError}
                                                                                                </p>
                                                                                        )}
                                                                                        {!isSearchingMonsters &&
                                                                                        !monsterSearchError &&
                                                                                        monsterResults.length === 0 &&
                                                                                        monsterSearchTerm.length >= 2 && (
                                                                                                <p className={styles.monsterSearchMessage}>
                                                                                                        No monsters found.
                                                                                                </p>
                                                                                        )}
                                                                                        {!isSearchingMonsters &&
                                                                                        monsterResults.length > 0 && (
                                                                                                <ul className={styles.monsterSearchResults}>
                                                                                                        {monsterResults.map(
                                                                                                                (monster, index) => {
                                                                                                                        const key =
                                                                                                                                monster.slug ??
                                                                                                                                (monster.name
                                                                                                                                        ? `${monster.name}-${index}`
                                                                                                                                        : `monster-${index}`);

                                                                                                                        const typeParts = [
                                                                                                                                monster.size,
                                                                                                                                monster.type,
                                                                                                                        ]
                                                                                                                                .filter((part) =>
                                                                                                                                        typeof part ===
                                                                                                                                                "string" &&
                                                                                                                                        part.trim() !== ""
                                                                                                                                )
                                                                                                                                .map((part) => part.trim());

                                                                                                                        const challengeRating =
                                                                                                                                monster.challenge_rating !==
                                                                                                                                        undefined &&
                                                                                                                                monster.challenge_rating !==
                                                                                                                                        null
                                                                                                                                        ? `CR ${monster.challenge_rating}`
                                                                                                                                        : "";

                                                                                                                        const meta = [
                                                                                                                                typeParts.join(" "),
                                                                                                                                challengeRating,
                                                                                                                        ]
                                                                                                                                .filter((part) => part)
                                                                                                                                .join(" • ");

                                                                                                                        return (
                                                                                                                                <li key={key}>
                                                                                                                                        <button
                                                                                                                                                type='button'
                                                                                                                                                className={styles.monsterResultButton}
                                                                                                                                                onClick={() => handleMonsterSelect(monster)}
                                                                                                                                        >
                                                                                                                                                <span className={styles.monsterResultName}>
                                                                                                                                                        {monster.name || "Unnamed monster"}
                                                                                                                                                </span>
                                                                                                                                                {meta && (
                                                                                                                                                        <span className={styles.monsterResultMeta}>
                                                                                                                                                                {meta}
                                                                                                                                                        </span>
                                                                                                                                                )}
                                                                                                                                        </button>
                                                                                                                                </li>
                                                                                                                        );
                                                                                                                }
                                                                                                        )}
                                                                                                </ul>
                                                                                        )}
                                                                                </div>
                                                                        )}
                                                                </div>
                                                                <div className={styles.formGrid}>
                                                                        <label className={styles.inputGroup}>
                                                                                <span>Creature Name</span>
                                                                                <input
											type='text'
											value={enemyForm.name}
											onChange={(event) =>
												setEnemyForm((prev) => ({
													...prev,
													name: event.target.value,
												}))
											}
											placeholder='e.g. Goblin Shaman'
											required
										/>
									</label>
									<label className={styles.inputGroup}>
										<span>Initiative</span>
										<input
											type='number'
											value={enemyForm.initiative}
											onChange={(event) =>
												setEnemyForm((prev) => ({
													...prev,
													initiative: event.target.value,
												}))
											}
											placeholder='e.g. 14'
										/>
									</label>
									<label className={styles.inputGroup}>
										<span>Armor Class</span>
										<input
											type='text'
											value={enemyForm.armorClass}
											onChange={(event) =>
												setEnemyForm((prev) => ({
													...prev,
													armorClass: event.target.value,
												}))
											}
											placeholder='e.g. 15 (leather armor)'
										/>
									</label>
									<label className={styles.inputGroup}>
										<span>Hit Points</span>
										<input
											type='text'
											value={enemyForm.hitPoints}
											onChange={(event) =>
												setEnemyForm((prev) => ({
													...prev,
													hitPoints: event.target.value,
												}))
											}
											placeholder='e.g. 36 (8d8)'
										/>
									</label>
								</div>
								<fieldset className={styles.fieldset}>
									<legend>Notes</legend>
									<label className={styles.inputGroup}>
										<textarea
											rows={10}
											value={enemyForm.notes}
											onChange={(event) =>
												setEnemyForm((prev) => ({
													...prev,
													notes: event.target.value,
												}))
											}
											placeholder='Legendary resistances, vulnerabilities, or tactics.'
										/>
									</label>
								</fieldset>

								<button type='submit' className={styles.primaryButton}>
									Add Enemy
								</button>
							</form>

							{enemies.length > 0 && (
								<ul className={styles.cardList}>
									{enemies.map((enemy) => (
										<li key={enemy.id} className={styles.card}>
											<div className={styles.cardHeader}>
												<h3>{enemy.name}</h3>
												<p className={styles.statLine}>
													Initiative: <strong>{enemy.initiative}</strong>
												</p>
											</div>
											<div className={styles.statBlock}>
												{enemy.armorClass && (
													<p>
														<span>AC:</span> {enemy.armorClass}
													</p>
												)}
												{enemy.hitPoints && (
													<p>
														<span>HP:</span> {enemy.hitPoints}
													</p>
												)}
												{enemy.notes && (
													<p className={styles.notes}>{enemy.notes}</p>
												)}
											</div>
											<button
												type='button'
												className={styles.removeButton}
												onClick={() => removeEnemy(enemy.id)}>
												Remove
											</button>
										</li>
									))}
								</ul>
							)}
						</section>
					</div>
				</main>
			</div>
		</>
	);
}
