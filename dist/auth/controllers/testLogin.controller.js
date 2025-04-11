/**
 * Middleware placeholder - no test accounts
 * This controller has been intentionally emptied to remove all test accounts
 */
export const testLogin = async (req, res, next) => {
    // Simply pass to the next middleware without special account handling
    return next();
};
