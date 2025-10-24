import styles from "@/styles/Home.module.css";
import {
	ABILITY_SCORE_CONFIG,
	formatAbilityScoreDisplay,
	formatInitiativeDisplay,
	formatManualPartyHitPoints,
} from "@/lib/combatFormatting";
import { isValidInitiativeInput } from "@/lib/initiativeValidation";

const ABILITY_LABEL_LOOKUP = ABILITY_SCORE_CONFIG.reduce(
	(accumulator, { key, label }, index) => {
		accumulator[key] = label;
		accumulator[label.toLowerCase()] = label;
		const abilityId = index + 1;
		accumulator[abilityId] = label;
		accumulator[String(abilityId)] = label;
		return accumulator;
	},
	{}
);

const renderAbilityScores = (member) => {
	if (
		!member ||
		!Array.isArray(member.abilityScores) ||
		member.abilityScores.length === 0
	) {
		return null;
	}

	const items = member.abilityScores
		.map((ability, index) => {
			const abilityName =
				typeof ability?.name === "string" && ability.name.trim()
					? ability.name.trim()
					: "Ability";
			const normalizedAbilityName = abilityName.toLowerCase();
			const abilityKey =
				typeof ability?.key === "string" && ability.key.trim()
					? ability.key.trim().toLowerCase()
					: null;
			const abilityLabel =
				ABILITY_LABEL_LOOKUP[abilityKey] ??
				ABILITY_LABEL_LOOKUP[normalizedAbilityName] ??
				abilityName;

			const rawScore =
				ability?.score ??
				ability?.total ??
				ability?.value ??
				ability?.base ??
				null;

			let formattedScore = formatAbilityScoreDisplay(rawScore);

			if (
				!formattedScore &&
				typeof rawScore === "number" &&
				Number.isFinite(rawScore)
			) {
				formattedScore = String(rawScore);
			}

			if (!formattedScore && Number.isFinite(ability?.modifier)) {
				const sign = ability.modifier >= 0 ? "+" : "";
				formattedScore = `${sign}${ability.modifier}`;
			}

			if (!formattedScore && typeof rawScore === "string") {
				const trimmed = rawScore.trim();

				if (trimmed) {
					formattedScore = trimmed;
				}
			}

			if (!formattedScore) {
				return null;
			}

			return (
				<div
					key={ability?.id ?? `${member.id ?? "member"}-ability-${index}`}
					className={styles.abilityScoreListItem}>
					<span>{abilityLabel}</span>
					<strong>{formattedScore}</strong>
				</div>
			);
		})
		.filter(Boolean);

	if (items.length === 0) {
		return null;
	}

	return (
		<div>
			<span>Ability Scores</span>
			<div className={styles.abilityScoreList}>{items}</div>
		</div>
	);
};

const PartyMembers = ({
	partyMembers,
	partyForm,
	setPartyForm,
	handlePartySubmit,
	handleDndBeyondImport,
	handleDndBeyondCampaignImport,
	dndBeyondIdentifier,
	setDndBeyondIdentifier,
	dndBeyondNotice,
	dndBeyondError,
	isImportingDndBeyond,
	removePartyMember,
	handleImportedInitiativeChange,
}) => {
	return (
		<section className={styles.section}>
			<h2>Party Members</h2>
			<p className={styles.sectionDescription}>
				Add each adventurer and their initiative roll.
			</p>
			{partyMembers.length > 0 && (
				<ul className={styles.cardList}>
					{partyMembers.map((member) => {
						const abilityScoresContent = renderAbilityScores(member);

						return (
							<li key={member.id} className={styles.card}>
								<div>
									<div className={styles.cardBrow}>
										<div className={styles.cardBrow2}>
											<h3>{member.name}</h3>
										</div>
										<button
											type='button'
											className={styles.removeButton}
											onClick={() => removePartyMember(member.id)}>
											Remove
										</button>
									</div>
									{member.classSummary && (
										<p className={styles.statLine}>
											Class: <strong>{member.classSummary}</strong>
										</p>
									)}
									{typeof member.level === "number" && member.level > 0 && (
										<p className={styles.statLine}>
											Level: <strong>{member.level}</strong>
										</p>
									)}
									{member.source === "dndbeyond" && (
										<span className={styles.sourceTag}>D&amp;D Beyond</span>
									)}
									{member.playerName && (
										<p className={styles.statLine}>
											Player: <strong>{member.playerName}</strong>
										</p>
									)}
									{member.source !== "dndbeyond" && member.hitPoints && (
										<p className={styles.statLine}>
											Hit Points:{" "}
											<strong>
												{formatManualPartyHitPoints(member.hitPoints)}
											</strong>
										</p>
									)}
									{member.source === "dndbeyond" ? (
										<label
											className={`${styles.inputGroup} ${styles.initiativeEditor}`}>
											<input
												type='number'
												inputMode='numeric'
												className={styles.initiativeInput}
												value={member.initiative ?? ""}
												onChange={(event) => {
													const { value } = event.target;

													if (!isValidInitiativeInput(value)) {
														return;
													}

													handleImportedInitiativeChange(member.id, value);
												}}
												placeholder='Enter initiative'
											/>
										</label>
									) : (
										<p className={styles.statLine}>
											Initiative:{" "}
											<strong>
												{formatInitiativeDisplay(member.initiative)}
											</strong>
										</p>
									)}
									{member.source === "dndbeyond" && abilityScoresContent && (
										<details className={styles.enemyDetails}>
											<summary>View Stats</summary>
											<div className={styles.statBlock}>
												{abilityScoresContent}
											</div>
										</details>
									)}
								</div>
							</li>
						);
					})}
				</ul>
			)}
			{partyMembers.length > 0 ? <hr className={styles.lineBreak} /> : <></>}
			<div className={styles.importBox}>
				<h3>Import from D&amp;D Beyond</h3>
				<p className={styles.helperText}>
					Paste a shareable character link or ID to import their stats and
					current hit points. Enter initiative manually after importing.
				</p>
				<form onSubmit={handleDndBeyondImport} className={styles.importForm}>
					<label className={styles.inputGroup} style={{ width: "100%" }}>
						<input
							type='text'
							value={dndBeyondIdentifier}
							onChange={(event) => setDndBeyondIdentifier(event.target.value)}
							placeholder='https://www.dndbeyond.com/characters/12345678'
						/>
					</label>
					{dndBeyondNotice && (
						<p className={styles.infoMessage}>{dndBeyondNotice}</p>
					)}
					{dndBeyondError && (
						<p className={styles.errorMessage}>{dndBeyondError}</p>
					)}
					<div className={styles.importActions}>
						<button
							type='submit'
							className={styles.secondaryButton}
							disabled={isImportingDndBeyond || !dndBeyondIdentifier.trim()}>
							{isImportingDndBeyond ? "Importing..." : "Import Character"}
						</button>
						{/* <button
							type='button'
							className={styles.secondaryButton}
							onClick={handleDndBeyondCampaignImport}
							disabled={isImportingDndBeyond || !dndBeyondIdentifier.trim()}>
							{isImportingDndBeyond ? "Importing..." : "Import Campaign"}
						</button> */}
					</div>
				</form>
			</div>
			<h3 className={styles.elipsesBreak}>. . .</h3>
			<p className={styles.sectionDescription}>
				No D&D Beyond character? No problem. Add a custom player or NPC here.
			</p>
			<form onSubmit={handlePartySubmit} className={styles.form}>
				<div className={styles.formGrid}>
					<label className={styles.inputGroup}>
						<span>Character Name</span>
						<input
							type='text'
							value={partyForm.name}
							onChange={(event) =>
								setPartyForm((prev) => ({
									...prev,
									name: event.target.value,
								}))
							}
							placeholder='e.g. Lyra the Swift'
							required
						/>
					</label>
					<label className={styles.inputGroup}>
						<span>Current HP</span>
						<input
							type='number'
							value={partyForm.hitPointsCurrent}
							onChange={(event) =>
								setPartyForm((prev) => ({
									...prev,
									hitPointsCurrent: event.target.value,
								}))
							}
							placeholder='e.g. 32'
						/>
					</label>
					<label className={styles.inputGroup}>
						<span>Total HP</span>
						<input
							type='number'
							value={partyForm.hitPointsTotal}
							onChange={(event) =>
								setPartyForm((prev) => ({
									...prev,
									hitPointsTotal: event.target.value,
								}))
							}
							placeholder='e.g. 40'
						/>
					</label>
					<label className={styles.inputGroup}>
						<span>Initiative</span>
						<input
							type='number'
							inputMode='numeric'
							value={partyForm.initiative}
							onChange={(event) => {
								const { value } = event.target;

								if (!isValidInitiativeInput(value)) {
									return;
								}

								setPartyForm((prev) => ({
									...prev,
									initiative: value,
								}));
							}}
							placeholder='e.g. 17'
							required
						/>
					</label>
				</div>
				<button type='submit' className={styles.primaryButton}>
					Add Party Member
				</button>
			</form>
		</section>
	);
};

export default PartyMembers;
