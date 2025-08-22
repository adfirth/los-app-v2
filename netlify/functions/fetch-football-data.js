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
        const { competition, matchday, season } = event.queryStringParameters || {};
        
        if (!competition || !matchday) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required parameters: competition and matchday' })
            };
        }

        // Get API key from environment variables
        const apiKey = process.env.FOOTBALL_DATA_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Football-Data.org API key not configured' })
            };
        }

        // Build the API URL
        const url = `https://api.football-data.org/v2/competitions/${competition}/matches?matchday=${matchday}${season ? `&season=${season}` : ''}`;
        
        console.log(`🔍 Fetching football data from: ${url}`);

        // Make the API request
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Auth-Token': apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log(`✅ Football data fetched successfully: ${data.matches?.length || 0} matches`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('❌ Error fetching football data:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Failed to fetch football data',
                details: error.message 
            })
        };
    }
};
