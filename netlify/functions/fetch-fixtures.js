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
        const apiKey = process.env.RAPIDAPI_KEY;
        console.log('🔑 Netlify function: API key available:', !!apiKey);
        
        if (!apiKey) {
            console.error('❌ Netlify function: RapidAPI key not configured in environment variables');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'RapidAPI key not configured',
                    details: 'Please set RAPIDAPI_KEY environment variable in Netlify dashboard'
                })
            };
        }

        // Build the API URL
        let url = `https://football-web-pages1.p.rapidapi.com/${endpoint}?comp=${comp}`;
        if (season) {
            url += `&season=${season}`;
        }
        
        console.log(`🔍 Netlify function: Fetching fixtures data from: ${url}`);

        // Make the API request
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': 'football-web-pages1.p.rapidapi.com'
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
