import {
	DndBeyondApiError,
	extractCharacterId,
	fetchCharacterFromDndBeyond,
} from "@/lib/dndbeyond";

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
		const character = await fetchCharacterFromDndBeyond(characterId);
		return response.status(200).json(character);
	} catch (error) {
		if (error instanceof DndBeyondApiError) {
			console.error("D&D Beyond import failed", {
				characterId,
				status: error.status,
				message: error.message,
				details: error.details,
				upstreamErrorCode: error.upstreamErrorCode,
				stack: error.stack,
			});

			const errorBody = { error: error.message };
			if (error.details) {
				errorBody.details = error.details;
			}
			if (error.upstreamErrorCode) {
				errorBody.upstreamErrorCode = error.upstreamErrorCode;
			}

			return response.status(error.status).json(errorBody);
		}

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
