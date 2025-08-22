// Netlify Serverless Function for Football Web Pages API
// Handles both GET and POST requests to avoid CORS issues

exports.handler = async function(event, context) {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-RapidAPI-Key, X-RapidAPI-Host',
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
        
        // Get API key from environment variables
        const apiKey = process.env.RAPIDAPI_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'API key not configured' })
            };
        }

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
        const { from, to, comp, season } = params;
        if (!from || !to || !comp || !season) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Missing required parameters: from, to, comp, season' 
                })
            };
        }

        // Make request to Football Web Pages API
        const apiUrl = `https://football-web-pages1.p.rapidapi.com/fixtures-results.json?from=${from}&to=${to}&comp=${comp}&season=${season}`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': 'football-web-pages1.p.rapidapi.com'
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Transform response to match app's expected format
        const transformedData = transformApiResponse(data);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(transformedData)
        };

    } catch (error) {
        console.error('Serverless function error:', error);
        
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

// Transform API response to match app's expected format
function transformApiResponse(apiData) {
    try {
        if (!apiData || !apiData['fixtures-results'] || !apiData['fixtures-results'].matches) {
            return {
                fixtures: [],
                total: 0,
                error: 'No matches found in API response'
            };
        }

        const matches = apiData['fixtures-results'].matches;
        
        const transformedFixtures = matches.map((match, index) => {
            // Extract team names
            let homeTeam, awayTeam;
            
            if (match['home-team'] && match['away-team']) {
                homeTeam = extractTeamName(match['home-team']);
                awayTeam = extractTeamName(match['away-team']);
            } else if (match.home && match.away) {
                homeTeam = extractTeamName(match.home);
                awayTeam = extractTeamName(match.away);
            } else {
                return null;
            }

            // Extract other match data
            const matchDate = match.date || new Date().toISOString().split('T')[0];
            const matchTime = match.time || 'TBD';
            const venue = match.venue || 'TBD';
            const status = determineMatchStatus(match);
            const homeScore = match['home-score'] || match.homeScore || null;
            const awayScore = match['away-score'] || match.awayScore || null;

            return {
                homeTeam: homeTeam,
                awayTeam: awayTeam,
                date: matchDate,
                kickOffTime: matchTime,
                venue: venue,
                status: status,
                homeScore: homeScore,
                awayScore: awayScore,
                apiData: match
            };
        }).filter(fixture => fixture !== null);

        return {
            fixtures: transformedFixtures,
            total: transformedFixtures.length,
            rawResponse: apiData
        };

    } catch (error) {
        console.error('Error transforming API response:', error);
        return {
            fixtures: [],
            total: 0,
            error: 'Error transforming API response',
            message: error.message
        };
    }
}

// Extract team name with multiple fallback strategies
function extractTeamName(teamData) {
    if (typeof teamData === 'string') {
        return teamData;
    } else if (typeof teamData === 'object') {
        const nameProperties = ['name', 'title', 'displayName', 'teamName', 'fullName', 'shortName'];
        
        for (const prop of nameProperties) {
            if (teamData[prop]) {
                return teamData[prop];
            }
        }
        
        return JSON.stringify(teamData);
    }
    
    return 'Unknown Team';
}

// Determine match status based on available data
function determineMatchStatus(match) {
    if (match.status) {
        return match.status;
    }
    
    const hasHomeScore = match['home-score'] || match.homeScore;
    const hasAwayScore = match['away-score'] || match.awayScore;
    
    if (hasHomeScore !== null && hasAwayScore !== null) {
        return 'FT'; // Full Time
    }
    
    if (match.date) {
        const matchDate = new Date(match.date);
        const now = new Date();
        
        if (matchDate < now) {
            return 'FT'; // Assume finished if past date
        }
    }
    
    return 'NS'; // Not Started
}

