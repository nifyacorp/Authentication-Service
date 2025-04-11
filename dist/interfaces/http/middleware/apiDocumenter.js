import { getEndpointDescription } from '../../../auth/errors/factory.js';
/**
 * API Documentation middleware - adds automatic documentation to API responses
 */
export function apiDocumenter(req, res, next) {
    // Store the original send method
    const originalSend = res.send;
    // Override the send method to add documentation
    res.send = function (body) {
        try {
            // Parse the body if it's JSON
            let parsedBody;
            if (typeof body === 'string') {
                try {
                    parsedBody = JSON.parse(body);
                }
                catch (e) {
                    // Not JSON, just return original
                    return originalSend.call(this, body);
                }
            }
            else {
                parsedBody = body;
            }
            // Don't add docs to error responses or if docs already exist
            if (parsedBody && !parsedBody.error && !parsedBody.docs) {
                // Get basic endpoint info
                const path = req.path;
                const method = req.method;
                // Add documentation to response
                parsedBody.docs = {
                    endpoint: path,
                    method: method,
                    description: getEndpointDescription(path),
                    auth_required: path.includes('/auth/') && !path.includes('/login') && !path.includes('/signup')
                };
                // Add links to related endpoints
                parsedBody.docs.related = [
                    { path: '/api/health', method: 'GET', description: 'Health check endpoint' },
                    { path: '/api/auth/login', method: 'POST', description: 'Login to get access token' },
                    { path: '/api/auth/me', method: 'GET', description: 'Get current user profile' }
                ];
                // Return the modified response
                return originalSend.call(this, JSON.stringify(parsedBody));
            }
        }
        catch (err) {
            console.error('Error in API documenter:', err);
        }
        // If anything goes wrong, just send the original
        return originalSend.call(this, body);
    };
    next();
}
