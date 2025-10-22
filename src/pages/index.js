import { useMemo, useState } from "react";
import Head from "next/head";
import styles from "@/styles/Home.module.css";

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const emptyPartyForm = { name: "", initiative: "" };
const emptyEnemyForm = {
  name: "",
  armorClass: "",
  hitPoints: "",
  initiative: "",
  notes: "",
};
const emptyAttackForm = { name: "", toHit: "", damage: "" };

const formatClassSummary = (classes = []) => {
  if (!Array.isArray(classes) || classes.length === 0) {
    return "";
  }

  const parts = classes
    .filter((entry) => entry && entry.name)
    .map((entry) => {
      if (entry.level) {
        return `${entry.name} ${entry.level}`;
      }
      return entry.name;
    });

  return parts.join(" / ");
};

export default function Home() {
  const [partyMembers, setPartyMembers] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [partyForm, setPartyForm] = useState(emptyPartyForm);
  const [enemyForm, setEnemyForm] = useState(emptyEnemyForm);
  const [attackForm, setAttackForm] = useState(emptyAttackForm);
  const [enemyAttacks, setEnemyAttacks] = useState([]);
  const [activeCombatantId, setActiveCombatantId] = useState(null);
  const [dndBeyondIdentifier, setDndBeyondIdentifier] = useState("");
  const [isImportingDndBeyond, setIsImportingDndBeyond] = useState(false);
  const [dndBeyondError, setDndBeyondError] = useState("");

  const handlePartySubmit = (event) => {
    event.preventDefault();
    if (!partyForm.name.trim()) return;

    setPartyMembers((prev) => [
      ...prev,
      {
        id: generateId(),
        name: partyForm.name.trim(),
        initiative: Number(partyForm.initiative) || 0,
      },
    ]);
    setPartyForm(emptyPartyForm);
  };

  const handleDndBeyondImport = async (event) => {
    event.preventDefault();
    const identifier = dndBeyondIdentifier.trim();
    if (!identifier) {
      return;
    }

    setDndBeyondError("");
    setIsImportingDndBeyond(true);

    try {
      const response = await fetch("/api/import-dndbeyond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch (parseError) {
        data = null;
      }

      if (!response.ok) {
        const message = (data && data.error)
          ? data.error
          : "Failed to import character from D&D Beyond.";
        throw new Error(message);
      }

      if (!data || !data.name) {
        throw new Error("The character response was missing a name.");
      }

      if (
        data.id &&
        partyMembers.some((member) => member.ddbCharacterId === data.id)
      ) {
        setDndBeyondError("That character is already in your party.");
        return;
      }

      const initiativeNumber = Number(data.initiative);
      const levelNumber = Number(data.level);
      const classSummary = formatClassSummary(data.classes);

      setPartyMembers((prev) => [
        ...prev,
        {
          id: generateId(),
          name: data.name,
          initiative: Number.isFinite(initiativeNumber) ? initiativeNumber : 0,
          source: "dndbeyond",
          classSummary: classSummary || undefined,
          level:
            Number.isFinite(levelNumber) && levelNumber > 0
              ? levelNumber
              : undefined,
          playerName: data.playerName || undefined,
          ddbCharacterId: data.id || undefined,
        },
      ]);

      setDndBeyondIdentifier("");
    } catch (error) {
      console.error(error);
      setDndBeyondError(
        error instanceof Error && error.message
          ? error.message
          : "Failed to import character from D&D Beyond.",
      );
    } finally {
      setIsImportingDndBeyond(false);
    }
  };

  const handleAttackSubmit = (event) => {
    event.preventDefault();
    if (!attackForm.name.trim()) return;

    setEnemyAttacks((prev) => [
      ...prev,
      {
        id: generateId(),
        name: attackForm.name.trim(),
        toHit: attackForm.toHit.trim(),
        damage: attackForm.damage.trim(),
      },
    ]);
    setAttackForm(emptyAttackForm);
  };

  const handleEnemySubmit = (event) => {
    event.preventDefault();
    if (!enemyForm.name.trim()) return;

    setEnemies((prev) => [
      ...prev,
      {
        id: generateId(),
        name: enemyForm.name.trim(),
        armorClass: enemyForm.armorClass.trim(),
        hitPoints: enemyForm.hitPoints.trim(),
        initiative: Number(enemyForm.initiative) || 0,
        notes: enemyForm.notes.trim(),
        attacks: enemyAttacks,
      },
    ]);
    setEnemyForm(emptyEnemyForm);
    setAttackForm(emptyAttackForm);
    setEnemyAttacks([]);
  };

  const removePartyMember = (id) => {
    setPartyMembers((prev) => prev.filter((member) => member.id !== id));
  };

  const removeEnemy = (id) => {
    setEnemies((prev) => prev.filter((enemy) => enemy.id !== id));
  };

  const removePendingAttack = (id) => {
    setEnemyAttacks((prev) => prev.filter((attack) => attack.id !== id));
  };

  const combatOrder = useMemo(() => {
    const partyCombatants = partyMembers.map((member) => ({
      ...member,
      type: "party",
    }));
    const enemyCombatants = enemies.map((enemy) => ({
      ...enemy,
      type: "enemy",
    }));

    return [...partyCombatants, ...enemyCombatants].sort((a, b) => {
      if (b.initiative === a.initiative) {
        return a.name.localeCompare(b.name);
      }
      return b.initiative - a.initiative;
    });
  }, [partyMembers, enemies]);

  const advanceTurn = () => {
    if (combatOrder.length === 0) return;
    const currentIndex = combatOrder.findIndex(
      (combatant) => combatant.id === activeCombatantId,
    );
    if (currentIndex === -1) {
      setActiveCombatantId(combatOrder[0].id);
      return;
    }
    const nextIndex = (currentIndex + 1) % combatOrder.length;
    setActiveCombatantId(combatOrder[nextIndex].id);
  };

  const resetTurn = () => {
    if (combatOrder.length === 0) {
      setActiveCombatantId(null);
      return;
    }
    setActiveCombatantId(combatOrder[0].id);
  };

  const currentTurnIndex = useMemo(() => {
    if (combatOrder.length === 0) return -1;
    if (!activeCombatantId) return -1;
    return combatOrder.findIndex(
      (combatant) => combatant.id === activeCombatantId,
    );
  }, [combatOrder, activeCombatantId]);

  const highlightedIndex = useMemo(() => {
    if (combatOrder.length === 0) return -1;
    return currentTurnIndex === -1 ? 0 : currentTurnIndex;
  }, [combatOrder, currentTurnIndex]);

  return (
    <>
      <Head>
        <title>D&D Combat Tracker</title>
        <meta
          name="description"
          content="Track party members, enemies, and turn order for your D&D combat encounters."
        />
      </Head>
      <div className={styles.page}>
        <main className={styles.main}>
          <header className={styles.header}>
            <h1>Dungeons &amp; Dragons Combat Tracker</h1>
            <p>
              Keep your battles organized by capturing party initiatives, enemy
              statblocks, and cycling through turn order.
            </p>
          </header>

          <section className={styles.section}>
            <h2>Combat Order</h2>
            <p className={styles.sectionDescription}>
              Automatically sorted by initiative. Advance turns as combat
              progresses.
            </p>
            <div className={styles.combatControls}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={advanceTurn}
                disabled={combatOrder.length === 0}
              >
                Next Turn
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={resetTurn}
                disabled={combatOrder.length === 0}
              >
                Reset to Top
              </button>
            </div>
            {combatOrder.length === 0 ? (
              <p className={styles.emptyState}>
                Add party members and enemies to build the initiative order.
              </p>
            ) : (
              <ol className={styles.combatList}>
                {combatOrder.map((combatant, index) => (
                  <li
                    key={combatant.id}
                    className={`${styles.combatant} ${
                      index === highlightedIndex ? styles.activeCombatant : ""
                    }`}
                  >
                    <div>
                      <h3>
                        {combatant.name}
                        <span className={styles.tag}>
                          {combatant.type === "party" ? "Party" : "Enemy"}
                        </span>
                      </h3>
                      <p className={styles.statLine}>
                        Initiative: <strong>{combatant.initiative}</strong>
                      </p>
                    </div>
                    {combatant.type === "enemy" && (
                      <div className={styles.combatantDetails}>
                        {combatant.armorClass && (
                          <span>AC {combatant.armorClass}</span>
                        )}
                        {combatant.hitPoints && (
                          <span>HP {combatant.hitPoints}</span>
                        )}
                        {combatant.attacks.length > 0 && (
                          <span>
                            {combatant.attacks
                              .map((attack) => attack.name)
                              .join(", ")}
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <div className={styles.sectionColumns}>
            <section className={styles.section}>
              <h2>Party Members</h2>
              <p className={styles.sectionDescription}>
                Add each adventurer and their initiative roll.
              </p>
              <form onSubmit={handlePartySubmit} className={styles.form}>
                <div className={styles.formGrid}>
                  <label className={styles.inputGroup}>
                    <span>Character Name</span>
                    <input
                      type="text"
                      value={partyForm.name}
                      onChange={(event) =>
                        setPartyForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      placeholder="e.g. Lyra the Swift"
                      required
                    />
                  </label>
                  <label className={styles.inputGroup}>
                    <span>Initiative</span>
                    <input
                      type="number"
                      value={partyForm.initiative}
                      onChange={(event) =>
                        setPartyForm((prev) => ({
                          ...prev,
                          initiative: event.target.value,
                        }))
                      }
                      placeholder="e.g. 17"
                    />
                  </label>
                </div>
                <button type="submit" className={styles.primaryButton}>
                  Add Party Member
                </button>
              </form>
              <div className={styles.importBox}>
                <h3>Import from D&amp;D Beyond</h3>
                <p className={styles.helperText}>
                  Paste a shareable character link or ID to pull in their initiative
                  automatically.
                </p>
                <form onSubmit={handleDndBeyondImport} className={styles.importForm}>
                  <label className={styles.inputGroup}>
                    <span>Character URL or ID</span>
                    <input
                      type="text"
                      value={dndBeyondIdentifier}
                      onChange={(event) => setDndBeyondIdentifier(event.target.value)}
                      placeholder="https://www.dndbeyond.com/characters/12345678"
                    />
                  </label>
                  {dndBeyondError && (
                    <p className={styles.errorMessage}>{dndBeyondError}</p>
                  )}
                  <button
                    type="submit"
                    className={styles.secondaryButton}
                    disabled={
                      isImportingDndBeyond || !dndBeyondIdentifier.trim()
                    }
                  >
                    {isImportingDndBeyond ? "Importing..." : "Import Character"}
                  </button>
                </form>
              </div>
              {partyMembers.length > 0 && (
                <ul className={styles.cardList}>
                  {partyMembers.map((member) => (
                    <li key={member.id} className={styles.card}>
                      <div>
                        <h3>{member.name}</h3>
                        <p className={styles.statLine}>
                          Initiative: <strong>{member.initiative}</strong>
                        </p>
                        {member.source === "dndbeyond" && (
                          <span className={styles.sourceTag}>Imported from D&amp;D Beyond</span>
                        )}
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
                        {member.playerName && (
                          <p className={styles.statLine}>
                            Player: <strong>{member.playerName}</strong>
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => removePartyMember(member.id)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={styles.section}>
            <h2>Enemies</h2>
            <p className={styles.sectionDescription}>
              Capture statblocks, attacks, and initiatives for the creatures your
              party faces.
            </p>
            <form onSubmit={handleEnemySubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <label className={styles.inputGroup}>
                  <span>Creature Name</span>
                  <input
                    type="text"
                    value={enemyForm.name}
                    onChange={(event) =>
                      setEnemyForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    placeholder="e.g. Goblin Shaman"
                    required
                  />
                </label>
                <label className={styles.inputGroup}>
                  <span>Initiative</span>
                  <input
                    type="number"
                    value={enemyForm.initiative}
                    onChange={(event) =>
                      setEnemyForm((prev) => ({
                        ...prev,
                        initiative: event.target.value,
                      }))
                    }
                    placeholder="e.g. 14"
                  />
                </label>
                <label className={styles.inputGroup}>
                  <span>Armor Class</span>
                  <input
                    type="text"
                    value={enemyForm.armorClass}
                    onChange={(event) =>
                      setEnemyForm((prev) => ({
                        ...prev,
                        armorClass: event.target.value,
                      }))
                    }
                    placeholder="e.g. 15 (leather armor)"
                  />
                </label>
                <label className={styles.inputGroup}>
                  <span>Hit Points</span>
                  <input
                    type="text"
                    value={enemyForm.hitPoints}
                    onChange={(event) =>
                      setEnemyForm((prev) => ({
                        ...prev,
                        hitPoints: event.target.value,
                      }))
                    }
                    placeholder="e.g. 36 (8d8)"
                  />
                </label>
              </div>
              <label className={styles.inputGroup}>
                <span>Notes</span>
                <textarea
                  rows={3}
                  value={enemyForm.notes}
                  onChange={(event) =>
                    setEnemyForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Legendary resistances, vulnerabilities, or tactics."
                />
              </label>

              <fieldset className={styles.fieldset}>
                <legend>Attacks</legend>
                <div className={styles.formGrid}>
                  <label className={styles.inputGroup}>
                    <span>Attack Name</span>
                    <input
                      type="text"
                      value={attackForm.name}
                      onChange={(event) =>
                        setAttackForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      placeholder="e.g. Claw"
                    />
                  </label>
                  <label className={styles.inputGroup}>
                    <span>To Hit</span>
                    <input
                      type="text"
                      value={attackForm.toHit}
                      onChange={(event) =>
                        setAttackForm((prev) => ({
                          ...prev,
                          toHit: event.target.value,
                        }))
                      }
                      placeholder="e.g. +5"
                    />
                  </label>
                  <label className={styles.inputGroup}>
                    <span>Damage</span>
                    <input
                      type="text"
                      value={attackForm.damage}
                      onChange={(event) =>
                        setAttackForm((prev) => ({
                          ...prev,
                          damage: event.target.value,
                        }))
                      }
                      placeholder="e.g. 1d8 + 3 slashing"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleAttackSubmit}
                >
                  Add Attack
                </button>
                {enemyAttacks.length > 0 && (
                  <ul className={styles.inlineList}>
                    {enemyAttacks.map((attack) => (
                      <li key={attack.id}>
                        <strong>{attack.name}</strong>
                        {attack.toHit && ` | ${attack.toHit} to hit`}
                        {attack.damage && ` | ${attack.damage}`}
                        <button
                          type="button"
                          className={styles.removeLink}
                          onClick={() => removePendingAttack(attack.id)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </fieldset>

              <button type="submit" className={styles.primaryButton}>
                Add Enemy
              </button>
            </form>

            {enemies.length > 0 && (
              <ul className={styles.cardList}>
                {enemies.map((enemy) => (
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
                      {enemy.notes && (
                        <p className={styles.notes}>{enemy.notes}</p>
                      )}
                      {enemy.attacks.length > 0 && (
                        <div className={styles.attackList}>
                          <h4>Attacks</h4>
                          <ul>
                            {enemy.attacks.map((attack) => (
                              <li key={attack.id}>
                                <strong>{attack.name}</strong>
                                {attack.toHit && ` | ${attack.toHit} to hit`}
                                {attack.damage && ` | ${attack.damage}`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeEnemy(enemy.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          </div>

        </main>
      </div>
    </>
  );
}
