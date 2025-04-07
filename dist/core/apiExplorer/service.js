"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apiMetadata_js_1 = require("../../shared/utils/apiMetadata.js");
/**
 * API Explorer service provides endpoints for API discovery and documentation
 */
exports.default = {
    /**
     * Get API health status and overview of available endpoints
     */
    getApiHealth() {
        const startTime = process.uptime();
        const uptime = formatUptime(startTime);
        return {
            status: 'healthy',
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            uptime,
            api: {
                base_url: process.env.API_BASE_URL || 'https://api.nifya.app',
                documentation_url: 'https://docs.nifya.app/api/auth',
                endpoints_count: (0, apiMetadata_js_1.getAllEndpoints)().length,
                endpoint_groups: [
                    { name: 'Authentication', base_path: '/api/auth' },
                    { name: 'User Management', base_path: '/api/auth/me' },
                    { name: 'Session Management', base_path: '/api/auth/refresh' },
                    { name: 'Password Management', base_path: '/api/auth/reset-password' },
                    { name: 'OAuth', base_path: '/api/auth/google' }
                ]
            }
        };
    },
    /**
     * Get list of all available API endpoints
     */
    getAllEndpoints() {
        return {
            endpoints: (0, apiMetadata_js_1.getAllEndpoints)(),
            count: (0, apiMetadata_js_1.getAllEndpoints)().length,
            documentation_url: 'https://docs.nifya.app/api/auth'
        };
    },
    /**
     * Get detailed documentation for a specific endpoint
     */
    getEndpointDocumentation(path, method) {
        const metadata = (0, apiMetadata_js_1.getEndpointMetadata)(path, method);
        if (!metadata) {
            return {
                error: {
                    message: 'Endpoint documentation not found',
                    available_endpoints: (0, apiMetadata_js_1.findRelatedEndpoints)(path)
                }
            };
        }
        return {
            documentation: metadata,
            related_endpoints: (0, apiMetadata_js_1.findRelatedEndpoints)(path)
        };
    }
};
/**
 * Format uptime into a human-readable string
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / (3600 * 24));
    seconds -= days * 3600 * 24;
    const hours = Math.floor(seconds / 3600);
    seconds -= hours * 3600;
    const minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;
    return `${days}d ${hours}h ${minutes}m ${Math.floor(seconds)}s`;
}
//# sourceMappingURL=service.js.map