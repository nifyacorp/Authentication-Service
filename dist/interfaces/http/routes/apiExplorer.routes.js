"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiExplorerRouter = void 0;
const express_1 = require("express");
const service_js_1 = __importDefault(require("../../../core/apiExplorer/service.js"));
exports.apiExplorerRouter = (0, express_1.Router)();
// Health check and API overview
exports.apiExplorerRouter.get('/health', (req, res) => {
    const healthInfo = service_js_1.default.getApiHealth();
    return res.json(healthInfo);
});
// List all available endpoints
exports.apiExplorerRouter.get('/explorer', (req, res) => {
    const endpoints = service_js_1.default.getAllEndpoints();
    return res.json(endpoints);
});
// Get documentation for a specific endpoint
exports.apiExplorerRouter.get('/explorer/:path', (req, res) => {
    let path = req.params.path;
    // Add leading slash if missing
    if (!path.startsWith('/')) {
        path = `/${path}`;
    }
    // If path doesn't include auth, assume it's an auth endpoint
    if (!path.includes('/auth/')) {
        path = `/api/auth/${path}`;
    }
    else if (!path.startsWith('/api/')) {
        path = `/api${path}`;
    }
    const method = req.query.method || 'GET';
    const documentation = service_js_1.default.getEndpointDocumentation(path, method.toUpperCase());
    return res.json(documentation);
});
//# sourceMappingURL=apiExplorer.routes.js.map