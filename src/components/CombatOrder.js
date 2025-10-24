import { useState } from "react";

import styles from "@/styles/Home.module.css";
import { formatInitiativeDisplay } from "@/lib/combatFormatting";
import { STATUS_CONDITION_OPTIONS } from "@/lib/statusConditions";

const BASE_STATUS_OPTIONS = [
        { value: "none", label: "Status / Concentration" },
        { value: "concentrating", label: "Concentrating" },
        { value: "custom", label: "Custom" },
];

const STATUS_OPTIONS = [...BASE_STATUS_OPTIONS, ...STATUS_CONDITION_OPTIONS];

const STATUS_LABELS = STATUS_OPTIONS.reduce((accumulator, option) => {
	accumulator[option.value] = option.label;
	return accumulator;
}, {});

const CombatOrder = ({
	combatOrder,
	highlightedIndex,
	advanceTurn,
	resetTurn,
	refreshDndBeyondHitPoints,
	isRefreshingDndBeyondHp,
	hasDndBeyondMembers,
	dndBeyondRefreshError,
	handleManualPartyHitPointsChange,
	handleManualPartyDamageInputChange,
	partyDamageInputs,
	applyManualPartyDamage,
	handleEnemyHitPointsChange,
	handleEnemyDamageInputChange,
	enemyDamageInputs,
	applyEnemyDamage,
	combatStatuses,
	handleCombatStatusChange,
	roundCounter,
	concentrationReminder,
	dismissConcentrationReminder,
}) => {
	const [statusEditState, setStatusEditState] = useState({});

	return (
		<section className={styles.section}>
			<h2>Combat Order</h2>
			<p className={styles.sectionDescription}>
				Automatically sorted by initiative. Advance turns as combat progresses.
			</p>
			{combatOrder.length > 0 ? (
				<div className={styles.roundTracker}>Round {roundCounter}</div>
			) : null}
			<div className={styles.combatControls}>
				<button
					type='button'
					className={styles.primaryButton}
					onClick={advanceTurn}
					disabled={combatOrder.length === 0}>
					Next Turn
				</button>
				<button
					type='button'
					className={styles.secondaryButton}
					onClick={resetTurn}
					disabled={combatOrder.length === 0}>
					Reset to Top
				</button>
				<button
					type='button'
					className={styles.secondaryButton}
					onClick={refreshDndBeyondHitPoints}
					disabled={
						isRefreshingDndBeyondHp ||
						!hasDndBeyondMembers ||
						combatOrder.length === 0
					}>
					{isRefreshingDndBeyondHp ? "Refreshing HP..." : "Refresh HP"}
				</button>
			</div>
			{concentrationReminder ? (
				<div className={styles.concentrationReminder}>
					<div className={styles.concentrationReminderContent}>
						<strong>Round {concentrationReminder.round} complete.</strong> Roll
						to maintain concentration for{" "}
						{concentrationReminder.combatants
							.map((combatant) => {
								const label = STATUS_LABELS[combatant.status] || "Status";
								const detailText = combatant.detail
									? ` (${combatant.detail})`
									: "";
								return `${combatant.name} – ${label}${detailText}`;
							})
							.join(", ")}
						.
					</div>
					<button
						type='button'
						className={styles.reminderDismiss}
						onClick={dismissConcentrationReminder}>
						Dismiss
					</button>
				</div>
			) : null}
			{dndBeyondRefreshError && (
				<p className={styles.errorMessage}>{dndBeyondRefreshError}</p>
			)}
			{combatOrder.length === 0 ? (
				<p className={styles.emptyState}>
					Add party members and enemies to build the initiative order.
				</p>
			) : (
				<ol className={styles.combatList}>
					{combatOrder.map((combatant, index) => {
						const isPartyCombatant = combatant.type === "party";
						const isImportedPartyCombatant =
							isPartyCombatant && combatant.source === "dndbeyond";
						const showImportedPartyHitPoints =
							isImportedPartyCombatant && combatant.hitPoints;
						const showManualPartyControls =
							isPartyCombatant && !isImportedPartyCombatant;
						const showEnemyHitPoints = combatant.type === "enemy";
						const partyHitPointsData = isPartyCombatant
							? combatant.hitPoints
							: undefined;
						const combatantStatus = combatStatuses?.[combatant.id] ?? {
							status: "none",
							detail: "",
						};
						const statusValue = combatantStatus.status ?? "none";
						const statusSelectId = `combatant-status-${combatant.id}`;
						const isEditingStatus =
							statusValue === "none" || statusEditState[combatant.id];

						let partyCurrentValue;
						if (partyHitPointsData && typeof partyHitPointsData === "object") {
							if (
								partyHitPointsData.current !== undefined &&
								partyHitPointsData.current !== null &&
								partyHitPointsData.current !== ""
							) {
								partyCurrentValue = partyHitPointsData.current;
							} else if (
								partyHitPointsData.value !== undefined &&
								partyHitPointsData.value !== null &&
								partyHitPointsData.value !== ""
							) {
								partyCurrentValue = partyHitPointsData.value;
							} else if (
								partyHitPointsData.hp !== undefined &&
								partyHitPointsData.hp !== null &&
								partyHitPointsData.hp !== ""
							) {
								partyCurrentValue = partyHitPointsData.hp;
							}
						} else {
							partyCurrentValue = partyHitPointsData;
						}

						const numericPartyCurrentHitPoints = Number(partyCurrentValue);
						const isLowHitPoints =
							isPartyCombatant &&
							Number.isFinite(numericPartyCurrentHitPoints) &&
							numericPartyCurrentHitPoints <= 5;

						const manualPartyCurrentValue =
							showManualPartyControls &&
							partyCurrentValue !== undefined &&
							partyCurrentValue !== null
								? String(partyCurrentValue)
								: "";

						let manualPartyMaxDisplay = "";
						if (
							showManualPartyControls &&
							partyHitPointsData &&
							typeof partyHitPointsData === "object"
						) {
							const potentialMax =
								partyHitPointsData.max ??
								partyHitPointsData.total ??
								partyHitPointsData.maximum;
							if (
								potentialMax !== undefined &&
								potentialMax !== null &&
								potentialMax !== ""
							) {
								manualPartyMaxDisplay = String(potentialMax);
							}
						}

						let importedPartyMaxDisplay = "";
						if (
							showImportedPartyHitPoints &&
							combatant.hitPoints &&
							typeof combatant.hitPoints === "object"
						) {
							const potentialMax =
								combatant.hitPoints.max ??
								combatant.hitPoints.total ??
								combatant.hitPoints.maximum;
							if (
								potentialMax !== undefined &&
								potentialMax !== null &&
								potentialMax !== ""
							) {
								importedPartyMaxDisplay = String(potentialMax);
							}
						}

						const enemyHitPointsData = showEnemyHitPoints
							? combatant.hitPoints
							: undefined;
						let enemyCurrentValue = "";
						if (showEnemyHitPoints) {
							if (
								enemyHitPointsData &&
								typeof enemyHitPointsData === "object"
							) {
								const potentialCurrent =
									enemyHitPointsData.current ??
									enemyHitPointsData.value ??
									enemyHitPointsData.hp ??
									enemyHitPointsData;
								if (
									potentialCurrent !== undefined &&
									potentialCurrent !== null &&
									potentialCurrent !== ""
								) {
									enemyCurrentValue = String(potentialCurrent);
								}
							} else if (
								enemyHitPointsData !== undefined &&
								enemyHitPointsData !== null &&
								enemyHitPointsData !== ""
							) {
								enemyCurrentValue = String(enemyHitPointsData);
							}
						}

						let enemyMaxDisplay = "";
						if (showEnemyHitPoints) {
							if (
								enemyHitPointsData &&
								typeof enemyHitPointsData === "object"
							) {
								const potentialMax =
									enemyHitPointsData.max ??
									enemyHitPointsData.total ??
									enemyHitPointsData.maximum ??
									enemyHitPointsData.maxHitPoints ??
									enemyHitPointsData.hitPointsMax;
								if (
									potentialMax !== undefined &&
									potentialMax !== null &&
									potentialMax !== ""
								) {
									enemyMaxDisplay = String(potentialMax);
								}
							}

							if (!enemyMaxDisplay) {
								const rawMax = combatant.maxHitPoints;

								if (rawMax !== undefined && rawMax !== null && rawMax !== "") {
									enemyMaxDisplay = String(rawMax);
								}
							}
						}

						const importedPartyCurrentDisplay =
							showImportedPartyHitPoints &&
							partyCurrentValue !== undefined &&
							partyCurrentValue !== null
								? String(partyCurrentValue)
								: "--";
						const shouldRenderVitals =
							showImportedPartyHitPoints ||
							showManualPartyControls ||
							showEnemyHitPoints;
						return (
							<li
								key={combatant.id}
								className={`${styles.combatant} ${
									index === highlightedIndex ? styles.activeCombatant : ""
								}`}>
								<div className={styles.combatantContent}>
									<div className={styles.combatantInfo}>
										<h3>
											{combatant.name}
											<span className={styles.tag}>
												{combatant.type === "party" ? "Party" : "Enemy"}
											</span>
                                                                                        {statusValue !== "none" ? (
                                                                                                <span className={styles.statusBadge}>
                                                                                                        {STATUS_LABELS[statusValue] || "Status"}
                                                                                                        {combatantStatus.detail
                                                                                                                ? ` (${combatantStatus.detail})`
                                                                                                                : ""}
                                                                                                </span>
                                                                                        ) : null}
										</h3>
										<p className={styles.statLine}>
											Initiative:{" "}
											<strong>
												{formatInitiativeDisplay(combatant.initiative)}
											</strong>
										</p>
										<div className={styles.statusSection}>
											{isEditingStatus ? (
												<>
													<select
														id={statusSelectId}
														className={styles.statusSelect}
														value={statusValue}
														onChange={(event) => {
															const nextValue = event.target.value;
															handleCombatStatusChange(combatant.id, nextValue);
															setStatusEditState((previous) => ({
																...previous,
																[combatant.id]: nextValue === "none",
															}));
														}}>
														{STATUS_OPTIONS.map((option) => (
															<option
																key={option.value}
																value={option.value}
																placeholder='Status / Concentration'>
																{option.label}
															</option>
														))}
													</select>
												</>
											) : (
												<>
													<button
														type='button'
														className={styles.changeStatusButton}
														onClick={() =>
															setStatusEditState((previous) => ({
																...previous,
																[combatant.id]: true,
															}))
														}>
														Change Status
													</button>
												</>
											)}
										</div>
									</div>
									{shouldRenderVitals && (
										<div className={styles.combatantVitals}>
											{showImportedPartyHitPoints ? (
												<>
													<div className={`${styles.currentHp}`}>
														<span className={styles.currentHpLabel}>HP</span>
														<span
															className={`${styles.currentHpValue} ${
																isLowHitPoints ? styles.lowHp : ""
															}`}>
															{importedPartyCurrentDisplay}
														</span>
														{importedPartyMaxDisplay ? (
															<span className={styles.currentHpMax}>
																/ {importedPartyMaxDisplay}
															</span>
														) : null}
													</div>
													{combatant.hitPoints.temporary ? (
														<span className={styles.tempHpNote}>
															{`(+${combatant.hitPoints.temporary} temp)`}
														</span>
													) : null}
												</>
											) : showManualPartyControls ? (
												<>
													<label className={styles.currentHp}>
														<span className={styles.currentHpLabel}>HP</span>
														<input
															type='number'
															className={`${styles.enemyHpInput} ${
																isLowHitPoints ? styles.lowHp : ""
															}`}
															value={manualPartyCurrentValue}
															onChange={(event) =>
																handleManualPartyHitPointsChange(
																	combatant.id,
																	event.target.value
																)
															}
															placeholder='--'
															inputMode='numeric'
														/>
														{manualPartyMaxDisplay ? (
															<span className={styles.currentHpMax}>
																/ {manualPartyMaxDisplay}
															</span>
														) : null}
													</label>
													<form
														className={styles.enemyDamageForm}
														onSubmit={(event) => {
															event.preventDefault();
															applyManualPartyDamage(combatant.id);
														}}>
														<button
															type='submit'
															className={styles.enemyDamageButton}>
															dmg
														</button>
														<input
															type='number'
															className={styles.enemyDamageInput}
															value={partyDamageInputs[combatant.id] ?? ""}
															onChange={(event) =>
																handleManualPartyDamageInputChange(
																	combatant.id,
																	event.target.value
																)
															}
															min='0'
															inputMode='numeric'
															aria-label='Damage amount'
														/>
													</form>
												</>
											) : (
												<>
													<label className={styles.currentHp}>
														<span className={styles.currentHpLabel}>HP</span>
														<input
															type='text'
															className={styles.enemyHpInput}
															value={enemyCurrentValue}
															onChange={(event) =>
																handleEnemyHitPointsChange(
																	combatant.id,
																	event.target.value
																)
															}
															placeholder='--'
														/>
														{enemyMaxDisplay ? (
															<span className={styles.currentHpMax}>
																/ {enemyMaxDisplay}
															</span>
														) : null}
													</label>
													<form
														className={styles.enemyDamageForm}
														onSubmit={(event) => {
															event.preventDefault();
															applyEnemyDamage(combatant.id);
														}}>
														<button
															type='submit'
															className={styles.enemyDamageButton}>
															dmg
														</button>
														<input
															type='number'
															className={styles.enemyDamageInput}
															value={enemyDamageInputs[combatant.id] ?? ""}
															onChange={(event) =>
																handleEnemyDamageInputChange(
																	combatant.id,
																	event.target.value
																)
															}
															min='0'
															inputMode='numeric'
															aria-label='Damage amount'
														/>
													</form>
												</>
											)}
										</div>
									)}
								</div>
							</li>
						);
					})}
				</ol>
			)}
		</section>
	);
};

export default CombatOrder;
