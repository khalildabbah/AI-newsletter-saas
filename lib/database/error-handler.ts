// ============================================
// DATABASE ERROR HANDLING
// ============================================

/**
 * Type guard to check if an error is a MongoDB error
 * MongoDB errors have a `code` property that is a number (e.g., 11000 for duplicate key)
 * 
 * @param error - The error to check
 * @returns True if the error is a MongoDB error with a code property
 */
export function isMongoError(
  error: unknown
): error is { code: number } & Error {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "number"
  );
}

/**
 * Wraps a database operation with error handling
 * 
 * @param operation - The async database operation to execute
 * @param operationName - Description of the operation for error messages
 * @returns The result of the operation or throws an error
 */
export async function wrapDatabaseOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Error in database operation: ${operationName}`, error);
    throw error;
  }
}

// Note: Query patterns are no longer needed with MongoDB native queries
// All queries are written directly using MongoDB collection methods