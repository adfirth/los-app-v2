const fetch = require('node-fetch');

// In-memory storage for console logs (in production, you'd use a database)
let consoleLogs = [];
const MAX_LOGS = 1000;

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        if (event.httpMethod === 'POST') {
            // Receive console logs
            const body = JSON.parse(event.body);
            const { logs, timestamp, userAgent, url } = body;

            // Add new logs to storage
            if (logs && Array.isArray(logs)) {
                logs.forEach(log => {
                    consoleLogs.push({
                        ...log,
                        receivedAt: new Date().toISOString(),
                        userAgent,
                        url
                    });
                });

                // Keep logs under limit
                if (consoleLogs.length > MAX_LOGS) {
                    consoleLogs = consoleLogs.slice(-MAX_LOGS);
                }
            }

            return {
                statusCode: 200,
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: true,
                    message: `Received ${logs?.length || 0} logs`,
                    totalLogs: consoleLogs.length
                })
            };
        }

        if (event.httpMethod === 'GET') {
            // Return console logs
            const queryParams = event.queryStringParameters || {};
            const limit = parseInt(queryParams.limit) || 100;
            const level = queryParams.level;
            const since = queryParams.since;

            let filteredLogs = [...consoleLogs];

            // Filter by level if specified
            if (level) {
                filteredLogs = filteredLogs.filter(log => log.level === level);
            }

            // Filter by timestamp if specified
            if (since) {
                const sinceDate = new Date(since);
                filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) > sinceDate);
            }

            // Apply limit
            filteredLogs = filteredLogs.slice(-limit);

            // Get summary
            const summary = {
                total: consoleLogs.length,
                filtered: filteredLogs.length,
                byLevel: {},
                errors: consoleLogs.filter(log => log.level === 'error').length,
                warnings: consoleLogs.filter(log => log.level === 'warn').length,
                logs: filteredLogs
            };

            // Count by level
            consoleLogs.forEach(log => {
                summary.byLevel[log.level] = (summary.byLevel[log.level] || 0) + 1;
            });

            return {
                statusCode: 200,
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(summary)
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };

    } catch (error) {
        console.error('Console stream function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
