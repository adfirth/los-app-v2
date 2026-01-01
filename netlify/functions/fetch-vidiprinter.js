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
        const { comp, team, date } = event.queryStringParameters || {};

        if (!comp || !date) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required parameters: comp and date' })
            };
        }

        // Get API key from environment variables
        const apiKey = process.env.FWP_API_KEY;
        console.log('🔑 Netlify function: API key available:', !!apiKey);
        console.log('🔑 Netlify function: API key length:', apiKey ? apiKey.length : 0);

        if (!apiKey) {
            console.error('❌ Netlify function: FWP API key not configured in environment variables');
            console.log('🔍 Available environment variables:', Object.keys(process.env).filter(key => key.includes('API')));

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
        const url = `https://api.footballwebpages.co.uk/v2/vidiprinter.json?comp=${comp}&team=${team || 0}&date=${date}`;

        console.log(`🔍 Netlify function: Fetching vidiprinter data from: ${url}`);

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

        console.log(`✅ Netlify function: Vidiprinter data fetched successfully: ${data.events?.length || 0} events`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('❌ Netlify function: Error fetching vidiprinter data:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to fetch vidiprinter data',
                details: error.message
            })
        };
    }
};
