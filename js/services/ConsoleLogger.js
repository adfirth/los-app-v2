// Console Logger Service
// Automatically captures console output for debugging and analysis

(function() {
    'use strict';
    
    // Wait for DOM to be ready
    function initConsoleLogger() {
        // Prevent multiple initializations
        if (window.consoleLogger) {
            return;
        }
        
        try {
            class ConsoleLogger {
                constructor() {
                    this.logs = [];
                    this.maxLogs = 1000;
                    this.isCapturing = false;
                    this.originalConsole = {};
                    this.streamingInterval = null;
                    this.setupConsoleCapture();
                }

                // Set up console capture
                setupConsoleCapture() {
                    try {
                        // Store original console methods
                        this.originalConsole.log = console.log;
                        this.originalConsole.error = console.error;
                        this.originalConsole.warn = console.warn;
                        this.originalConsole.info = console.info;
                        this.originalConsole.debug = console.debug;

                        // Override console methods
                        this.overrideConsoleMethod('log', 'log');
                        this.overrideConsoleMethod('error', 'error');
                        this.overrideConsoleMethod('warn', 'warn');
                        this.overrideConsoleMethod('info', 'info');
                        this.overrideConsoleMethod('debug', 'debug');


                    } catch (error) {
                        console.error('🔧 ConsoleLogger: Error setting up console capture:', error);
                    }
                }

                // Override a console method
                overrideConsoleMethod(method, level) {
                    try {
                        const original = this.originalConsole[method];
                        
                        console[method] = (...args) => {
                            try {
                                // Call original method
                                if (original && typeof original === 'function') {
                                    original.apply(console, args);
                                }
                                
                                // Capture the log
                                this.captureLog(level, args);
                            } catch (error) {
                                // Fallback to original if capture fails
                                if (original && typeof original === 'function') {
                                    original.apply(console, args);
                                }
                            }
                        };
                    } catch (error) {
                        console.error('🔧 ConsoleLogger: Error overriding console method:', method, error);
                    }
                }

                // Capture a log entry
                captureLog(level, args) {
                    if (!this.isCapturing) return;

                    try {
                        const timestamp = new Date().toISOString();
                        const message = args.map(arg => {
                            if (typeof arg === 'object') {
                                try {
                                    return JSON.stringify(arg);
                                } catch (e) {
                                    return String(arg);
                                }
                            }
                            return String(arg);
                        }).join(' ');

                        const logEntry = {
                            timestamp,
                            level,
                            message,
                            args: args.length > 1 ? args : undefined
                        };

                        this.logs.push(logEntry);

                        // Keep logs under max limit
                        if (this.logs.length > this.maxLogs) {
                            this.logs.shift();
                        }

                        // Auto-save to localStorage
                        this.saveToLocalStorage();
                    } catch (error) {
                        console.error('🔧 ConsoleLogger: Error capturing log:', error);
                    }
                }

                // Start capturing
                startCapture() {
                    this.isCapturing = true;
                }

                // Stop capturing
                stopCapture() {
                    this.isCapturing = false;
                }

                // Get all captured logs
                getLogs() {
                    return this.logs;
                }

                // Get logs by level
                getLogsByLevel(level) {
                    return this.logs.filter(log => log.level === level);
                }

                // Get logs since timestamp
                getLogsSince(timestamp) {
                    return this.logs.filter(log => new Date(log.timestamp) > new Date(timestamp));
                }

                // Clear logs
                clearLogs() {
                    this.logs = [];
                    this.saveToLocalStorage();
                }

                // Save logs to localStorage
                saveToLocalStorage() {
                    try {
                        localStorage.setItem('consoleLogs', JSON.stringify(this.logs));
                    } catch (e) {
                        console.warn('🔧 ConsoleLogger: Could not save to localStorage:', e);
                    }
                }

                // Load logs from localStorage
                loadFromLocalStorage() {
                    try {
                        const saved = localStorage.getItem('consoleLogs');
                        if (saved) {
                            this.logs = JSON.parse(saved);
                            console.log(`🔧 ConsoleLogger: Loaded ${this.logs.length} logs from localStorage`);
                        }
                    } catch (e) {
                        console.warn('🔧 ConsoleLogger: Could not load from localStorage:', e);
                    }
                }

                // Export logs as JSON
                exportLogs() {
                    try {
                        const dataStr = JSON.stringify(this.logs, null, 2);
                        const dataBlob = new Blob([dataStr], { type: 'application/json' });
                        
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(dataBlob);
                        link.download = `console-logs-${new Date().toISOString().split('T')[0]}.json`;
                        link.click();
                        
                        console.log('🔧 ConsoleLogger: Logs exported');
                    } catch (error) {
                        console.error('🔧 ConsoleLogger: Error exporting logs:', error);
                    }
                }

                // Get logs summary
                getLogsSummary() {
                    try {
                        const summary = {
                            total: this.logs.length,
                            byLevel: {},
                            recent: this.logs.slice(-10),
                            errors: this.getLogsByLevel('error').length,
                            warnings: this.getLogsByLevel('warn').length
                        };

                        // Count by level
                        this.logs.forEach(log => {
                            summary.byLevel[log.level] = (summary.byLevel[log.level] || 0) + 1;
                        });

                        return summary;
                    } catch (error) {
                        console.error('🔧 ConsoleLogger: Error getting summary:', error);
                        return { total: 0, byLevel: {}, recent: [], errors: 0, warnings: 0 };
                    }
                }

                // Display logs in console
                displayLogs(limit = 50) {
                    try {
                        const recentLogs = this.logs.slice(-limit);
                        console.group('🔧 ConsoleLogger: Recent Logs');
                        recentLogs.forEach(log => {
                            const method = this.originalConsole[log.level] || console.log;
                            method.call(console, `[${log.timestamp}] ${log.level.toUpperCase()}:`, log.message);
                        });
                        console.groupEnd();
                    } catch (error) {
                        console.error('🔧 ConsoleLogger: Error displaying logs:', error);
                    }
                }

                // Send logs to Netlify function for real-time streaming
                async streamLogsToNetlify() {
                    try {
                        const response = await fetch('/.netlify/functions/console-stream', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                logs: this.logs.slice(-50), // Send last 50 logs
                                timestamp: new Date().toISOString(),
                                userAgent: navigator.userAgent,
                                url: window.location.href
                            })
                        });

                        if (response.ok) {
                            return true;
                        } else {
                            return false;
                        }
                    } catch (error) {
                        return false;
                    }
                }

                // Auto-stream logs every 5 seconds
                startAutoStreaming() {
                    try {
                        if (this.streamingInterval) {
                            clearInterval(this.streamingInterval);
                        }
                        
                        this.streamingInterval = setInterval(() => {
                            if (this.logs.length > 0) {
                                this.streamLogsToNetlify();
                            }
                        }, 5000); // Stream every 5 seconds
                        
                        console.log('🔧 ConsoleLogger: Auto-streaming started (every 5 seconds)');
                    } catch (error) {
                        console.error('🔧 ConsoleLogger: Error starting auto-streaming:', error);
                    }
                }

                // Stop auto-streaming
                stopAutoStreaming() {
                    try {
                        if (this.streamingInterval) {
                            clearInterval(this.streamingInterval);
                            this.streamingInterval = null;
                            console.log('🔧 ConsoleLogger: Auto-streaming stopped');
                        }
                    } catch (error) {
                        console.error('🔧 ConsoleLogger: Error stopping auto-streaming:', error);
                    }
                }
            }

            // Create global instance
            window.consoleLogger = new ConsoleLogger();

            // Verify the instance was created successfully
            if (!window.consoleLogger || typeof window.consoleLogger.getLogs !== 'function') {
                throw new Error('Failed to create ConsoleLogger instance');
            }

            // Auto-start capture
            window.consoleLogger.startCapture();

            // Load existing logs
            window.consoleLogger.loadFromLocalStorage();

            // Start auto-streaming to Netlify
            window.consoleLogger.startAutoStreaming();

            // Dispatch ready event for dashboard
            window.dispatchEvent(new CustomEvent('consoleLoggerReady', { 
                detail: { consoleLogger: window.consoleLogger } 
            }));

            // Add global helper functions
            window.getConsoleLogs = () => window.consoleLogger.getLogs();
            window.getConsoleSummary = () => window.consoleLogger.getLogsSummary();
            window.exportConsoleLogs = () => window.consoleLogger.exportLogs();
            window.displayConsoleLogs = (limit) => window.consoleLogger.displayLogs(limit);
            window.clearConsoleLogs = () => window.consoleLogger.clearLogs();
            window.startConsoleStreaming = () => window.consoleLogger.startAutoStreaming();
            window.stopConsoleStreaming = () => window.consoleLogger.stopAutoStreaming();

            console.log('🔧 ConsoleLogger: Service loaded and ready');
            console.log('🔧 ConsoleLogger: Use getConsoleLogs(), getConsoleSummary(), exportConsoleLogs(), displayConsoleLogs(), or clearConsoleLogs()');
            
        } catch (error) {
            console.error('🔧 ConsoleLogger: Failed to initialize:', error);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initConsoleLogger);
    } else {
        initConsoleLogger();
    }
})();
