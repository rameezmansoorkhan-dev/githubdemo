import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

/** Minimal hand-authored OpenAPI spec mounted at /docs. */
export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'GitHub Repository Popularity Ranker API',
    version: '1.0.0',
    description:
      'Fetches GitHub repos, computes a popularity score, returns them ranked.',
  },
  servers: [{ url: 'http://localhost:4000' }],
  paths: {
    '/api/repositories': {
      get: {
        summary: 'Search and rank repositories',
        parameters: [
          { name: 'language', in: 'query', schema: { type: 'string' } },
          {
            name: 'createdAfter',
            in: 'query',
            schema: { type: 'string', example: '2025-01-01' },
          },
          {
            name: 'perPage',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 30 },
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'sortBy',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['score', 'stars', 'forks', 'recent'],
              default: 'score',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Ranked repositories',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ReposResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/Error' },
          '429': { $ref: '#/components/responses/Error' },
          '502': { $ref: '#/components/responses/Error' },
        },
      },
    },
  },
  components: {
    schemas: {
      ScoreBreakdown: {
        type: 'object',
        properties: {
          stars: { type: 'number' },
          forks: { type: 'number' },
          recency: { type: 'number' },
        },
      },
      Repo: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          fullName: { type: 'string' },
          url: { type: 'string' },
          description: { type: 'string', nullable: true },
          language: { type: 'string', nullable: true },
          stars: { type: 'integer' },
          forks: { type: 'integer' },
          pushedAt: { type: 'string', format: 'date-time' },
          score: { type: 'number' },
          scoreBreakdown: { $ref: '#/components/schemas/ScoreBreakdown' },
        },
      },
      ReposResponse: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          items: { type: 'array', items: { $ref: '#/components/schemas/Repo' } },
          rateLimitRemaining: { type: 'integer', nullable: true },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              code: { type: 'string' },
              details: {},
            },
          },
        },
      },
    },
    responses: {
      Error: {
        description: 'Error envelope',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
          },
        },
      },
    },
  },
} as const;

export function mountDocs(app: Express): void {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
}