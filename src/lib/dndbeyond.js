const DEXTERITY_STAT_ID = 2;
const ABILITY_STAT_IDS = {
        1: "Strength",
        2: "Dexterity",
        3: "Constitution",
        4: "Intelligence",
        5: "Wisdom",
        6: "Charisma",
};

export class DndBeyondApiError extends Error {
        constructor(message, options = {}) {
                super(message);
                this.name = "DndBeyondApiError";
                this.status = options.status ?? 500;
                if (options.details) {
                        this.details = options.details;
                }
                if (options.upstreamErrorCode) {
                        this.upstreamErrorCode = options.upstreamErrorCode;
                }
                if (options.cause) {
                        this.cause = options.cause;
                }
        }
}

const COMMON_HEADERS = {
        Accept: "application/json",
        "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

const sanitizeNumericString = (value) => {
        if (typeof value === "number" && Number.isFinite(value)) {
                return String(Math.trunc(value));
        }

        if (typeof value === "string") {
                const trimmed = value.trim();
                if (/^\d+$/.test(trimmed)) {
                        return trimmed;
                }
        }

        return null;
};

export const extractCharacterId = (identifier) => {
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
                const idFromPath = url.pathname.match(/\/(?:characters?|character)\/(\d+)/i);
                if (idFromPath && idFromPath[1]) {
                        return idFromPath[1];
                }
        } catch (error) {
                // Not a URL, fall back to alternate parsing paths.
        }

        const matches = trimmed.match(/(\d{5,})/g);
        if (matches && matches.length > 0) {
                return matches[matches.length - 1];
        }

        return null;
};

export const extractCampaignId = (identifier) => {
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
                const idFromPath = url.pathname.match(/\/(?:campaigns?|campaign)\/(\d+)/i);
                if (idFromPath && idFromPath[1]) {
                        return idFromPath[1];
                }
        } catch (error) {
                // Not a URL, fall back to alternate parsing paths.
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
                                .reduce((total, adjustment) => total + (Number(adjustment?.value) || 0), 0)
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
        const overrideHitPointMaximum = sanitizeNumber(character.overrideHitPointMaximum);
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

        const overrideCurrentHitPoints = sanitizeNumber(character.overrideCurrentHitPoints);
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

        const sanitizedCurrent = Number.isFinite(currentHitPoints) ? currentHitPoints : 0;
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

const extractCampaignCharacterId = (entry) => {
        if (!entry || typeof entry !== "object") {
                return null;
        }

        const candidates = [
                entry.characterId,
                entry.id,
                entry.entityId,
                entry.assignedCharacterId,
                entry?.character?.id,
                entry?.character?.characterId,
                entry?.definition?.id,
        ];

        for (const candidate of candidates) {
                const numeric = sanitizeNumericString(candidate);
                if (numeric) {
                        return numeric;
                }
        }

        return null;
};

const getCampaignCharacterName = (entry) => {
        if (!entry || typeof entry !== "object") {
                return null;
        }

        const candidates = [
                entry.name,
                entry?.character?.name,
                entry?.definition?.name,
                entry?.assignedCharacterName,
        ];

        for (const candidate of candidates) {
                if (typeof candidate === "string" && candidate.trim()) {
                        return candidate.trim();
                }
        }

        return null;
};

const readErrorPayload = async (response) => {
        let errorBodyText = null;
        let parsedError = null;

        try {
                errorBodyText = await response.text();
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

        return { errorBodyText, parsedError };
};

const buildCharacterSummary = (characterId, character) => {
        const initiative = calculateInitiative(character);
        const classes = mapClasses(character.classes);
        const level = classes.reduce((total, current) => total + current.level, 0);
        const abilityScores = mapAbilityScores(character);
        const hitPoints = calculateHitPoints(character);

        return {
                id: characterId,
                name: character.name,
                initiative,
                classes,
                level,
                playerName: character.preferences?.playerName ?? null,
                abilityScores,
                hitPoints,
        };
};

const buildCharacterError = (response, parsedError) => {
        let errorMessage = parsedError?.serverMessage
                ? `D&D Beyond reported: ${parsedError.serverMessage}`
                : "Failed to fetch character from D&D Beyond.";

        if (response.status === 404) {
                errorMessage =
                        "Character not found on D&D Beyond. Ensure it is shared or the ID is correct.";
        } else if (response.status === 401 || response.status === 403) {
                errorMessage =
                        "D&D Beyond denied access to this character. Make sure it is shared and you can view it without logging in.";
        }

        const error = new DndBeyondApiError(errorMessage, { status: response.status });

        if (parsedError?.serverMessage && !errorMessage.includes(parsedError.serverMessage)) {
                error.details = parsedError.serverMessage;
        }

        if (parsedError?.errorCode) {
                error.upstreamErrorCode = parsedError.errorCode;
        }

        return error;
};

const buildCampaignError = (response, parsedError) => {
        let errorMessage = parsedError?.serverMessage
                ? `D&D Beyond reported: ${parsedError.serverMessage}`
                : "Failed to fetch campaign from D&D Beyond.";

        if (response.status === 404) {
                errorMessage = "Campaign not found on D&D Beyond or it contains no shared characters.";
        } else if (response.status === 401 || response.status === 403) {
                errorMessage =
                        "D&D Beyond denied access to this campaign. Ensure content sharing is enabled and the campaign is viewable without logging in.";
        }

        const error = new DndBeyondApiError(errorMessage, { status: response.status });

        if (parsedError?.serverMessage && !errorMessage.includes(parsedError.serverMessage)) {
                error.details = parsedError.serverMessage;
        }

        if (parsedError?.errorCode) {
                error.upstreamErrorCode = parsedError.errorCode;
        }

        return error;
};

export const fetchCharacterFromDndBeyond = async (characterId) => {
        if (!characterId) {
                throw new DndBeyondApiError("Missing character identifier.", { status: 400 });
        }

        let upstreamResponse;

        try {
                upstreamResponse = await fetch(
                        `https://character-service.dndbeyond.com/character/v5/character/${characterId}`,
                        {
                                headers: COMMON_HEADERS,
                        }
                );
        } catch (networkError) {
                throw new DndBeyondApiError("Unable to reach D&D Beyond.", {
                        status: 502,
                        details: networkError?.message ?? String(networkError),
                        cause: networkError,
                });
        }

        if (!upstreamResponse.ok) {
                const { parsedError } = await readErrorPayload(upstreamResponse);
                throw buildCharacterError(upstreamResponse, parsedError);
        }

        let payload;
        try {
                payload = await upstreamResponse.json();
        } catch (parseError) {
                throw new DndBeyondApiError(
                        "Received malformed data from D&D Beyond while importing the character.",
                        {
                                status: 502,
                                details: parseError?.message ?? String(parseError),
                                cause: parseError,
                        }
                );
        }

        const character = payload?.data;

        if (!character || !character.name) {
                throw new DndBeyondApiError("Received unexpected data from D&D Beyond.", {
                        status: 502,
                });
        }

        return buildCharacterSummary(characterId, character);
};

export const fetchCampaignCharacters = async (campaignId) => {
        if (!campaignId) {
                throw new DndBeyondApiError("Missing campaign identifier.", { status: 400 });
        }

        let upstreamResponse;

        try {
                upstreamResponse = await fetch(
                        `https://character-service.dndbeyond.com/character/v5/campaigns/${campaignId}`,
                        {
                                headers: COMMON_HEADERS,
                        }
                );
        } catch (networkError) {
                throw new DndBeyondApiError("Unable to reach D&D Beyond.", {
                        status: 502,
                        details: networkError?.message ?? String(networkError),
                        cause: networkError,
                });
        }

        if (!upstreamResponse.ok) {
                const { parsedError } = await readErrorPayload(upstreamResponse);
                throw buildCampaignError(upstreamResponse, parsedError);
        }

        let payload;
        try {
                payload = await upstreamResponse.json();
        } catch (parseError) {
                throw new DndBeyondApiError(
                        "Received malformed data from D&D Beyond while importing the campaign.",
                        {
                                status: 502,
                                details: parseError?.message ?? String(parseError),
                                cause: parseError,
                        }
                );
        }

        const campaign = payload?.data;
        if (!campaign) {
                throw new DndBeyondApiError(
                        "Received unexpected data from D&D Beyond for the campaign.",
                        {
                                status: 502,
                        }
                );
        }

        const campaignCharacters = Array.isArray(campaign.characters)
                ? campaign.characters
                : [];

        const mappedCharacters = campaignCharacters
                .map((entry) => {
                        const id = extractCampaignCharacterId(entry);
                        if (!id) {
                                return null;
                        }
                        return {
                                id,
                                name: getCampaignCharacterName(entry),
                        };
                })
                .filter(Boolean);

        return {
                campaignName: typeof campaign.name === "string" ? campaign.name : null,
                characters: mappedCharacters,
        };
};

export const mapClassesSummary = mapClasses;
export const calculateHitPointsSummary = calculateHitPoints;
export const mapAbilityScoresSummary = mapAbilityScores;
export const calculateInitiativeSummary = calculateInitiative;
