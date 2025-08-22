// Netlify Serverless Function for Team Badge API
// Handles requests to TheSportsDB API to avoid CORS issues

exports.handler = async function(event, context) {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const { httpMethod, body, queryStringParameters } = event;
        
        let params = {};
        
        if (httpMethod === 'GET') {
            // Handle GET request with query parameters
            params = queryStringParameters || {};
        } else if (httpMethod === 'POST') {
            // Handle POST request with body
            try {
                params = JSON.parse(body);
            } catch (error) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid JSON in request body' })
                };
            }
        }

        // Validate required parameters
        const { teamName, size } = params;
        if (!teamName) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Missing required parameter: teamName' 
                })
            };
        }

        // Make request to TheSportsDB API
        const apiUrl = `https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(teamName)}`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'LOS-App/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Process the response to extract badge URL
        let badgeUrl = null;
        if (data.teams && data.teams.length > 0) {
            const baseBadgeUrl = data.teams[0].strTeamBadge;
            if (baseBadgeUrl) {
                badgeUrl = size && size !== 'original' ? `${baseBadgeUrl}/${size}` : baseBadgeUrl;
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                teamName: teamName,
                badgeUrl: badgeUrl,
                size: size || 'original',
                rawResponse: data
            })
        };

    } catch (error) {
        console.error('Team badge function error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};
