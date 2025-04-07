"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiDocumenter = apiDocumenter;
const apiMetadata_js_1 = require("../../../shared/utils/apiMetadata.js");
const ErrorResponseBuilder_js_1 = require("../../../shared/errors/ErrorResponseBuilder.js");
/**
 * Middleware to validate requests against API metadata and provide self-documenting errors
 */
function apiDocumenter(req, res, next) {
    // Get metadata for this endpoint
    const path = req.path;
    const method = req.method;
    const metadata = (0, apiMetadata_js_1.getEndpointMetadata)(path, method);
    // If no metadata found, continue without validation
    if (!metadata) {
        return next();
    }
    // Validate required path parameters
    if (metadata.path_parameters) {
        const errors = {};
        metadata.path_parameters.forEach((param) => {
            const paramValue = req.params[param.name];
            if (param.required && (paramValue === undefined || paramValue === null)) {
                errors[param.name] = `Missing required path parameter: ${param.name}`;
            }
            else if (paramValue !== undefined && param.type === 'uuid') {
                // Validate UUID format
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(paramValue)) {
                    errors[param.name] = `Invalid UUID format for parameter: ${param.name}`;
                }
            }
        });
        if (Object.keys(errors).length > 0) {
            const { statusCode, body } = ErrorResponseBuilder_js_1.errorBuilders.validationError(req, errors);
            return res.status(statusCode).json(body);
        }
    }
    // Validate required query parameters
    if (metadata.query_parameters) {
        const errors = {};
        metadata.query_parameters.forEach((param) => {
            if (param.required && req.query[param.name] === undefined) {
                errors[param.name] = `Missing required query parameter: ${param.name}`;
            }
        });
        if (Object.keys(errors).length > 0) {
            const { statusCode, body } = ErrorResponseBuilder_js_1.errorBuilders.validationError(req, errors);
            return res.status(statusCode).json(body);
        }
    }
    // Validate required body parameters for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method) && metadata.body_parameters) {
        const errors = {};
        metadata.body_parameters.forEach((param) => {
            if (param.required && (req.body === undefined || req.body[param.name] === undefined)) {
                errors[param.name] = `Missing required body parameter: ${param.name}`;
            }
        });
        if (Object.keys(errors).length > 0) {
            const { statusCode, body } = ErrorResponseBuilder_js_1.errorBuilders.validationError(req, errors);
            return res.status(statusCode).json(body);
        }
    }
    // If all validations pass, continue
    next();
}
//# sourceMappingURL=apiDocumenter.js.map