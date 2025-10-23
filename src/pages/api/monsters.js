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

        const searchParams = new URLSearchParams({
                search: query,
                limit: "10",
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

                const monsters = results.map((monster) => ({
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
