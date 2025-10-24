import styles from "@/styles/Home.module.css";
import {
	ABILITY_SCORE_CONFIG,
	formatAbilityScoreDisplay,
} from "@/lib/combatFormatting";
import { isValidInitiativeInput } from "@/lib/initiativeValidation";

const Enemies = ({
	enemyForm,
	setEnemyForm,
	handleEnemySubmit,
	monsterSearch,
	setMonsterSearch,
	shouldShowMonsterDropdown,
	isSearchingMonsters,
	monsterSearchError,
	monsterResults,
	monsterSearchTerm,
	handleMonsterSelect,
	handleEnemyAbilityScoreChange,
	handleEnemyActionChange,
	handleRemoveEnemyAction,
	handleAddEnemyAction,
	enemies,
	removeEnemy,
}) => {
	return (
		<section className={styles.section}>
			<h2>Enemies</h2>
			<p className={styles.sectionDescription}>
				Capture statblocks, attacks, and initiatives for the creatures your
				party faces.
			</p>
			{enemies.length > 0 && (
				<ul className={styles.cardList}>
					{enemies.map((enemy) => {
						const abilityScores =
							enemy.abilityScores ?? enemy.ability_scores ?? {};
						const hasAbilityScores = ABILITY_SCORE_CONFIG.some(({ key }) => {
							const value = abilityScores?.[key];
							if (typeof value === "string") {
								return value.trim() !== "";
							}
							return value !== undefined && value !== null;
						});
						const actions = Array.isArray(enemy.actions) ? enemy.actions : [];
						const formattedActions = actions
							.map((action, index) => {
								if (!action) {
									return null;
								}
								const name =
									typeof action.name === "string" ? action.name.trim() : "";
								const description =
									typeof action.description === "string"
										? action.description.trim()
										: "";
								if (!name && !description) {
									return null;
								}
								return {
									key: `${enemy.id}-action-${index}`,
									name,
									description,
								};
							})
							.filter(Boolean);
						const speed =
							typeof enemy.speed === "string" ? enemy.speed.trim() : "";
						return (
							<li key={enemy.id} className={styles.card}>
								<div className={styles.cardHeader}>
									<h3>{enemy.name}</h3>
									<p className={styles.statLine}>
										Initiative: <strong>{enemy.initiative}</strong>
									</p>
								</div>
								<div className={styles.statBlock}>
									{enemy.armorClass && (
										<p>
											<span>AC:</span> {enemy.armorClass}
										</p>
									)}
									{enemy.hitPoints && (
										<p>
											<span>HP:</span> {enemy.hitPoints}
										</p>
									)}
									{speed && (
										<p>
											<span>Speed:</span> {speed}
										</p>
									)}
									{hasAbilityScores && (
										<div>
											<span>Ability Scores</span>
											<div className={styles.abilityScoreList}>
												{ABILITY_SCORE_CONFIG.map(({ key, label }) => {
													const formattedScore = formatAbilityScoreDisplay(
														abilityScores?.[key]
													);
													return (
														<div
															key={`${enemy.id}-${key}`}
															className={styles.abilityScoreListItem}>
															<span>{label}</span>
															<strong>{formattedScore ?? "--"}</strong>
														</div>
													);
												})}
											</div>
										</div>
									)}
									{formattedActions.length > 0 && (
										<div className={styles.attackList}>
											<h4>Actions</h4>
											<ul>
												{formattedActions.map((action) => (
													<li key={action.key}>
														{action.name && <strong>{action.name}</strong>}
														{action.description && <p>{action.description}</p>}
													</li>
												))}
											</ul>
										</div>
									)}
									{enemy.notes && <p className={styles.notes}>{enemy.notes}</p>}
								</div>
								<button
									type='button'
									className={styles.removeButton}
									onClick={() => removeEnemy(enemy.id)}>
									Remove
								</button>
							</li>
						);
					})}
				</ul>
			)}
			{enemies.length > 0 ? <hr className={styles.lineBreak} /> : <></>}
			<form onSubmit={handleEnemySubmit} className={styles.form}>
				<div className={styles.monsterSearchContainer}>
					<label className={styles.inputGroup}>
						<span>Search Monsters</span>
						<input
							type='text'
							value={monsterSearch}
							onChange={(event) => setMonsterSearch(event.target.value)}
							placeholder='Start typing to search Open5e monsters...'
							autoComplete='off'
						/>
					</label>
					{shouldShowMonsterDropdown && (
						<div className={styles.monsterSearchDropdown}>
							{isSearchingMonsters && (
								<p className={styles.monsterSearchMessage}>
									Searching monsters...
								</p>
							)}
							{!isSearchingMonsters && monsterSearchError && (
								<p
									className={`${styles.monsterSearchMessage} ${styles.monsterSearchError}`}>
									{monsterSearchError}
								</p>
							)}
							{!isSearchingMonsters &&
								!monsterSearchError &&
								monsterResults.length === 0 &&
								monsterSearchTerm.length >= 2 && (
									<p className={styles.monsterSearchMessage}>
										No monsters found.
									</p>
								)}
							{!isSearchingMonsters && monsterResults.length > 0 && (
								<ul className={styles.monsterSearchResults}>
									{monsterResults.map((monster, index) => {
										const key =
											monster.slug ??
											(monster.name
												? `${monster.name}-${index}`
												: `monster-${index}`);

										const typeParts = [monster.size, monster.type]
											.filter(
												(part) => typeof part === "string" && part.trim() !== ""
											)
											.map((part) => part.trim());

										const challengeRating =
											monster.challenge_rating !== undefined &&
											monster.challenge_rating !== null
												? `CR ${monster.challenge_rating}`
												: "";

										const meta = [typeParts.join(" "), challengeRating]
											.filter((part) => part)
											.join(" • ");

										return (
											<li key={key}>
												<button
													type='button'
													className={styles.monsterResultButton}
													onClick={() => handleMonsterSelect(monster)}>
													<span className={styles.monsterResultName}>
														{monster.name || "Unnamed monster"}
													</span>
													{meta && (
														<span className={styles.monsterResultMeta}>
															{meta}
														</span>
													)}
												</button>
											</li>
										);
									})}
								</ul>
							)}
						</div>
					)}
				</div>
				<div className={styles.formGrid}>
					<label className={styles.inputGroup}>
						<span>Creature Name</span>
						<input
							type='text'
							value={enemyForm.name}
							onChange={(event) =>
								setEnemyForm((prev) => ({
									...prev,
									name: event.target.value,
								}))
							}
							placeholder='e.g. Goblin Shaman'
							required
						/>
					</label>
					<label className={styles.inputGroup}>
						<span>Initiative</span>
						<input
							type='number'
							inputMode='numeric'
							value={enemyForm.initiative}
							onChange={(event) => {
								const { value } = event.target;

								if (!isValidInitiativeInput(value)) {
									return;
								}

								setEnemyForm((prev) => ({
									...prev,
									initiative: value,
								}));
							}}
							placeholder='e.g. 14'
							required
						/>
					</label>
					<label className={styles.inputGroup}>
						<span>Armor Class</span>
						<input
							type='text'
							value={enemyForm.armorClass}
							onChange={(event) =>
								setEnemyForm((prev) => ({
									...prev,
									armorClass: event.target.value,
								}))
							}
							placeholder='e.g. 15 (leather armor)'
						/>
					</label>
					<label className={styles.inputGroup}>
						<span>Hit Points</span>
						<input
							type='text'
							value={enemyForm.hitPoints}
							onChange={(event) =>
								setEnemyForm((prev) => ({
									...prev,
									hitPoints: event.target.value,
								}))
							}
							placeholder='e.g. 36 (8d8)'
						/>
					</label>
					<label className={styles.inputGroup}>
						<span>Speed</span>
						<input
							type='text'
							value={enemyForm.speed}
							onChange={(event) =>
								setEnemyForm((prev) => ({
									...prev,
									speed: event.target.value,
								}))
							}
							placeholder='e.g. 30 ft., climb 20 ft.'
						/>
					</label>
				</div>
				<fieldset className={styles.fieldset}>
					<legend>Ability Scores</legend>
					<div className={styles.abilityScoreFields}>
						{ABILITY_SCORE_CONFIG.map(({ key, label }) => (
							<label key={key} className={styles.inputGroup}>
								<span>{label}</span>
								<input
									type='number'
									value={enemyForm.abilityScores?.[key] ?? ""}
									onChange={(event) =>
										handleEnemyAbilityScoreChange(key, event.target.value)
									}
									placeholder='--'
								/>
							</label>
						))}
					</div>
				</fieldset>
				<fieldset className={styles.fieldset}>
					<legend>Actions</legend>
					<div className={styles.actionList}>
						{enemyForm.actions.map((action, index) => {
							const canRemoveAction = enemyForm.actions.length > 1;

							return (
								<div
									key={`enemy-action-${index}`}
									className={styles.actionItem}>
									<label className={styles.inputGroup}>
										<span>Action Name</span>
										<input
											type='text'
											value={action.name}
											onChange={(event) =>
												handleEnemyActionChange(
													index,
													"name",
													event.target.value
												)
											}
											placeholder='e.g. Scimitar'
										/>
									</label>
									<label className={styles.inputGroup}>
										<span>Description</span>
										<textarea
											rows={3}
											value={action.description}
											onChange={(event) =>
												handleEnemyActionChange(
													index,
													"description",
													event.target.value
												)
											}
											placeholder='Attack bonus, reach, and damage.'
										/>
									</label>
									<button
										type='button'
										className={styles.secondaryButton}
										onClick={() => handleRemoveEnemyAction(index)}
										disabled={!canRemoveAction}>
										Remove Action
									</button>
								</div>
							);
						})}
					</div>
					<div className={styles.actionFooter}>
						<button
							type='button'
							className={styles.secondaryButton}
							onClick={handleAddEnemyAction}>
							Add Action
						</button>
					</div>
				</fieldset>
				<fieldset className={styles.fieldset}>
					<legend>Notes</legend>
					<label className={styles.inputGroup}>
						<textarea
							rows={10}
							value={enemyForm.notes}
							onChange={(event) =>
								setEnemyForm((prev) => ({
									...prev,
									notes: event.target.value,
								}))
							}
							placeholder='Legendary resistances, vulnerabilities, or tactics.'
						/>
					</label>
				</fieldset>

				<button type='submit' className={styles.primaryButton}>
					Add Enemy
				</button>
			</form>
		</section>
	);
};

export default Enemies;
