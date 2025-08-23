/**
 * EmailService - Handles sending emails for club-related activities
 * Integrates with Netlify functions for reliable email delivery
 */

class EmailService {
    constructor() {
        this.isInitialized = false;
        this.netlifyFunctionUrl = '/.netlify/functions/send-club-welcome-email';
        this.isLocalDevelopment = window.location.hostname === '127.0.0.1' || 
                                 window.location.hostname === 'localhost' || 
                                 window.location.hostname === '192.168.1.1';
    }

    /**
     * Initialize the email service
     */
    async initialize() {
        if (this.isInitialized) {
            return this;
        }

        try {
            console.log('📧 EmailService: Initializing...');
            
            // Test connection to email function
            if (!this.isLocalDevelopment) {
                await this.testConnection();
            }
            
            this.isInitialized = true;
            console.log('✅ EmailService: Initialized successfully');
            
            return this;
        } catch (error) {
            console.error('❌ EmailService: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Test connection to the email function
     */
    async testConnection() {
        try {
            console.log('📧 EmailService: Testing email function connection...');
            
            const response = await fetch(this.netlifyFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clubName: 'Test Club',
                    clubId: 'test-club',
                    adminEmail: 'test@example.com'
                })
            });
            
            if (response.ok) {
                console.log('✅ EmailService: Email function connection test successful');
                return true;
            } else {
                const errorData = await response.json();
                console.warn('⚠️ EmailService: Email function test failed:', errorData);
                return false;
            }
        } catch (error) {
            console.warn('⚠️ EmailService: Email function connection test failed:', error);
            return false;
        }
    }

    /**
     * Send welcome email to new club administrator
     * @param {Object} clubData - Club information
     * @param {string} clubData.name - Club name
     * @param {string} clubData.clubId - Club ID
     * @param {string} clubData.contactEmail - Administrator email
     * @param {string} clubData.adminName - Administrator name (optional)
     * @param {string} clubData.website - Club website (optional)
     * @returns {Promise<Object>} - Result of email sending
     */
    async sendClubWelcomeEmail(clubData) {
        try {
            console.log(`📧 EmailService: Sending welcome email for club: ${clubData.name}`);
            
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Validate required data
            if (!clubData.name || !clubData.clubId || !clubData.contactEmail) {
                throw new Error('Missing required club data: name, clubId, or contactEmail');
            }

            // Prepare email data
            const emailData = {
                clubName: clubData.name,
                clubId: clubData.clubId,
                adminEmail: clubData.contactEmail,
                adminName: clubData.adminName || null,
                clubUrl: clubData.website || null
            };

            // Send email via Netlify function
            const response = await fetch(this.netlifyFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Email sending failed: ${response.status}`);
            }

            const result = await response.json();
            console.log(`✅ EmailService: Welcome email sent successfully to ${clubData.contactEmail}`);
            
            return {
                success: true,
                message: 'Welcome email sent successfully',
                sentTo: clubData.contactEmail,
                clubName: clubData.name
            };

        } catch (error) {
            console.error('❌ EmailService: Error sending welcome email:', error);
            
            return {
                success: false,
                error: error.message,
                clubName: clubData.name,
                adminEmail: clubData.contactEmail
            };
        }
    }

    /**
     * Send test email (for development/testing)
     * @param {string} testEmail - Email address to send test to
     * @returns {Promise<Object>} - Result of test email
     */
    async sendTestEmail(testEmail) {
        try {
            console.log(`📧 EmailService: Sending test email to: ${testEmail}`);
            
            const testClubData = {
                name: 'Test Football Club',
                clubId: 'test-club',
                contactEmail: testEmail,
                adminName: 'Test Administrator',
                website: 'https://testclub.com'
            };
            
            return await this.sendClubWelcomeEmail(testClubData);
            
        } catch (error) {
            console.error('❌ EmailService: Error sending test email:', error);
            throw error;
        }
    }

    /**
     * Check if email service is available
     * @returns {boolean} - True if email service is available
     */
    isAvailable() {
        return this.isInitialized && !this.isLocalDevelopment;
    }

    /**
     * Get email service status
     * @returns {Object} - Service status information
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isLocalDevelopment: this.isLocalDevelopment,
            isAvailable: this.isAvailable(),
            netlifyFunctionUrl: this.netlifyFunctionUrl
        };
    }
}

// Make it globally available
window.EmailService = EmailService;

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    if (window.emailService) {
        await window.emailService.initialize();
    }
});

// For module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailService;
}
