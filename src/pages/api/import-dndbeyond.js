const DEXTERITY_STAT_ID = 2;
const ABILITY_STAT_IDS = {
	1: "Strength",
	2: "Dexterity",
	3: "Constitution",
	4: "Intelligence",
	5: "Wisdom",
	6: "Charisma",
};

const extractCharacterId = (identifier) => {
	if (!identifier || typeof identifier !== "string") {
		return null;
	}

	const trimmed = identifier.trim();
	if (!trimmed) {
		return null;
	}

	if (/^\d+$/.test(trimmed)) {
		return trimmed;
	}

	try {
		const url = new URL(trimmed);
		const idFromPath = url.pathname.match(
			/\/(?:characters?|character)\/(\d+)/i
		);
		if (idFromPath && idFromPath[1]) {
			return idFromPath[1];
		}
	} catch (error) {
		// Not a URL, continue to fallbacks below.
	}

	const matches = trimmed.match(/(\d{5,})/g);
	if (matches && matches.length > 0) {
		return matches[matches.length - 1];
	}

	return null;
};

const flattenModifiers = (modifiers) => {
	if (!modifiers || typeof modifiers !== "object") {
		return [];
	}

	return Object.values(modifiers).reduce((accumulator, value) => {
		if (Array.isArray(value)) {
			return accumulator.concat(value);
		}
		return accumulator;
	}, []);
};

const parseFiniteNumber = (value) => {
	if (value === null || value === undefined) {
		return null;
	}

	if (typeof value === "string" && value.trim() === "") {
		return null;
	}

	const numericValue = Number(value);
	return Number.isFinite(numericValue) ? numericValue : null;
};

const getAbilityScore = (character, statId) => {
	if (!character || !statId) {
		return null;
	}

	const override = Array.isArray(character.overrideStats)
		? character.overrideStats.find((stat) => stat?.id === statId)
		: null;
	const overrideValue = parseFiniteNumber(override?.value);
	if (Number.isFinite(overrideValue)) {
		return overrideValue;
	}

	const base = Array.isArray(character.stats)
		? character.stats.find((stat) => stat?.id === statId)
		: null;

	const baseValue = parseFiniteNumber(base?.value);
	if (Number.isFinite(baseValue)) {
		return baseValue;
	}

	switch (statId) {
		case 1:
			return Number(character.strength) || null;
		case 2:
			return Number(character.dexterity) || null;
		case 3:
			return Number(character.constitution) || null;
		case 4:
			return Number(character.intelligence) || null;
		case 5:
			return Number(character.wisdom) || null;
		case 6:
			return Number(character.charisma) || null;
		default:
			return null;
	}
};

const calculateDexterityModifier = (character) => {
	if (!character) {
		return 0;
	}

	const dexterityScore = getAbilityScore(character, DEXTERITY_STAT_ID);

	if (!Number.isFinite(dexterityScore)) {
		return 0;
	}

	return Math.floor((dexterityScore - 10) / 2);
};

const calculateInitiative = (character) => {
	const dexMod = calculateDexterityModifier(character);
	const modifiers = flattenModifiers(character?.modifiers);

	const initiativeBonuses = modifiers
		.filter((modifier) => modifier?.subType === "initiative")
		.reduce((total, modifier) => total + (Number(modifier?.value) || 0), 0);

	const bonusStats = Array.isArray(character?.bonusStats)
		? character.bonusStats
				.filter((bonus) => bonus?.subType === "initiative")
				.reduce((total, bonus) => total + (Number(bonus?.value) || 0), 0)
		: 0;

	const customAdjustments = Array.isArray(character?.customAdjustments)
		? character.customAdjustments
				.filter((adjustment) => adjustment?.statId === "initiative")
				.reduce(
					(total, adjustment) => total + (Number(adjustment?.value) || 0),
					0
				)
		: 0;

	const overrideInitiative = Array.isArray(character?.overrideStats)
		? character.overrideStats.find((stat) => stat?.subType === "initiative")
		: null;

	if (overrideInitiative && Number.isFinite(Number(overrideInitiative.value))) {
		return Number(overrideInitiative.value);
	}

	return dexMod + initiativeBonuses + bonusStats + customAdjustments;
};

const mapAbilityScores = (character) => {
	return Object.entries(ABILITY_STAT_IDS)
		.map(([statId, label]) => {
			const numericId = Number(statId);
			const score = getAbilityScore(character, numericId);

			if (!Number.isFinite(score)) {
				return null;
			}

			const modifier = Math.floor((score - 10) / 2);

			return {
				id: numericId,
				name: label,
				score,
				modifier,
			};
		})
		.filter(Boolean);
};

const sanitizeNumber = (value) => parseFiniteNumber(value);

const calculateHitPoints = (character) => {
	if (!character) {
		return null;
	}

	const baseHitPoints = sanitizeNumber(character.baseHitPoints) || 0;
	const bonusHitPoints = sanitizeNumber(character.bonusHitPoints) || 0;
	const overrideHitPointMaximum = sanitizeNumber(
		character.overrideHitPointMaximum
	);
	const overrideHitPoints = sanitizeNumber(character.overrideHitPoints);
	const removedHitPoints = sanitizeNumber(character.removedHitPoints) || 0;

	const computedMax = baseHitPoints + bonusHitPoints;
	const maxOverride = [overrideHitPointMaximum, overrideHitPoints].find(
		(value) => Number.isFinite(value) && value > 0
	);

	let maxHitPoints = Number.isFinite(maxOverride) ? maxOverride : computedMax;
	if (!Number.isFinite(maxHitPoints) || maxHitPoints < 0) {
		maxHitPoints = 0;
	}

	const overrideCurrentHitPoints = sanitizeNumber(
		character.overrideCurrentHitPoints
	);
	const currentHitPointsValue = sanitizeNumber(character.currentHitPoints);

	let currentHitPoints = [overrideCurrentHitPoints, currentHitPointsValue].find(
		(value) => Number.isFinite(value) && value >= 0
	);

	if (!Number.isFinite(currentHitPoints)) {
		currentHitPoints = Number.isFinite(maxHitPoints)
			? Math.max(maxHitPoints - removedHitPoints, 0)
			: 0;
	}

	if (currentHitPoints < 0) {
		currentHitPoints = 0;
	}

	if (Number.isFinite(maxHitPoints) && maxHitPoints > 0) {
		currentHitPoints = Math.min(currentHitPoints, maxHitPoints);
	}

	const temporaryHitPointsCandidates = [
		sanitizeNumber(character.temporaryHitPoints),
		sanitizeNumber(character.bonusTemporaryHitPoints),
		sanitizeNumber(character.overrideTemporaryHitPoints),
	].filter((value) => Number.isFinite(value) && value > 0);

	const temporaryHitPoints =
		temporaryHitPointsCandidates.length > 0
			? Math.max(...temporaryHitPointsCandidates)
			: 0;

	if (!Number.isFinite(maxHitPoints) || maxHitPoints <= 0) {
		maxHitPoints = Number.isFinite(currentHitPoints) ? currentHitPoints : 0;
	}

	const sanitizedCurrent = Number.isFinite(currentHitPoints)
		? currentHitPoints
		: 0;
	const sanitizedMax =
		Number.isFinite(maxHitPoints) && maxHitPoints > 0 ? maxHitPoints : 0;

	return {
		current: sanitizedCurrent,
		max: sanitizedMax,
		temporary: temporaryHitPoints,
	};
};

const mapClasses = (classes) => {
	if (!Array.isArray(classes)) {
		return [];
	}

	return classes
		.map((entry) => ({
			name: entry?.definition?.name ?? null,
			level: Number(entry?.level) || 0,
		}))
		.filter((entry) => entry.name);
};

export default async function handler(request, response) {
	if (request.method !== "POST") {
		response.setHeader("Allow", ["POST"]);
		return response.status(405).json({ error: "Method not allowed." });
	}

	const identifier = request.body?.identifier;
	if (typeof identifier !== "string" || identifier.trim().length === 0) {
		console.error("D&D Beyond import failed: missing identifier", {
			bodyType: typeof request.body,
			hasIdentifier: Boolean(request.body?.identifier),
		});
		return response
			.status(400)
			.json({ error: "Provide a D&D Beyond character URL or ID." });
	}

	const characterId = extractCharacterId(identifier);
	if (!characterId) {
		console.error("D&D Beyond import failed: could not parse identifier", {
			identifier,
		});
		return response
			.status(400)
			.json({ error: "Unable to determine a character ID from the input." });
	}

	try {
		const upstreamResponse = await fetch(
			`https://character-service.dndbeyond.com/character/v5/character/${characterId}`,
			{
				headers: {
					Accept: "application/json",
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
				},
			}
		);

		if (!upstreamResponse.ok) {
			let errorBodyText = null;
			let parsedError = null;

			try {
				errorBodyText = await upstreamResponse.text();
			} catch (readError) {
				parsedError = {
					readError: readError?.message ?? String(readError),
				};
			}

			if (!parsedError && errorBodyText) {
				try {
					parsedError = JSON.parse(errorBodyText);
				} catch (parseError) {
					parsedError = null;
				}
			}

			console.error("D&D Beyond import failed: upstream error", {
				characterId,
				status: upstreamResponse.status,
				statusText: upstreamResponse.statusText,
				errorBodyText,
				parsedError,
			});

			let errorMessage = parsedError?.serverMessage
				? `D&D Beyond reported: ${parsedError.serverMessage}`
				: "Failed to fetch character from D&D Beyond.";

			if (upstreamResponse.status === 404) {
				errorMessage =
					"Character not found on D&D Beyond. Ensure it is shared or the ID is correct.";
			} else if (
				upstreamResponse.status === 401 ||
				upstreamResponse.status === 403
			) {
				errorMessage =
					"D&D Beyond denied access to this character. Make sure it is shared and you can view it without logging in.";
			}

			const errorResponse = { error: errorMessage };

			if (
				parsedError?.serverMessage &&
				!errorMessage.includes(parsedError.serverMessage)
			) {
				errorResponse.details = parsedError.serverMessage;
			}

			if (parsedError?.errorCode) {
				errorResponse.upstreamErrorCode = parsedError.errorCode;
			}

			return response.status(upstreamResponse.status).json(errorResponse);
		}

		let payload;
		try {
			payload = await upstreamResponse.json();
		} catch (parseError) {
			console.error("D&D Beyond import failed: could not parse JSON", {
				characterId,
				message: parseError?.message ?? parseError,
			});

			return response.status(502).json({
				error:
					"Received malformed data from D&D Beyond while importing the character.",
			});
		}
		const character = payload?.data;

		if (!character || !character.name) {
			console.error("D&D Beyond import failed: unexpected payload", {
				characterId,
				hasData: Boolean(payload?.data),
				payloadKeys: payload ? Object.keys(payload) : null,
			});

			return response
				.status(502)
				.json({ error: "Received unexpected data from D&D Beyond." });
		}

		const initiative = calculateInitiative(character);
		const classes = mapClasses(character.classes);
		const level = classes.reduce((total, current) => total + current.level, 0);
		const abilityScores = mapAbilityScores(character);
		const hitPoints = calculateHitPoints(character);

		return response.status(200).json({
			id: characterId,
			name: character.name,
			initiative,
			classes,
			level,
			playerName: character.preferences?.playerName ?? null,
			abilityScores,
			hitPoints,
		});
	} catch (error) {
		console.error("D&D Beyond import failed: unexpected exception", {
			characterId,
			message: error?.message ?? String(error),
			stack: error?.stack,
		});
		return response
			.status(500)
			.json({ error: "An unexpected error occurred while importing." });
	}
}
