const RAW_STATUS_CONDITIONS = [
        { id: 1, name: "Blinded" },
        { id: 2, name: "Charmed" },
        { id: 3, name: "Deafened" },
        { id: 4, name: "Exhaustion" },
        { id: 5, name: "Frightened" },
        { id: 6, name: "Grappled" },
        { id: 7, name: "Incapacitated" },
        { id: 8, name: "Invisible" },
        { id: 9, name: "Paralyzed" },
        { id: 10, name: "Petrified" },
        { id: 11, name: "Poisoned" },
        { id: 12, name: "Prone" },
        { id: 13, name: "Restrained" },
        { id: 14, name: "Stunned" },
        { id: 15, name: "Unconscious" },
];

const normalizeConditionValue = (name) =>
        typeof name === "string"
                ? name
                          .toLowerCase()
                          .trim()
                          .replace(/[^a-z0-9]+/g, "")
                : "";

export const STATUS_CONDITIONS = RAW_STATUS_CONDITIONS.map((condition) => ({
        ...condition,
        value: normalizeConditionValue(condition.name),
}));

export const STATUS_CONDITION_OPTIONS = STATUS_CONDITIONS.map((condition) => ({
        value: condition.value,
        label: condition.name,
}));

export const STATUS_CONDITIONS_BY_ID = new Map(
        STATUS_CONDITIONS.map((condition) => [condition.id, condition])
);

export const STATUS_CONDITIONS_BY_VALUE = new Map(
        STATUS_CONDITIONS.map((condition) => [condition.value, condition])
);

export const EXHAUSTION_CONDITION_ID = 4;
export const EXHAUSTION_CONDITION_VALUE = normalizeConditionValue("Exhaustion");

const sanitizeConditionId = (input) => {
        const numeric = Number(input);
        return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
};

const sanitizeConditionLevel = (input) => {
        const numeric = Number(input);
        if (!Number.isFinite(numeric) || numeric < 0) {
                return null;
        }

        const truncated = Math.trunc(numeric);
        return truncated >= 0 ? truncated : null;
};

export const mapCharacterConditions = (characterConditions) => {
        if (!Array.isArray(characterConditions)) {
                return [];
        }

        const mapped = [];
        const seenKeys = new Set();

        for (const entry of characterConditions) {
                if (entry == null) {
                        continue;
                }

                const idCandidates = [];
                if (typeof entry === "object") {
                        idCandidates.push(
                                entry.id,
                                entry.conditionId,
                                entry.definitionId,
                                entry.conditionDefinitionId,
                                entry?.definition?.id
                        );
                } else {
                        idCandidates.push(entry);
                }

                const conditionId = idCandidates
                        .map(sanitizeConditionId)
                        .find((value) => value !== null);

                if (!conditionId) {
                        continue;
                }

                const definition = STATUS_CONDITIONS_BY_ID.get(conditionId);
                if (!definition) {
                        continue;
                }

                let level = null;
                if (definition.id === EXHAUSTION_CONDITION_ID && typeof entry === "object") {
                        const levelCandidates = [
                                entry.level,
                                entry.value,
                                entry.modifier,
                                entry.conditionLevel,
                                entry?.definition?.level,
                        ];

                        const potentialLevel = levelCandidates
                                .map(sanitizeConditionLevel)
                                .find((value) => value !== null);

                        if (potentialLevel !== undefined && potentialLevel !== null) {
                                level = potentialLevel;
                        }
                }

                const key = `${definition.value}:${level ?? ""}`;
                if (seenKeys.has(key)) {
                        continue;
                }
                seenKeys.add(key);

                mapped.push({
                        id: definition.id,
                        value: definition.value,
                        name: definition.name,
                        level,
                });
        }

        return mapped;
};
