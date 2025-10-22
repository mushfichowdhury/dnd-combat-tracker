const DEXTERITY_STAT_ID = 2;

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
    const idFromPath = url.pathname.match(/\/(?:characters?|character)\/(\d+)/i);
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

const calculateDexterityModifier = (character) => {
  if (!character) {
    return 0;
  }

  const override = Array.isArray(character.overrideStats)
    ? character.overrideStats.find((stat) => stat?.id === DEXTERITY_STAT_ID)
    : null;
  const base = Array.isArray(character.stats)
    ? character.stats.find((stat) => stat?.id === DEXTERITY_STAT_ID)
    : null;

  const dexterityScore = Number(
    override?.value ?? base?.value ?? character.dexterity ?? 10,
  );

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
          0,
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
      },
    );

    if (!upstreamResponse.ok) {
      let errorDetails = null;
      try {
        errorDetails = await upstreamResponse.text();
      } catch (readError) {
        errorDetails = `Failed to read response body: ${readError?.message ?? readError}`;
      }

      console.error("D&D Beyond import failed: upstream error", {
        characterId,
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        errorDetails,
      });

      let errorMessage = "Failed to fetch character from D&D Beyond.";
      if (upstreamResponse.status === 404) {
        errorMessage =
          "Character not found on D&D Beyond. Ensure it is shared or the ID is correct.";
      }

      return response
        .status(upstreamResponse.status)
        .json({ error: errorMessage });
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
        error: "Received malformed data from D&D Beyond while importing the character.",
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

    return response.status(200).json({
      id: characterId,
      name: character.name,
      initiative,
      classes,
      level,
      playerName: character.preferences?.playerName ?? null,
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
