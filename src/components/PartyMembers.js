import styles from "@/styles/Home.module.css";
import {
	formatInitiativeDisplay,
	formatManualPartyHitPoints,
} from "@/lib/combatFormatting";
import { isValidInitiativeInput } from "@/lib/initiativeValidation";

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
					{partyMembers.map((member) => (
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
								{member.source === "dndbeyond" && (
									<details className={styles.statsDropdown}>
										<summary className={styles.dropdownSummary}>
											View Stats
										</summary>
										<div className={styles.statsContent}>
											{Array.isArray(member.abilityScores) &&
												member.abilityScores.length > 0 && (
													<div>
														<h4 className={styles.statsHeading}>
															Ability Scores
														</h4>
														<ul className={styles.abilityGrid}>
															{member.abilityScores.map((ability) => (
																<li
																	key={ability.id}
																	className={styles.abilityCell}>
																	<div className={styles.abilityNameGroup}>
																		<span className={styles.abilityName}>
																			{ability.name || "Ability"}
																		</span>
																	</div>
																	<div className={styles.abilityScoreGroup}>
																		<span className={styles.abilityScore}>
																			{Number.isFinite(ability.total)
																				? ability.total
																				: Number.isFinite(ability.score)
																				? ability.score
																				: "--"}
																		</span>
																	</div>
																</li>
															))}
														</ul>
													</div>
												)}
										</div>
									</details>
								)}
							</div>
						</li>
					))}
				</ul>
			)}
			{partyMembers.length > 0 ? <hr className={styles.lineBreak} /> : <></>}
			<div className={styles.importBox}>
				<h3>Import from D&amp;D Beyond</h3>
				<p className={styles.helperText}>
					Paste a shareable character link or ID or a campaign link to import
					their stats and current hit points. Enter initiative manually after
					importing.
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
						<button
							type='button'
							className={styles.secondaryButton}
							onClick={handleDndBeyondCampaignImport}
							disabled={isImportingDndBeyond || !dndBeyondIdentifier.trim()}>
							{isImportingDndBeyond ? "Importing..." : "Import Campaign"}
						</button>
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
