import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import styles from "@/styles/Home.module.css";
import { ABILITY_SCORE_CONFIG } from "@/lib/combatFormatting";
import { isValidInitiativeInput } from "@/lib/initiativeValidation";
import { EXHAUSTION_CONDITION_VALUE } from "@/lib/statusConditions";
import CombatOrder from "@/components/CombatOrder";
import PartyMembers from "@/components/PartyMembers";
import Enemies from "@/components/Enemies";

const generateId = () => {
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const emptyPartyForm = {
	name: "",
	initiative: "",
	hitPointsCurrent: "",
	hitPointsTotal: "",
};

const parseManualPartyHitPoints = (currentValue, totalValue) => {
	const parseValue = (value) => {
		if (typeof value !== "string") {
			return undefined;
		}

		const trimmed = value.trim();

		if (trimmed === "") {
			return undefined;
		}

		const numericValue = Number(trimmed);

		if (Number.isFinite(numericValue)) {
			return numericValue;
		}

		return trimmed;
	};

	const current = parseValue(currentValue);
	const max = parseValue(totalValue);

	if (current === undefined && max === undefined) {
		return undefined;
	}

	const result = {};

	if (current !== undefined) {
		result.current = current;
	}

	if (max !== undefined) {
		result.max = max;
	}

	return result;
};

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

const CONCENTRATION_STATUS_VALUES = new Set(["concentrating", "custom"]);

const buildStatusFromCharacterConditions = (conditions) => {
        if (!Array.isArray(conditions) || conditions.length === 0) {
                return null;
        }

        const validConditions = conditions.filter(
                (condition) =>
                        condition && typeof condition.value === "string" && condition.value.trim().length > 0
        );

        if (validConditions.length === 0) {
                return null;
        }

        const [primary, ...rest] = validConditions;

        const detailParts = [];

        if (
                primary.value === EXHAUSTION_CONDITION_VALUE &&
                Number.isFinite(primary.level) &&
                primary.level >= 0
        ) {
                detailParts.push(`Level ${primary.level}`);
        }

        if (rest.length > 0) {
                const restDescriptions = rest
                        .map((condition) => {
                                if (
                                        condition.value === EXHAUSTION_CONDITION_VALUE &&
                                        Number.isFinite(condition.level) &&
                                        condition.level >= 0
                                ) {
                                        return `${condition.name} (Level ${condition.level})`;
                                }

                                return condition.name;
                        })
                        .filter((label) => typeof label === "string" && label.trim().length > 0);

                if (restDescriptions.length > 0) {
                        detailParts.push(restDescriptions.join(", "));
                }
        }

        const detail = detailParts.join("; ");

        return {
                status: primary.value,
                detail: detail || "",
        };
};

export default function Home() {
        const [partyMembers, setPartyMembers] = useState([]);
        const [enemies, setEnemies] = useState([]);
        const [expandedEnemyNotes, setExpandedEnemyNotes] = useState({});
        const [enemyDamageInputs, setEnemyDamageInputs] = useState({});
	const [partyDamageInputs, setPartyDamageInputs] = useState({});
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
        const [combatStatuses, setCombatStatuses] = useState({});
        const [roundCounter, setRoundCounter] = useState(1);
        const [concentrationReminder, setConcentrationReminder] = useState(null);

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

        useEffect(() => {
                setCombatStatuses((previousStatuses) => {
                        const nextStatuses = { ...previousStatuses };
                        const combatants = [...partyMembers, ...enemies];
                        const validIds = new Set(combatants.map((combatant) => combatant.id));
                        let hasChanges = false;

                        for (const combatant of combatants) {
                                if (!nextStatuses[combatant.id]) {
                                        nextStatuses[combatant.id] = { status: "none", detail: "" };
                                        hasChanges = true;
                                }
                        }

                        for (const id of Object.keys(nextStatuses)) {
                                if (!validIds.has(id)) {
                                        delete nextStatuses[id];
                                        hasChanges = true;
                                }
                        }

                        return hasChanges ? nextStatuses : previousStatuses;
                });
        }, [partyMembers, enemies]);

        const handleMonsterSelect = (monster) => {
                setEnemyForm((prev) => mapMonsterToEnemyForm(monster, prev));
                setMonsterSearch("");
                setMonsterResults([]);
                setMonsterSearchError("");
                setIsSearchingMonsters(false);
        };

        const handleCombatStatusChange = (combatantId, status) => {
                setCombatStatuses((previousStatuses) => {
                        const previousEntry = previousStatuses[combatantId] ?? {
                                status: "none",
                                detail: "",
                        };
                        const nextDetail = status === "none" ? "" : previousEntry.detail ?? "";

                        if (previousEntry.status === status && previousEntry.detail === nextDetail) {
                                return previousStatuses;
                        }

                        return {
                                ...previousStatuses,
                                [combatantId]: {
                                        status,
                                        detail: nextDetail,
                                },
                        };
                });
        };

        const dismissConcentrationReminder = () => {
                setConcentrationReminder(null);
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
                const trimmedName = partyForm.name.trim();
                if (!trimmedName) return;

                const initiativeValue = parseInitiativeValue(partyForm.initiative);

                if (!Number.isFinite(initiativeValue)) {
                        return;
                }

                const manualHitPoints = parseManualPartyHitPoints(
                        partyForm.hitPointsCurrent,
                        partyForm.hitPointsTotal
                );

                setPartyMembers((prev) => [
                        ...prev,
                        {
                                id: generateId(),
                                name: trimmedName,
                                initiative: initiativeValue,
                                source: "manual",
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

                        const importedStatus = buildStatusFromCharacterConditions(data.conditions);

                        setPartyMembers((prev) => [...prev, newMember]);

                        if (importedStatus) {
                                setCombatStatuses((previous) => ({
                                        ...previous,
                                        [newMember.id]: importedStatus,
                                }));
                        }

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
                        const statusUpdates = {};
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

                                        const importedStatus = buildStatusFromCharacterConditions(character.conditions);
                                        if (importedStatus) {
                                                statusUpdates[newMember.id] = importedStatus;
                                        }
                                }
                        }

                        if (newMembers.length > 0) {
                                setPartyMembers((prev) => [...prev, ...newMembers]);
                                if (Object.keys(statusUpdates).length > 0) {
                                        setCombatStatuses((previous) => ({
                                                ...previous,
                                                ...statusUpdates,
                                        }));
                                }
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
                const trimmedName = enemyForm.name.trim();
                if (!trimmedName) return;

                const initiativeValue = parseInitiativeValue(enemyForm.initiative);

                if (!Number.isFinite(initiativeValue)) {
                        return;
                }

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

                const trimmedHitPoints = enemyForm.hitPoints.trim();
                const numericHitPoints = Number(trimmedHitPoints);
                const parsedHitPoints =
                        trimmedHitPoints === ""
                                ? ""
                                : Number.isFinite(numericHitPoints)
                                ? numericHitPoints
                                : trimmedHitPoints;
                const parsedMaxHitPoints =
                        trimmedHitPoints === ""
                                ? undefined
                                : Number.isFinite(numericHitPoints)
                                ? numericHitPoints
                                : trimmedHitPoints;

                setEnemies((prev) => [
                        ...prev,
                        {
                                id: generateId(),
                                name: trimmedName,
                                armorClass: enemyForm.armorClass.trim(),
                                hitPoints: parsedHitPoints,
                                ...(parsedMaxHitPoints !== undefined
                                        ? { maxHitPoints: parsedMaxHitPoints }
                                        : {}),
                                initiative: initiativeValue,
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
		setPartyDamageInputs((prev) => {
			if (!(id in prev)) {
				return prev;
			}

			const next = { ...prev };
			delete next[id];
			return next;
		});
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
                const sanitizeHitPointEntry = (raw) => {
                        if (raw === undefined || raw === null) {
                                return undefined;
                        }

                        const stringValue = typeof raw === "string" ? raw : String(raw);
                        const trimmedValue = stringValue.trim();

                        if (trimmedValue === "") {
                                return undefined;
                        }

                        const numericValue = Number(trimmedValue);

                        if (Number.isFinite(numericValue)) {
                                return numericValue;
                        }

                        return trimmedValue;
                };

                setEnemies((prev) =>
                        prev.map((enemy) => {
                                if (enemy.id !== id) {
                                        return enemy;
                                }

                                const rawValue = typeof value === "string" ? value : String(value ?? "");
                                const trimmedValue = rawValue.trim();

                                if (trimmedValue === "") {
                                        return {
                                                ...enemy,
                                                hitPoints: "",
                                        };
                                }

                                const slashIndex = trimmedValue.indexOf("/");

                                if (slashIndex !== -1) {
                                        const currentPart = trimmedValue.slice(0, slashIndex).trim();
                                        const maxPart = trimmedValue.slice(slashIndex + 1).trim();
                                        const sanitizedCurrent = sanitizeHitPointEntry(currentPart);
                                        const sanitizedMax = sanitizeHitPointEntry(maxPart);

                                        const nextEnemy = {
                                                ...enemy,
                                                hitPoints:
                                                        sanitizedCurrent !== undefined
                                                                ? sanitizedCurrent
                                                                : "",
                                        };

                                        if (sanitizedMax !== undefined) {
                                                nextEnemy.maxHitPoints = sanitizedMax;
                                        } else if (enemy.maxHitPoints !== undefined) {
                                                nextEnemy.maxHitPoints = enemy.maxHitPoints;
                                        }

                                        return nextEnemy;
                                }

                                const sanitizedCurrent = sanitizeHitPointEntry(trimmedValue);

                                const nextEnemy = {
                                        ...enemy,
                                        hitPoints: sanitizedCurrent !== undefined ? sanitizedCurrent : "",
                                };

                                if (
                                        sanitizedCurrent !== undefined &&
                                        enemy.maxHitPoints === undefined
                                ) {
                                        nextEnemy.maxHitPoints = sanitizedCurrent;
                                }

                                return nextEnemy;
                        })
                );
        };

        const handleManualPartyHitPointsChange = (id, value) => {
                setPartyMembers((prev) =>
                        prev.map((member) => {
                                if (member.id !== id || member.source === "dndbeyond") {
                                        return member;
                                }

                                const rawValue = typeof value === "string" ? value : String(value ?? "");
                                const trimmed = rawValue.trim();
                                const numericValue = Number(trimmed);
                                const nextCurrent =
                                        trimmed === ""
                                                ? undefined
                                                : Number.isFinite(numericValue)
                                                ? numericValue
                                                : trimmed;

                                const previousHitPoints =
                                        typeof member.hitPoints === "object" && member.hitPoints !== null
                                                ? member.hitPoints
                                                : {};
                                const nextHitPoints = { ...previousHitPoints };

                                if (nextCurrent === undefined) {
                                        delete nextHitPoints.current;
                                } else {
                                        nextHitPoints.current = nextCurrent;
                                }

                                const hasValues = Object.values(nextHitPoints).some(
                                        (entry) => entry !== undefined && entry !== null && entry !== ""
                                );

                                return {
                                        ...member,
                                        hitPoints: hasValues ? nextHitPoints : undefined,
                                };
                        })
                );
        };

        const handleEnemyDamageInputChange = (id, value) => {
                setEnemyDamageInputs((prev) => ({
                        ...prev,
                        [id]: value,
                }));
        };

        const clearEnemyDamageInput = (id) => {
                setEnemyDamageInputs((prev) => {
                        if (!(id in prev)) {
                                return prev;
                        }

                        const next = { ...prev };
                        delete next[id];
                        return next;
                });
        };

        const handleManualPartyDamageInputChange = (id, value) => {
                setPartyDamageInputs((prev) => ({
                        ...prev,
                        [id]: value,
                }));
        };

        const clearManualPartyDamageInput = (id) => {
                setPartyDamageInputs((prev) => {
                        if (!(id in prev)) {
                                return prev;
                        }

                        const next = { ...prev };
                        delete next[id];
                        return next;
                });
        };

        const applyEnemyDamage = (id) => {
                const rawDamage = enemyDamageInputs[id];
                const damageValue = Number(rawDamage);

                if (!Number.isFinite(damageValue)) {
                        clearEnemyDamageInput(id);
                        return;
                }

                const sanitizedDamage = Math.max(0, damageValue);

                setEnemies((prev) =>
                        prev.map((enemy) => {
                                if (enemy.id !== id) {
                                        return enemy;
                                }

                                const rawHitPoints = enemy.hitPoints;
                                const currentHitPoints =
                                        typeof rawHitPoints === "number"
                                                ? rawHitPoints
                                                : Number(rawHitPoints);

                                if (!Number.isFinite(currentHitPoints)) {
                                        return enemy;
                                }

                                const nextHitPoints = Math.max(0, currentHitPoints - sanitizedDamage);

                                return {
                                        ...enemy,
                                        hitPoints:
                                                typeof rawHitPoints === "number"
                                                        ? nextHitPoints
                                                        : String(nextHitPoints),
                                };
                        })
                );

                clearEnemyDamageInput(id);
        };

        const applyManualPartyDamage = (id) => {
                const rawDamage = partyDamageInputs[id];
                const damageValue = Number(rawDamage);

                if (!Number.isFinite(damageValue)) {
                        clearManualPartyDamageInput(id);
                        return;
                }

                const sanitizedDamage = Math.max(0, damageValue);

                setPartyMembers((prev) =>
                        prev.map((member) => {
                                if (member.id !== id || member.source === "dndbeyond") {
                                        return member;
                                }

                                const hitPoints = member.hitPoints;
                                let currentValue;

                                if (hitPoints && typeof hitPoints === "object") {
                                        if (
                                                hitPoints.current !== undefined &&
                                                hitPoints.current !== null &&
                                                hitPoints.current !== ""
                                        ) {
                                                currentValue = hitPoints.current;
                                        } else if (
                                                hitPoints.value !== undefined &&
                                                hitPoints.value !== null &&
                                                hitPoints.value !== ""
                                        ) {
                                                currentValue = hitPoints.value;
                                        } else if (
                                                hitPoints.hp !== undefined &&
                                                hitPoints.hp !== null &&
                                                hitPoints.hp !== ""
                                        ) {
                                                currentValue = hitPoints.hp;
                                        }
                                } else {
                                        currentValue = hitPoints;
                                }

                                const numericCurrent = Number(currentValue);

                                if (!Number.isFinite(numericCurrent)) {
                                        return member;
                                }

                                const nextHitPointsValue = Math.max(0, numericCurrent - sanitizedDamage);
                                const nextHitPoints =
                                        hitPoints && typeof hitPoints === "object"
                                                ? { ...hitPoints, current: nextHitPointsValue }
                                                : { current: nextHitPointsValue };

                                return {
                                        ...member,
                                        hitPoints: nextHitPoints,
                                };
                        })
                );

                clearManualPartyDamageInput(id);
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

                                if (!isValidInitiativeInput(value)) {
                                        return member;
                                }

                                const trimmedValue = value.trim();

                                if (trimmedValue === "") {
                                        return {
                                                ...member,
                                                initiative: null,
                                        };
                                }

                                if (trimmedValue === "-") {
                                        return {
                                                ...member,
                                                initiative: "-",
                                        };
                                }

                                const numericValue = Number(trimmedValue);

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

                if (nextIndex === 0) {
                        const nextRound = roundCounter + 1;
                        setRoundCounter(nextRound);

                        const activeStatuses = combatOrder
                                .map((combatant) => {
                                        const statusEntry = combatStatuses[combatant.id];

                                        if (!statusEntry || statusEntry.status === "none") {
                                                return null;
                                        }

                                        if (!CONCENTRATION_STATUS_VALUES.has(statusEntry.status)) {
                                                return null;
                                        }

                                        return {
                                                id: combatant.id,
                                                name: combatant.name,
                                                status: statusEntry.status,
                                                detail: statusEntry.detail ?? "",
                                        };
                                })
                                .filter(Boolean);

                        if (activeStatuses.length > 0) {
                                setConcentrationReminder({
                                        round: nextRound,
                                        combatants: activeStatuses,
                                });
                        } else {
                                setConcentrationReminder(null);
                        }
                }

                setActiveCombatantId(combatOrder[nextIndex].id);
        };

        const resetTurn = () => {
                if (combatOrder.length === 0) {
                        setActiveCombatantId(null);
                        setRoundCounter(1);
                        setConcentrationReminder(null);
                        return;
                }
                setActiveCombatantId(combatOrder[0].id);
                setRoundCounter(1);
                setConcentrationReminder(null);
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

        useEffect(() => {
                if (combatOrder.length === 0) {
                        setRoundCounter(1);
                        setConcentrationReminder(null);
                }
        }, [combatOrder]);

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

					<CombatOrder
						combatOrder={combatOrder}
						highlightedIndex={highlightedIndex}
						advanceTurn={advanceTurn}
						resetTurn={resetTurn}
						refreshDndBeyondHitPoints={refreshDndBeyondHitPoints}
						isRefreshingDndBeyondHp={isRefreshingDndBeyondHp}
						hasDndBeyondMembers={hasDndBeyondMembers}
						dndBeyondRefreshError={dndBeyondRefreshError}
						expandedEnemyNotes={expandedEnemyNotes}
						toggleEnemyNotesExpansion={toggleEnemyNotesExpansion}
						handleManualPartyHitPointsChange={handleManualPartyHitPointsChange}
						handleManualPartyDamageInputChange={
							handleManualPartyDamageInputChange
						}
						partyDamageInputs={partyDamageInputs}
						applyManualPartyDamage={applyManualPartyDamage}
                                                handleEnemyHitPointsChange={handleEnemyHitPointsChange}
                                                handleEnemyDamageInputChange={handleEnemyDamageInputChange}
                                                enemyDamageInputs={enemyDamageInputs}
                                                applyEnemyDamage={applyEnemyDamage}
                                                combatStatuses={combatStatuses}
                                                handleCombatStatusChange={handleCombatStatusChange}
                                                roundCounter={roundCounter}
                                                concentrationReminder={concentrationReminder}
                                                dismissConcentrationReminder={dismissConcentrationReminder}
                                        />

					<div className={styles.sectionColumns}>
						<PartyMembers
							partyMembers={partyMembers}
							partyForm={partyForm}
							setPartyForm={setPartyForm}
							handlePartySubmit={handlePartySubmit}
							handleDndBeyondImport={handleDndBeyondImport}
							handleDndBeyondCampaignImport={handleDndBeyondCampaignImport}
							dndBeyondIdentifier={dndBeyondIdentifier}
							setDndBeyondIdentifier={setDndBeyondIdentifier}
							dndBeyondNotice={dndBeyondNotice}
							dndBeyondError={dndBeyondError}
							isImportingDndBeyond={isImportingDndBeyond}
							removePartyMember={removePartyMember}
							handleImportedInitiativeChange={handleImportedInitiativeChange}
						/>

						<Enemies
							enemyForm={enemyForm}
							setEnemyForm={setEnemyForm}
							handleEnemySubmit={handleEnemySubmit}
							monsterSearch={monsterSearch}
							setMonsterSearch={setMonsterSearch}
							shouldShowMonsterDropdown={shouldShowMonsterDropdown}
							isSearchingMonsters={isSearchingMonsters}
							monsterSearchError={monsterSearchError}
							monsterResults={monsterResults}
							monsterSearchTerm={monsterSearchTerm}
							handleMonsterSelect={handleMonsterSelect}
							handleEnemyAbilityScoreChange={handleEnemyAbilityScoreChange}
							handleEnemyActionChange={handleEnemyActionChange}
							handleRemoveEnemyAction={handleRemoveEnemyAction}
							handleAddEnemyAction={handleAddEnemyAction}
							enemies={enemies}
							removeEnemy={removeEnemy}
						/>
					</div>
				</main>
			</div>
		</>
	);
}
