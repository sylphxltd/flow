/**
 * Base Provider Interface
 * Defines contract for all AI providers
 */
/**
 * Helper: Check if all required fields from schema are present in config
 * Uses camelCase format only
 */
export function hasRequiredFields(schema, config) {
    const requiredFields = schema.filter(f => f.required);
    for (const field of requiredFields) {
        const value = config[field.key];
        if (value === undefined || value === '') {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=base-provider.js.map