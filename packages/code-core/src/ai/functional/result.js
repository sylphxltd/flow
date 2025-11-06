/**
 * Result type for functional error handling
 * Represents success or failure without exceptions
 *
 * DESIGN RATIONALE:
 * - Explicit error handling at type level
 * - Composable through map/flatMap
 * - Forces caller to handle errors
 * - No hidden control flow (no thrown exceptions)
 */
/**
 * Constructors
 */
export const success = (value) => ({
    _tag: 'Success',
    value,
});
export const failure = (error) => ({
    _tag: 'Failure',
    error,
});
/**
 * Type guards
 */
export const isSuccess = (result) => result._tag === 'Success';
export const isFailure = (result) => result._tag === 'Failure';
/**
 * Transformations
 */
/**
 * Transform the success value
 * Failure propagates unchanged
 */
export const map = (fn) => (result) => {
    if (isSuccess(result)) {
        return success(fn(result.value));
    }
    return result;
};
/**
 * Transform the success value with a function that returns a Result
 * Enables chaining operations that can fail
 * Failure propagates unchanged
 */
export const flatMap = (fn) => (result) => {
    if (isSuccess(result)) {
        return fn(result.value);
    }
    return result;
};
/**
 * Transform the error
 * Success propagates unchanged
 */
export const mapError = (fn) => (result) => {
    if (isFailure(result)) {
        return failure(fn(result.error));
    }
    return result;
};
/**
 * Extract value or provide default
 */
export const getOrElse = (defaultValue) => (result) => {
    if (isSuccess(result)) {
        return result.value;
    }
    return defaultValue;
};
/**
 * Extract value or compute default
 */
export const getOrElseLazy = (fn) => (result) => {
    if (isSuccess(result)) {
        return result.value;
    }
    return fn();
};
/**
 * Pattern matching
 */
export const match = (onSuccess, onFailure) => (result) => {
    if (isSuccess(result)) {
        return onSuccess(result.value);
    }
    return onFailure(result.error);
};
/**
 * Convert thrown exception to Result
 */
export const tryCatch = (fn, onError = (error) => error) => {
    try {
        return success(fn());
    }
    catch (error) {
        return failure(onError(error));
    }
};
/**
 * Convert Promise to Result
 */
export const tryCatchAsync = async (fn, onError = (error) => error) => {
    try {
        const value = await fn();
        return success(value);
    }
    catch (error) {
        return failure(onError(error));
    }
};
/**
 * Combine multiple Results into a single Result containing an array
 * Fails if any Result is a Failure (short-circuits on first failure)
 */
export const all = (results) => {
    const values = [];
    for (const result of results) {
        if (isFailure(result)) {
            return result;
        }
        values.push(result.value);
    }
    return success(values);
};
/**
 * Run side effect for success case
 */
export const tap = (fn) => (result) => {
    if (isSuccess(result)) {
        fn(result.value);
    }
    return result;
};
/**
 * Run side effect for failure case
 */
export const tapError = (fn) => (result) => {
    if (isFailure(result)) {
        fn(result.error);
    }
    return result;
};
/**
 * Functional pipe for composing Result transformations
 */
export const pipe = (result) => (fn) => fn(result);
//# sourceMappingURL=result.js.map