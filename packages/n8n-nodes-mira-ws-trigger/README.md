# Mira WebSocket Trigger for n8n

A custom n8n trigger node that connects to Mira server's WebSocket endpoint to receive real-time events.

## Features

- **Real-time Event Listening**: Connect to Mira server's WebSocket to receive events in real-time
- **Event Filtering**: Filter events by type to only receive specific events you care about
- **Token Authentication**: Secure connection using authentication tokens
- **Automatic Reconnection**: Built-in reconnection logic with exponential backoff
- **Standardized Output**: All events are formatted in a consistent structure
- **Debug Logging**: Optional debug logging for troubleshooting

## Installation

1. Build the node:
   ```bash
   npm run build
   ```

2. Install in your n8n instance according to n8n's community node installation instructions.

## Configuration

### Required Parameters

- **Mira WebSocket URL**: The WebSocket endpoint of your Mira server (e.g., `ws://127.0.0.1:7457`)
- **Authentication Token**: Token for authenticating with the Mira server

### Optional Parameters

- **Event Filter**: Comma-separated list of events to listen for (leave empty for all events)
  - Example: `file::created,file::updated,file::deleted`
- **Advanced Options**:
  - **Reconnect Initial Delay**: Initial delay before reconnection attempts (default: 1000ms)
  - **Reconnect Max Delay**: Maximum delay between reconnection attempts (default: 30000ms)
  - **Enable Debug Logging**: Enable detailed logging for debugging

## Output Format

All events from the trigger are formatted as follows:

```json
{
  "eventName": "file::created",
  "data": {
    "path": "/path/to/file",
    "size": 1024,
    "modified": "2025-08-22T10:30:00Z"
  },
  "timestamp": "2025-08-22T10:30:00.123Z",
  "source": "mira_websocket"
}
```

### Special Events

The trigger also emits system events:

- `connection_established`: When WebSocket connection is established
- `connection_error`: When connection errors occur
- `connection_closed`: When connection is closed
- `error`: When message parsing or other errors occur

## Usage Example

1. Add the Mira WebSocket Trigger to your workflow
2. Configure the WebSocket URL and authentication token
3. Optionally set event filters to only receive specific events
4. Connect the trigger to other nodes to process the incoming events

## Troubleshooting

- Enable debug logging in Advanced Options to see detailed connection and message information
- Check that the Mira server is running and accessible
- Verify the authentication token is correct
- Ensure the WebSocket port is not blocked by firewalls

## Development

To develop this node:

1. Install dependencies: `npm install`
2. Build: `npm run build`
3. Watch mode: `npm run dev`

## License

MIT
并每 5 秒推送一条 `orders.created` 事件。
