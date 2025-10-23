import {
        DndBeyondApiError,
        extractCampaignId,
        fetchCampaignCharacters,
        fetchCharacterFromDndBeyond,
} from "@/lib/dndbeyond";

const formatCampaignCharacterLabel = (character) => {
        if (!character) {
                return "character";
        }

        if (character.name && character.id) {
                return `${character.name} (${character.id})`;
        }

        if (character.name) {
                return character.name;
        }

        if (character.id) {
                return `character ${character.id}`;
        }

        return "character";
};

export default async function handler(request, response) {
        if (request.method !== "POST") {
                response.setHeader("Allow", ["POST"]);
                return response.status(405).json({ error: "Method not allowed." });
        }

        const identifier = request.body?.identifier;
        if (typeof identifier !== "string" || identifier.trim().length === 0) {
                console.error("D&D Beyond campaign import failed: missing identifier", {
                        bodyType: typeof request.body,
                        hasIdentifier: Boolean(request.body?.identifier),
                });
                return response
                        .status(400)
                        .json({ error: "Provide a D&D Beyond campaign URL or ID." });
        }

        const campaignId = extractCampaignId(identifier);
        if (!campaignId) {
                console.error("D&D Beyond campaign import failed: could not parse identifier", {
                        identifier,
                });
                return response
                        .status(400)
                        .json({ error: "Unable to determine a campaign ID from the input." });
        }

        try {
                const campaign = await fetchCampaignCharacters(campaignId);

                if (!campaign.characters || campaign.characters.length === 0) {
                        console.error("D&D Beyond campaign import failed: no characters", {
                                campaignId,
                        });
                        return response.status(404).json({
                                error: "No characters were available to import from that campaign.",
                        });
                }

                const uniqueCharacters = [];
                const seenIds = new Set();
                for (const character of campaign.characters) {
                        if (!character?.id || seenIds.has(character.id)) {
                                continue;
                        }
                        seenIds.add(character.id);
                        uniqueCharacters.push(character);
                }

                const importedCharacters = [];
                for (const character of uniqueCharacters) {
                        try {
                                const result = await fetchCharacterFromDndBeyond(character.id);
                                importedCharacters.push(result);
                        } catch (error) {
                                if (error instanceof DndBeyondApiError) {
                                        console.error("D&D Beyond campaign import failed for character", {
                                                campaignId,
                                                character: character.id,
                                                status: error.status,
                                                message: error.message,
                                                details: error.details,
                                                upstreamErrorCode: error.upstreamErrorCode,
                                                stack: error.stack,
                                        });

                                        const label = formatCampaignCharacterLabel(character);
                                        const errorBody = {
                                                error: `Failed to import ${label}: ${error.message}`,
                                        };
                                        if (error.details) {
                                                errorBody.details = error.details;
                                        }
                                        if (error.upstreamErrorCode) {
                                                errorBody.upstreamErrorCode = error.upstreamErrorCode;
                                        }

                                        return response.status(error.status).json(errorBody);
                                }

                                console.error(
                                        "D&D Beyond campaign import failed for character: unexpected exception",
                                        {
                                                campaignId,
                                                character: character.id,
                                                message: error?.message ?? String(error),
                                                stack: error?.stack,
                                        }
                                );
                                const label = formatCampaignCharacterLabel(character);
                                return response.status(500).json({
                                        error: `Failed to import ${label} due to an unexpected error.`,
                                });
                        }
                }

                return response.status(200).json({
                        campaignName: campaign.campaignName,
                        characters: importedCharacters,
                });
        } catch (error) {
                if (error instanceof DndBeyondApiError) {
                        console.error("D&D Beyond campaign import failed", {
                                campaignId,
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

                console.error("D&D Beyond campaign import failed: unexpected exception", {
                        campaignId,
                        message: error?.message ?? String(error),
                        stack: error?.stack,
                });
                return response
                        .status(500)
                        .json({ error: "An unexpected error occurred while importing the campaign." });
        }
}
