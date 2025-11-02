const MAX_RANK_VALUE = Number.MAX_SAFE_INTEGER;

const normalizeSearchValue = (value) => {
        if (typeof value !== "string") {
                return "";
        }

        return value.trim().toLowerCase();
};

const getMonsterSortMetadata = (monster, normalizedQuery, originalIndex) => {
        const normalizedName = normalizeSearchValue(monster?.name);
        const normalizedSlug = normalizeSearchValue(monster?.slug);
        const nameWords = normalizedName.split(/\s+/).filter(Boolean);

        let priority = 7;

        if (normalizedName && normalizedName === normalizedQuery) {
                priority = 0;
        } else if (normalizedQuery && normalizedName.startsWith(normalizedQuery)) {
                priority = 1;
        } else if (normalizedQuery && nameWords.includes(normalizedQuery)) {
                priority = 2;
        } else if (
                normalizedQuery &&
                nameWords.some((word) => word.startsWith(normalizedQuery))
        ) {
                priority = 3;
        } else if (normalizedQuery && normalizedName.includes(normalizedQuery)) {
                priority = 4;
        } else if (normalizedQuery && normalizedSlug.startsWith(normalizedQuery)) {
                priority = 5;
        } else if (normalizedQuery && normalizedSlug.includes(normalizedQuery)) {
                priority = 6;
        }

        const namePosition = normalizedQuery
                ? normalizedName.indexOf(normalizedQuery)
                : -1;
        const slugPosition = normalizedQuery
                ? normalizedSlug.indexOf(normalizedQuery)
                : -1;

        const position = namePosition >= 0
                ? namePosition
                : slugPosition >= 0
                ? slugPosition
                : MAX_RANK_VALUE;

        const length = normalizedName ? normalizedName.length : MAX_RANK_VALUE;
        const alphabeticalKey = normalizedName || normalizedSlug || "";

        return {
                priority,
                position,
                length,
                alphabeticalKey,
                originalIndex,
        };
};

export default async function handler(request, response) {
	if (request.method !== "GET") {
		response.setHeader("Allow", ["GET"]);
		return response.status(405).json({ error: "Method not allowed." });
	}

	const query = request.query?.query;
	if (typeof query !== "string" || query.trim().length === 0) {
		console.error("Monster search failed: missing query parameter", {
			hasQuery: Boolean(request.query?.query),
			queryType: typeof request.query?.query,
		});
		return response
			.status(400)
			.json({ error: "Provide a non-empty search query." });
	}

        const trimmedQuery = query.trim();
        const normalizedQuery = normalizeSearchValue(trimmedQuery);

	const searchParams = new URLSearchParams({
		name__icontains: trimmedQuery,
		limit: "30",
	});

	const url = `https://api.open5e.com/monsters/?${searchParams.toString()}`;

	try {
		const upstreamResponse = await fetch(url);
		if (!upstreamResponse.ok) {
			console.error("Monster search failed: upstream responded with error", {
				status: upstreamResponse.status,
				statusText: upstreamResponse.statusText,
				url,
			});
			return response
				.status(upstreamResponse.status)
				.json({ error: "Failed to fetch monsters from Open5e." });
		}

                const data = await upstreamResponse.json();
                const results = Array.isArray(data.results) ? data.results : [];

                const rankedResults = results
                        .map((monster, index) => ({
                                monster,
                                ...getMonsterSortMetadata(monster, normalizedQuery, index),
                        }))
                        .sort((a, b) => {
                                if (a.priority !== b.priority) {
                                        return a.priority - b.priority;
                                }

                                if (a.position !== b.position) {
                                        return a.position - b.position;
                                }

                                if (a.length !== b.length) {
                                        return a.length - b.length;
                                }

                                if (a.alphabeticalKey !== b.alphabeticalKey) {
                                        return a.alphabeticalKey.localeCompare(b.alphabeticalKey);
                                }

                                return a.originalIndex - b.originalIndex;
                        });

                const monsters = rankedResults.map(({ monster }) => ({
                        slug: monster.slug,
                        name: monster.name,
                        size: monster.size,
			type: monster.type,
			alignment: monster.alignment,
			challenge_rating: monster.challenge_rating,
			armor_class: monster.armor_class,
			hit_points: monster.hit_points,
			speed: monster.speed,
			ability_scores: {
				strength: monster.strength,
				dexterity: monster.dexterity,
				constitution: monster.constitution,
				intelligence: monster.intelligence,
				wisdom: monster.wisdom,
				charisma: monster.charisma,
			},
			actions: Array.isArray(monster.actions)
				? monster.actions.map((action) => ({
						name: action.name,
						desc: action.desc,
				  }))
				: monster.actions,
		}));

		return response.status(200).json({ monsters });
	} catch (error) {
		console.error("Monster search failed: unexpected exception", {
			message: error?.message ?? String(error),
			stack: error?.stack,
			url,
		});
		return response
			.status(500)
			.json({ error: "An unexpected error occurred while fetching monsters." });
	}
}
