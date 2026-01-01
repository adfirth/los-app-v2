const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        // Get query parameters
        const { endpoint, comp, season } = event.queryStringParameters || {};

        if (!endpoint || !comp) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required parameters: endpoint and comp' })
            };
        }

        // Get API key from environment variables
        const apiKey = process.env.FWP_API_KEY;
        console.log('🔑 Netlify function: API key available:', !!apiKey);

        if (!apiKey) {
            console.error('❌ Netlify function: FWP API key not configured in environment variables');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'FWP API key not configured',
                    details: 'Please set FWP_API_KEY environment variable in Netlify dashboard'
                })
            };
        }

        // Build the API URL - New Direct API Endpoint
        let url = `https://api.footballwebpages.co.uk/v2/${endpoint}.json?comp=${comp}`;
        if (season) {
            url += `&season=${season}`;
        }

        console.log(`🔍 Netlify function: Fetching fixtures data from: ${url}`);

        // Make the API request
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'FWP-API-Key': apiKey
            }
        });

        if (!response.ok) {
            console.error(`❌ Netlify function: API request failed: ${response.status} ${response.statusText}`);
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        console.log(`✅ Netlify function: Fixtures data fetched successfully from ${endpoint}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('❌ Netlify function: Error fetching fixtures data:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to fetch fixtures data',
                details: error.message
            })
        };
    }
};
