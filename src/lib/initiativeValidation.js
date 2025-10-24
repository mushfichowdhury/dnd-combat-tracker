export const isValidInitiativeInput = (value) => {
        if (value === undefined || value === null) {
                return false;
        }

        const stringValue = typeof value === "string" ? value : String(value);

        if (stringValue === "") {
                return true;
        }

        const trimmed = stringValue.trim();

        if (trimmed === "") {
                return true;
        }

        if (trimmed === "-") {
                return true;
        }

        return /^-?\d+$/.test(trimmed);
};
