export const API_SPEC = {
  version: '1.0.0',
  baseUrl: 'https://api.turbofix.co.in/v1',
  description: 'TurboFix Industrial Maintenance API',
  auth: {
    type: 'Bearer Token',
    header: 'Authorization: Bearer YOUR_API_KEY'
  },
  rateLimit: {
    requests: 1000,
    period: '1 hour',
    headers: {
      limit: 'X-RateLimit-Limit',
      remaining: 'X-RateLimit-Remaining',
      reset: 'X-RateLimit-Reset'
    }
  },
  endpoints: {
    machines: {
      list: {
        method: 'GET',
        path: '/machines',
        description: 'List all machines',
        params: {
          page: { type: 'integer', required: false, description: 'Page number (default: 1)' },
          limit: { type: 'integer', required: false, description: 'Items per page (default: 50)' },
          status: { type: 'string', required: false, description: 'Filter by status' },
          search: { type: 'string', required: false, description: 'Search by name or ID' }
        },
        response: {
          code: 200,
          body: {
            data: [
              {
                id: 'string',
                name: 'string',
                status: 'string',
                uptime: 'number',
                lastMaintenance: 'string',
                primaryTechnician: 'string'
              }
            ],
            pagination: { page: 'number', limit: 'number', total: 'number' }
          }
        },
        examples: {
          curl: `curl -X GET "https://api.turbofix.co.in/v1/machines?limit=10" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
          javascript: `const machines = await fetch('https://api.turbofix.co.in/v1/machines', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
}).then(r => r.json());`,
          python: `import requests
response = requests.get(
  'https://api.turbofix.co.in/v1/machines',
  headers={'Authorization': 'Bearer YOUR_API_KEY'}
)
machines = response.json()`
        }
      },
      get: {
        method: 'GET',
        path: '/machines/:id',
        description: 'Get a specific machine',
        params: {
          id: { type: 'string', required: true, description: 'Machine ID' }
        },
        response: {
          code: 200,
          body: {
            id: 'string',
            name: 'string',
            status: 'string',
            location: 'string',
            uptime: 'number',
            lastMaintenance: 'string'
          }
        }
      },
      create: {
        method: 'POST',
        path: '/machines',
        description: 'Create a new machine',
        body: {
          name: { type: 'string', required: true },
          location: { type: 'string', required: false },
          status: { type: 'string', required: false }
        },
        response: { code: 201 }
      }
    },
    tickets: {
      list: {
        method: 'GET',
        path: '/tickets',
        description: 'List maintenance tickets',
        params: {
          machineId: { type: 'string', required: false },
          status: { type: 'string', required: false },
          urgency: { type: 'string', required: false }
        }
      },
      create: {
        method: 'POST',
        path: '/tickets',
        description: 'Create a maintenance ticket',
        body: {
          machineId: { type: 'string', required: true },
          issue: { type: 'string', required: true },
          urgency: { type: 'string', required: false }
        },
        response: { code: 201 }
      }
    },
    webhooks: {
      list: {
        method: 'GET',
        path: '/webhooks',
        description: 'List registered webhooks'
      },
      create: {
        method: 'POST',
        path: '/webhooks',
        description: 'Register a webhook endpoint',
        body: {
          url: { type: 'string', required: true },
          events: { type: 'array', required: true, description: 'Events to subscribe to' },
          secret: { type: 'string', required: false, description: 'HMAC secret for validation' }
        },
        response: { code: 201 }
      },
      delete: {
        method: 'DELETE',
        path: '/webhooks/:id',
        description: 'Delete a webhook'
      }
    }
  },
  webhookEvents: {
    'machine.created': { description: 'Machine added to system' },
    'machine.updated': { description: 'Machine details changed' },
    'machine.deleted': { description: 'Machine removed from system' },
    'ticket.created': { description: 'New maintenance ticket' },
    'ticket.completed': { description: 'Ticket marked as done' },
    'alert.triggered': { description: 'System alert generated' },
    'maintenance.scheduled': { description: 'Preventive maintenance scheduled' }
  },
  errors: {
    401: { message: 'Unauthorized', description: 'Invalid or missing API key' },
    403: { message: 'Forbidden', description: 'Insufficient permissions' },
    404: { message: 'Not Found', description: 'Resource does not exist' },
    429: { message: 'Too Many Requests', description: 'Rate limit exceeded' },
    500: { message: 'Internal Server Error', description: 'Server error occurred' }
  }
};

export function getEndpointDocs(endpoint) {
  const parts = endpoint.split('.');
  let current = API_SPEC.endpoints;

  for (const part of parts) {
    current = current[part];
    if (!current) return null;
  }

  return current;
}

export function getWebhookEvents() {
  return Object.entries(API_SPEC.webhookEvents).map(([event, data]) => ({
    event,
    ...data
  }));
}
