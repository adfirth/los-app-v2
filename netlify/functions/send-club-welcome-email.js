// Netlify Serverless Function for sending club welcome emails
// Uses SendGrid for reliable email delivery

const sgMail = require('@sendgrid/mail');

exports.handler = async function(event, context) {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse the request body
        const { clubName, clubId, adminEmail, clubUrl, adminName } = JSON.parse(event.body);

        // Validate required fields
        if (!clubName || !clubId || !adminEmail) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Missing required fields: clubName, clubId, adminEmail' 
                })
            };
        }

        // Get SendGrid API key from environment variables
        const sendgridApiKey = process.env.SENDGRID_API_KEY;
        if (!sendgridApiKey) {
            console.error('SendGrid API key not configured');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Email service not configured' })
            };
        }

        // Configure SendGrid
        sgMail.setApiKey(sendgridApiKey);

        // Create the welcome email
        const emailContent = createWelcomeEmail(clubName, clubId, adminEmail, clubUrl, adminName);

        // Prepare the email
        const msg = {
            to: adminEmail,
            from: process.env.FROM_EMAIL || 'noreply@losapp.com',
            subject: `Welcome to ${clubName} - Your Club is Ready!`,
            html: emailContent.html,
            text: emailContent.text
        };

        // Send the email
        await sgMail.send(msg);

        console.log(`✅ Welcome email sent successfully to ${adminEmail} for club ${clubName}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                message: 'Welcome email sent successfully',
                sentTo: adminEmail
            })
        };

    } catch (error) {
        console.error('❌ Error sending welcome email:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Failed to send welcome email',
                message: error.message 
            })
        };
    }
};

function createWelcomeEmail(clubName, clubId, adminEmail, clubUrl, adminName) {
    const baseUrl = process.env.BASE_URL || 'https://losapp.netlify.app';
    const adminNameDisplay = adminName || 'Club Administrator';
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${clubName}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        .highlight { background: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; }
        .info-box { background: #d1ecf1; padding: 15px; border-radius: 6px; border-left: 4px solid #17a2b8; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏟️ Welcome to ${clubName}!</h1>
            <p>Your club has been successfully created on LOS App</p>
        </div>
        
        <div class="content">
            <p>Hello ${adminNameDisplay},</p>
            
            <p>Congratulations! Your club <strong>${clubName}</strong> has been successfully created on the LOS App platform.</p>
            
            <div class="highlight">
                <h3>🎯 Next Steps - Register as Club Administrator</h3>
                <p>To start managing your club, you need to register as an administrator:</p>
                <ol>
                    <li>Visit the LOS App website</li>
                    <li>Click "Register" or "Sign Up"</li>
                    <li>Use this email address: <strong>${adminEmail}</strong></li>
                    <li>Select "${clubName}" as your club</li>
                    <li>Complete your registration</li>
                </ol>
            </div>
            
            <div class="info-box">
                <h4>🔑 Important Information</h4>
                <ul>
                    <li><strong>Club ID:</strong> ${clubId}</li>
                    <li><strong>Admin Email:</strong> ${adminEmail}</li>
                    <li><strong>Club URL:</strong> ${clubUrl || `${baseUrl}/club/${clubId}`}</li>
                </ul>
            </div>
            
            <p>Once registered, you'll have access to:</p>
            <ul>
                <li>🏆 Manage club settings and branding</li>
                <li>👥 Invite and manage club members</li>
                <li>⚽ Create and manage fixtures</li>
                <li>📊 View club statistics and leaderboards</li>
                <li>⚙️ Configure game rules and settings</li>
            </ul>
            
            <div style="text-align: center;">
                <a href="${baseUrl}/register" class="button">🚀 Register Now</a>
            </div>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <p>Welcome aboard!</p>
            <p><strong>The LOS App Team</strong></p>
        </div>
        
        <div class="footer">
            <p>This email was sent to ${adminEmail} for the club ${clubName}</p>
            <p>LOS App - Football League Management Platform</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
Welcome to ${clubName}!

Your club has been successfully created on LOS App.

Hello ${adminNameDisplay},

Congratulations! Your club ${clubName} has been successfully created on the LOS App platform.

NEXT STEPS - REGISTER AS CLUB ADMINISTRATOR
To start managing your club, you need to register as an administrator:

1. Visit the LOS App website
2. Click "Register" or "Sign Up"
3. Use this email address: ${adminEmail}
4. Select "${clubName}" as your club
5. Complete your registration

IMPORTANT INFORMATION
- Club ID: ${clubId}
- Admin Email: ${adminEmail}
- Club URL: ${clubUrl || `${baseUrl}/club/${clubId}`}

Once registered, you'll have access to:
- Manage club settings and branding
- Invite and manage club members
- Create and manage fixtures
- View club statistics and leaderboards
- Configure game rules and settings

Register now at: ${baseUrl}/register

If you have any questions or need assistance, please don't hesitate to contact our support team.

Welcome aboard!
The LOS App Team

---
This email was sent to ${adminEmail} for the club ${clubName}
LOS App - Football League Management Platform`;

    return { html, text };
}
