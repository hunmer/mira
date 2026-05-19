import {
    INodeType,
    INodeTypeDescription,
    ITriggerResponse,
    ITriggerFunctions,
    NodeConnectionType,
} from 'n8n-workflow';
import WebSocket from 'ws';

export class MiraWebSocketTrigger implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira WebSocket Trigger',
        name: 'miraWebSocketTrigger',
        icon: 'file:mira.svg',
        group: ['trigger'],
        version: 1,
        subtitle: '={{$parameter["url"]}}',
        description: 'Trigger workflow from Mira WebSocket events',
        defaults: {
            name: 'Mira WebSocket Trigger',
            color: '#1f77b4'
        },
        inputs: [],
        outputs: [NodeConnectionType.Main],
        credentials: [],
        webhooks: [],
        properties: [
            {
                displayName: 'Mira WebSocket URL',
                name: 'url',
                type: 'string',
                default: 'ws://127.0.0.1:7457',
                placeholder: 'ws://127.0.0.1:7457',
                description: 'Mira backend WebSocket endpoint URL',
                required: true,
            },
            {
                displayName: 'Authentication Token',
                name: 'token',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                default: '',
                description: 'Authentication token for the WebSocket connection',
                required: true,
            },
            {
                displayName: 'Event Filter',
                name: 'eventFilter',
                type: 'string',
                default: '',
                placeholder: 'file::created,file::updated',
                description: 'Comma-separated list of events to listen for (leave empty for all events)',
            },
            {
                displayName: 'Advanced Options',
                name: 'advancedOptions',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                options: [
                    {
                        displayName: 'Reconnect Initial Delay (ms)',
                        name: 'reconnectInitialMs',
                        type: 'number',
                        default: 1000,
                        description: 'Initial delay before attempting to reconnect after connection loss',
                    },
                    {
                        displayName: 'Reconnect Max Delay (ms)',
                        name: 'reconnectMaxMs',
                        type: 'number',
                        default: 30000,
                        description: 'Maximum delay between reconnection attempts',
                    },
                    {
                        displayName: 'Enable Debug Logging',
                        name: 'enableDebug',
                        type: 'boolean',
                        default: false,
                        description: 'Enable detailed logging for debugging purposes',
                    },
                ],
            },
        ],
    };

    async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
        let url = this.getNodeParameter('url', 0) as string;
        const token = this.getNodeParameter('token', 0) as string;
        const eventFilter = this.getNodeParameter('eventFilter', 0) as string;
        const advancedOptions = this.getNodeParameter('advancedOptions', 0) as any;

        const reconnectInitialMs = advancedOptions?.reconnectInitialMs ?? 1000;
        const reconnectMaxMs = advancedOptions?.reconnectMaxMs ?? 30000;
        const enableDebug = advancedOptions?.enableDebug ?? false;

        // Parse event filter into array
        const allowedEvents = eventFilter
            ? eventFilter.split(',').map(e => e.trim()).filter(e => e.length > 0)
            : [];

        const debug = (message: string, data?: any) => {
            if (enableDebug) {
                console.log(`[MiraWebSocketTrigger] ${message}`, data || '');
            }
        };

        const backoff = { delay: reconnectInitialMs };
        let closing = false;
        let ws: WebSocket | null = null;

        const onMessage = (data: WebSocket.RawData) => {
            try {
                const text = typeof data === 'string' ? data : data.toString('utf8');
                debug('Received raw message:', text);

                let messageObj;
                try {
                    messageObj = JSON.parse(text);
                } catch (parseError) {
                    debug('Failed to parse JSON, treating as plain text');
                    // Non-JSON payload - wrap in standard format
                    this.emit([[{
                        json: {
                            eventName: 'raw_message',
                            message: text,
                            timestamp: new Date().toISOString(),
                            parseError: true
                        }
                    }]]);
                    return;
                }

                // Validate message structure
                if (!messageObj || typeof messageObj !== 'object') {
                    debug('Invalid message structure');
                    return;
                }

                // Check if message has expected Mira format
                const eventName = messageObj.eventName || messageObj.event || 'unknown';
                const eventData = messageObj.data || messageObj.args || messageObj;

                // Apply event filter if configured
                if (allowedEvents.length > 0 && !allowedEvents.includes(eventName)) {
                    debug(`Event ${eventName} filtered out`);
                    return;
                }

                debug(`Processing event: ${eventName}`, eventData);

                // Emit in standardized format
                const outputData = {
                    eventName,
                    data: eventData,
                    timestamp: messageObj.timestamp || new Date().toISOString(),
                    source: 'mira_websocket'
                };

                this.emit([[{ json: outputData }]]);

            } catch (error) {
                debug('Error processing message:', error);
                // Emit error event
                this.emit([[{
                    json: {
                        eventName: 'error',
                        error: (error as Error).message,
                        timestamp: new Date().toISOString(),
                        source: 'mira_websocket'
                    }
                }]]);
            }
        };

        const connect = () => {
            if (closing) return;

            // Ensure URL has token parameter
            const urlWithToken = token ? `${url}?token=${encodeURIComponent(token)}` : url;

            debug(`Connecting to: ${urlWithToken.replace(/token=[^&]+/, 'token=***')}`);

            ws = new WebSocket(urlWithToken);

            ws.on('open', () => {
                debug('WebSocket connection established');
                // Reset backoff on successful connection
                backoff.delay = reconnectInitialMs;
            });

            ws.on('message', onMessage);

            ws.on('error', (err) => {
                debug('WebSocket error:', err.message);
                // Optionally emit error to workflow
                if (!closing) {
                    this.emit([[{
                        json: {
                            eventName: 'connection_error',
                            error: err.message,
                            timestamp: new Date().toISOString(),
                            source: 'mira_websocket'
                        }
                    }]]);
                }
            });

            ws.on('close', (code, reason) => {
                debug(`WebSocket closed: ${code} - ${reason}`);
                if (closing) return;

                // Emit disconnection event
                this.emit([[{
                    json: {
                        eventName: 'connection_closed',
                        code,
                        reason: reason.toString(),
                        timestamp: new Date().toISOString(),
                        source: 'mira_websocket'
                    }
                }]]);

                // Schedule reconnection
                setTimeout(connect, backoff.delay);
                backoff.delay = Math.min(backoff.delay * 2, reconnectMaxMs);
                debug(`Reconnecting in ${backoff.delay}ms`);
            });
        };

        debug('Starting Mira WebSocket trigger');
        connect();

        return {
            closeFunction: async () => {
                debug('Closing WebSocket connection');
                closing = true;
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.close(1000, 'n8n node stopped');
                }
            },
        };
    }
}
