import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import styles from "@/styles/Home.module.css";

const generateId = () => {
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const emptyPartyForm = { name: "", initiative: "", hitPoints: "" };

const parseManualPartyHitPoints = (value) => {
        if (typeof value !== "string") {
                return undefined;
        }

        const trimmed = value.trim();

        if (trimmed === "") {
                return undefined;
        }

        const numericValue = Number(trimmed);

        if (Number.isFinite(numericValue)) {
                return { current: numericValue };
        }

        return { current: trimmed };
};

const formatManualPartyHitPoints = (hitPoints) => {
        if (!hitPoints) {
                return "";
        }

        if (typeof hitPoints === "object" && hitPoints !== null) {
                const current = hitPoints.current ?? hitPoints.value ?? hitPoints;

                if (current === undefined || current === null || current === "") {
                        return "";
                }

                return String(current);
        }

        return String(hitPoints);
};

const ENEMY_NOTE_PREVIEW_LENGTH = 140;

const ABILITY_SCORE_CONFIG = [
	{ key: "strength", label: "STR" },
	{ key: "dexterity", label: "DEX" },
	{ key: "constitution", label: "CON" },
	{ key: "intelligence", label: "INT" },
	{ key: "wisdom", label: "WIS" },
	{ key: "charisma", label: "CHA" },
];

const createEmptyAbilityScores = () =>
	ABILITY_SCORE_CONFIG.reduce((accumulator, { key }) => {
		accumulator[key] = "";
		return accumulator;
	}, {});

const createEmptyEnemyAction = () => ({
	name: "",
	description: "",
});

const createEmptyEnemyActions = () => [createEmptyEnemyAction()];

const createEmptyEnemyForm = () => ({
	name: "",
	armorClass: "",
	hitPoints: "",
	initiative: "",
	speed: "",
	abilityScores: createEmptyAbilityScores(),
	actions: createEmptyEnemyActions(),
	notes: "",
});

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

const formatMonsterSpeed = (speed) => {
	if (!speed) {
		return "";
	}

	if (typeof speed === "string") {
		return speed.trim();
	}

	if (typeof speed === "object") {
		const parts = Object.entries(speed)
			.map(([movementType, value]) => {
				if (value === undefined || value === null) {
					return "";
				}

				const trimmedValue =
					typeof value === "string" ? value.trim() : String(value).trim();

				if (!trimmedValue) {
					return "";
				}

				const label = movementType.replace(/_/g, " ");
				return `${label}: ${trimmedValue}`;
			})
			.filter(Boolean);

		return parts.join(", ");
	}

	return "";
};

const mapMonsterActionsToForm = (actions) => {
	if (!Array.isArray(actions)) {
		return [];
	}

	return actions
		.map((action) => {
			if (!action) {
				return null;
			}

			const name = typeof action.name === "string" ? action.name.trim() : "";
			const description =
				typeof action.desc === "string"
					? action.desc.trim()
					: typeof action.description === "string"
					? action.description.trim()
					: "";

			if (!name && !description) {
				return null;
			}

			return { name, description };
		})
		.filter(Boolean);
};

const mapAbilityScoresToForm = (
	scores,
	previousScores = createEmptyAbilityScores()
) => {
	const baseScores = { ...createEmptyAbilityScores(), ...previousScores };

	if (!scores || typeof scores !== "object") {
		return baseScores;
	}

	ABILITY_SCORE_CONFIG.forEach(({ key }) => {
		const value = scores[key];

		if (value === undefined || value === null) {
			return;
		}

		baseScores[key] = String(value);
	});

	return baseScores;
};

const mapMonsterToEnemyForm = (
	monster,
	previousForm = createEmptyEnemyForm()
) => {
	if (!monster || typeof monster !== "object") {
		return previousForm;
	}

	const formattedArmorClass = formatMonsterArmorClass(monster.armor_class);
	const formattedActions = formatMonsterActions(monster.actions);
	const formattedSpeed = formatMonsterSpeed(monster.speed);
	const mappedActions = mapMonsterActionsToForm(monster.actions);
	const abilityScores = mapAbilityScoresToForm(
		monster.ability_scores,
		previousForm.abilityScores
	);

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
		speed: formattedSpeed || previousForm.speed || "",
		abilityScores,
		actions:
			mappedActions.length > 0
				? mappedActions
				: Array.isArray(previousForm.actions) && previousForm.actions.length > 0
				? previousForm.actions
				: createEmptyEnemyActions(),
		notes:
			formattedActions &&
			!(previousForm.notes && previousForm.notes.trim() !== "")
				? formattedActions
				: previousForm.notes ?? "",
	};
};

const formatAbilityScoreDisplay = (value) => {
	if (value === undefined || value === null) {
		return null;
	}

	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			return null;
		}

		const modifier = Math.floor((value - 10) / 2);
		const sign = modifier >= 0 ? "+" : "";
		return `${value} (${sign}${modifier})`;
	}

	if (typeof value === "string") {
		const trimmed = value.trim();

		if (trimmed === "") {
			return null;
		}

		const numericValue = Number(trimmed);

		if (Number.isFinite(numericValue)) {
			const modifier = Math.floor((numericValue - 10) / 2);
			const sign = modifier >= 0 ? "+" : "";
			return `${numericValue} (${sign}${modifier})`;
		}

		return trimmed;
	}

	return null;
};

export default function Home() {
	const [partyMembers, setPartyMembers] = useState([]);
	const [enemies, setEnemies] = useState([]);
	const [expandedEnemyNotes, setExpandedEnemyNotes] = useState({});
	const [partyForm, setPartyForm] = useState(emptyPartyForm);
	const [enemyForm, setEnemyForm] = useState(() => createEmptyEnemyForm());
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

				const monsters = Array.isArray(data?.monsters) ? data.monsters : [];
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

	const handleEnemyAbilityScoreChange = (abilityKey, value) => {
		setEnemyForm((prev) => ({
			...prev,
			abilityScores: {
				...(prev.abilityScores ?? createEmptyAbilityScores()),
				[abilityKey]: value,
			},
		}));
	};

	const handleEnemyActionChange = (index, field, value) => {
		setEnemyForm((prev) => {
			const currentActions = Array.isArray(prev.actions)
				? prev.actions
				: createEmptyEnemyActions();

			const nextActions = currentActions.map((action, actionIndex) => {
				if (actionIndex !== index) {
					return action;
				}

				return {
					...action,
					[field]: value,
				};
			});

			return {
				...prev,
				actions: nextActions,
			};
		});
	};

	const handleAddEnemyAction = () => {
		setEnemyForm((prev) => {
			const currentActions = Array.isArray(prev.actions) ? prev.actions : [];

			return {
				...prev,
				actions: [...currentActions, createEmptyEnemyAction()],
			};
		});
	};

	const handleRemoveEnemyAction = (index) => {
		setEnemyForm((prev) => {
			const currentActions = Array.isArray(prev.actions) ? prev.actions : [];

			const nextActions = currentActions.filter(
				(_, actionIndex) => actionIndex !== index
			);

			return {
				...prev,
				actions:
					nextActions.length > 0 ? nextActions : createEmptyEnemyActions(),
			};
		});
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

                const manualHitPoints = parseManualPartyHitPoints(partyForm.hitPoints);

                setPartyMembers((prev) => [
                        ...prev,
                        {
                                id: generateId(),
                                name: partyForm.name.trim(),
                                initiative: Number(partyForm.initiative) || 0,
                                ...(manualHitPoints ? { hitPoints: manualHitPoints } : {}),
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

		const speedValue =
			typeof enemyForm.speed === "string" ? enemyForm.speed.trim() : "";

		const sanitizedAbilityScores = (() => {
			const scores = enemyForm.abilityScores ?? {};
			const result = {};

			ABILITY_SCORE_CONFIG.forEach(({ key }) => {
				const rawValue = scores[key];

				if (rawValue === undefined || rawValue === null) {
					return;
				}

				const trimmed =
					typeof rawValue === "string"
						? rawValue.trim()
						: String(rawValue).trim();

				if (trimmed !== "") {
					result[key] = trimmed;
				}
			});

			return Object.keys(result).length > 0 ? result : undefined;
		})();

		const sanitizedActions = Array.isArray(enemyForm.actions)
			? enemyForm.actions
					.map((action) => ({
						name: typeof action?.name === "string" ? action.name.trim() : "",
						description:
							typeof action?.description === "string"
								? action.description.trim()
								: "",
					}))
					.filter((action) => action.name || action.description)
			: [];

		setEnemies((prev) => [
			...prev,
			{
				id: generateId(),
				name: enemyForm.name.trim(),
				armorClass: enemyForm.armorClass.trim(),
				hitPoints: enemyForm.hitPoints.trim(),
				initiative: Number(enemyForm.initiative) || 0,
				speed: speedValue,
				abilityScores: sanitizedAbilityScores,
				actions: sanitizedActions.length > 0 ? sanitizedActions : undefined,
				notes: enemyForm.notes.trim(),
			},
		]);
		setEnemyForm(createEmptyEnemyForm());
	};

	const removePartyMember = (id) => {
		setPartyMembers((prev) => prev.filter((member) => member.id !== id));
	};

	const removeEnemy = (id) => {
		setEnemies((prev) => prev.filter((enemy) => enemy.id !== id));
		setExpandedEnemyNotes((prev) => {
			if (!prev[id]) {
				return prev;
			}

			const next = { ...prev };
			delete next[id];
			return next;
		});
	};

	const handleEnemyHitPointsChange = (id, value) => {
		setEnemies((prev) =>
			prev.map((enemy) => {
				if (enemy.id !== id) {
					return enemy;
				}

				return {
					...enemy,
					hitPoints: value,
				};
			})
		);
	};

	const toggleEnemyNotesExpansion = (id) => {
		setExpandedEnemyNotes((prev) => ({
			...prev,
			[id]: !prev[id],
		}));
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
		monsterSearchTerm.length >= 2 ||
		isSearchingMonsters ||
		Boolean(monsterSearchError);

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
									const showPartyHitPoints =
										combatant.type === "party" && combatant.hitPoints;
									const showEnemyHitPoints = combatant.type === "enemy";
									const currentHitPoints = showPartyHitPoints
										? Number(combatant.hitPoints.current)
										: null;
									const isLowHitPoints =
										Number.isFinite(currentHitPoints) && currentHitPoints <= 5;
									const enemyNote =
										combatant.type === "enemy" &&
										typeof combatant.notes === "string"
											? combatant.notes.trim()
											: "";
									const hasEnemyNote = enemyNote.length > 0;
									const isEnemyNoteExpanded = Boolean(
										expandedEnemyNotes[combatant.id]
									);
									const shouldTruncateEnemyNote =
										hasEnemyNote &&
										enemyNote.length > ENEMY_NOTE_PREVIEW_LENGTH;
									const displayedEnemyNote =
										isEnemyNoteExpanded || !shouldTruncateEnemyNote
											? enemyNote
											: `${enemyNote
													.slice(0, ENEMY_NOTE_PREVIEW_LENGTH)
													.trimEnd()}…`;

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
												{(showPartyHitPoints || showEnemyHitPoints) && (
													<div className={styles.combatantVitals}>
														{showPartyHitPoints ? (
															<>
																<div className={styles.currentHp}>
																	<span className={styles.currentHpLabel}>
																		HP
																	</span>
																	<span
																		className={`${styles.currentHpValue} ${
																			isLowHitPoints ? styles.lowHp : ""
																		}`}>
																		{combatant.hitPoints.current}
																	</span>
																	{typeof combatant.hitPoints.max ===
																		"number" &&
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
															</>
														) : (
															<label className={styles.currentHp}>
																<span className={styles.currentHpLabel}>
																	HP
																</span>
																<input
																	type='text'
																	className={styles.enemyHpInput}
																	value={
																		typeof combatant.hitPoints === "number"
																			? String(combatant.hitPoints)
																			: combatant.hitPoints ?? ""
																	}
																	onChange={(event) =>
																		handleEnemyHitPointsChange(
																			combatant.id,
																			event.target.value
																		)
																	}
																	placeholder='--'
																/>
															</label>
														)}
													</div>
												)}
											</div>
											{combatant.type === "enemy" && (
												<div className={styles.combatantDetails}>
													{combatant.armorClass && (
														<span>AC {combatant.armorClass}</span>
													)}
													{hasEnemyNote && (
														<div className={styles.enemyNotes}>
															<span className={styles.enemyNotesText}>
																{displayedEnemyNote}
															</span>
															{shouldTruncateEnemyNote && (
																<button
																	type='button'
																	className={styles.expandNotesButton}
																	onClick={() =>
																		toggleEnemyNotesExpansion(combatant.id)
																	}>
																	{isEnemyNoteExpanded
																		? "Show less"
																		: "Read more"}
																</button>
															)}
														</div>
													)}
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
                                                                                <span>Current HP</span>
                                                                                <input
                                                                                        type='number'
                                                                                        value={partyForm.hitPoints}
                                                                                        onChange={(event) =>
                                                                                                setPartyForm((prev) => ({
                                                                                                        ...prev,
                                                                                                        hitPoints: event.target.value,
                                                                                                }))
                                                                                        }
                                                                                        placeholder='e.g. 32'
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
												{member.source !== "dndbeyond" && member.hitPoints && (
													<p className={styles.statLine}>
														Hit Points: <strong>{formatManualPartyHitPoints(member.hitPoints)}</strong>
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
											onChange={(event) => setMonsterSearch(event.target.value)}
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
											{!isSearchingMonsters && monsterSearchError && (
												<p
													className={`${styles.monsterSearchMessage} ${styles.monsterSearchError}`}>
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
											{!isSearchingMonsters && monsterResults.length > 0 && (
												<ul className={styles.monsterSearchResults}>
													{monsterResults.map((monster, index) => {
														const key =
															monster.slug ??
															(monster.name
																? `${monster.name}-${index}`
																: `monster-${index}`);

														const typeParts = [monster.size, monster.type]
															.filter(
																(part) =>
																	typeof part === "string" && part.trim() !== ""
															)
															.map((part) => part.trim());

														const challengeRating =
															monster.challenge_rating !== undefined &&
															monster.challenge_rating !== null
																? `CR ${monster.challenge_rating}`
																: "";

														const meta = [typeParts.join(" "), challengeRating]
															.filter((part) => part)
															.join(" • ");

														return (
															<li key={key}>
																<button
																	type='button'
																	className={styles.monsterResultButton}
																	onClick={() => handleMonsterSelect(monster)}>
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
													})}
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
									<label className={styles.inputGroup}>
										<span>Speed</span>
										<input
											type='text'
											value={enemyForm.speed}
											onChange={(event) =>
												setEnemyForm((prev) => ({
													...prev,
													speed: event.target.value,
												}))
											}
											placeholder='e.g. 30 ft., climb 20 ft.'
										/>
									</label>
								</div>
								<fieldset className={styles.fieldset}>
									<legend>Ability Scores</legend>
									<div className={styles.abilityScoreFields}>
										{ABILITY_SCORE_CONFIG.map(({ key, label }) => (
											<label key={key} className={styles.inputGroup}>
												<span>{label}</span>
												<input
													type='number'
													value={enemyForm.abilityScores?.[key] ?? ""}
													onChange={(event) =>
														handleEnemyAbilityScoreChange(
															key,
															event.target.value
														)
													}
													placeholder='--'
												/>
											</label>
										))}
									</div>
								</fieldset>
								<fieldset className={styles.fieldset}>
									<legend>Actions</legend>
									<div className={styles.actionList}>
										{enemyForm.actions.map((action, index) => {
											const canRemoveAction = enemyForm.actions.length > 1;

											return (
												<div
													key={`enemy-action-${index}`}
													className={styles.actionItem}>
													<label className={styles.inputGroup}>
														<span>Action Name</span>
														<input
															type='text'
															value={action.name}
															onChange={(event) =>
																handleEnemyActionChange(
																	index,
																	"name",
																	event.target.value
																)
															}
															placeholder='e.g. Scimitar'
														/>
													</label>
													<label className={styles.inputGroup}>
														<span>Description</span>
														<textarea
															rows={3}
															value={action.description}
															onChange={(event) =>
																handleEnemyActionChange(
																	index,
																	"description",
																	event.target.value
																)
															}
															placeholder='Attack bonus, reach, and damage.'
														/>
													</label>
													<button
														type='button'
														className={styles.secondaryButton}
														onClick={() => handleRemoveEnemyAction(index)}
														disabled={!canRemoveAction}>
														Remove Action
													</button>
												</div>
											);
										})}
									</div>
									<div className={styles.actionFooter}>
										<button
											type='button'
											className={styles.secondaryButton}
											onClick={handleAddEnemyAction}>
											Add Action
										</button>
									</div>
								</fieldset>
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
									{enemies.map((enemy) => {
										const abilityScores =
											enemy.abilityScores ?? enemy.ability_scores ?? {};
										const hasAbilityScores = ABILITY_SCORE_CONFIG.some(
											({ key }) => {
												const value = abilityScores?.[key];
												if (typeof value === "string") {
													return value.trim() !== "";
												}
												return value !== undefined && value !== null;
											}
										);
										const actions = Array.isArray(enemy.actions)
											? enemy.actions
											: [];
										const formattedActions = actions
											.map((action, index) => {
												if (!action) {
													return null;
												}
												const name =
													typeof action.name === "string"
														? action.name.trim()
														: "";
												const description =
													typeof action.description === "string"
														? action.description.trim()
														: "";
												if (!name && !description) {
													return null;
												}
												return {
													key: `${enemy.id}-action-${index}`,
													name,
													description,
												};
											})
											.filter(Boolean);
										const speed =
											typeof enemy.speed === "string" ? enemy.speed.trim() : "";
										return (
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
													{speed && (
														<p>
															<span>Speed:</span> {speed}
														</p>
													)}
													{hasAbilityScores && (
														<div>
															<span>Ability Scores</span>
															<div className={styles.abilityScoreList}>
																{ABILITY_SCORE_CONFIG.map(({ key, label }) => {
																	const formattedScore =
																		formatAbilityScoreDisplay(
																			abilityScores?.[key]
																		);
																	return (
																		<div
																			key={`${enemy.id}-${key}`}
																			className={styles.abilityScoreListItem}>
																			<span>{label}</span>
																			<strong>{formattedScore ?? "--"}</strong>
																		</div>
																	);
																})}
															</div>
														</div>
													)}
													{formattedActions.length > 0 && (
														<div className={styles.attackList}>
															<h4>Actions</h4>
															<ul>
																{formattedActions.map((action) => (
																	<li key={action.key}>
																		{action.name && (
																			<strong>{action.name}</strong>
																		)}
																		{action.description && (
																			<p>{action.description}</p>
																		)}
																	</li>
																))}
															</ul>
														</div>
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
										);
									})}
								</ul>
							)}
						</section>
					</div>
				</main>
			</div>
		</>
	);
}
