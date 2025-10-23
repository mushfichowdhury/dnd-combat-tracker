export const ENEMY_NOTE_PREVIEW_LENGTH = 140;

export const ABILITY_SCORE_CONFIG = [
	{ key: "strength", label: "STR" },
	{ key: "dexterity", label: "DEX" },
	{ key: "constitution", label: "CON" },
	{ key: "intelligence", label: "INT" },
	{ key: "wisdom", label: "WIS" },
	{ key: "charisma", label: "CHA" },
];

export const formatInitiativeDisplay = (value) => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string" && value.trim() !== "") {
		return value.trim();
	}

	return "--";
};

export const formatManualPartyHitPoints = (hitPoints) => {
	if (!hitPoints) {
		return "";
	}

	if (typeof hitPoints === "object" && hitPoints !== null) {
		const current = hitPoints.current ?? hitPoints.value ?? hitPoints;
		const max = hitPoints.max ?? hitPoints.total ?? hitPoints.maximum;

		if (current === undefined || current === null || current === "") {
			return "";
		}

		const currentString = String(current);

		if (max === undefined || max === null || max === "") {
			return currentString;
		}

		return `${currentString} / ${String(max)}`;
	}

	return String(hitPoints);
};

export const formatAbilityScoreDisplay = (value) => {
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
