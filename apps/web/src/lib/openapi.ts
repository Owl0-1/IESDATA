export type OpenApiSchema = {
  type?: string;
  format?: string;
  default?: unknown;
  example?: unknown;
  description?: string;
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  $ref?: string;
  required?: string[];
};

export type OpenApiParameter = {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: OpenApiSchema;
};

export type OpenApiMediaType = {
  example?: unknown;
  examples?: Record<string, { value?: unknown }>;
  schema?: OpenApiSchema;
};

export type OpenApiResponse = {
  description?: string;
  content?: Record<string, OpenApiMediaType>;
};

export type OpenApiOperation = {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  security?: Array<Record<string, string[]>>;
  responses?: Record<string, OpenApiResponse>;
};

export type OpenApiDocument = {
  openapi?: string;
  info?: { title?: string; description?: string; version?: string };
  tags?: Array<string | { name: string }>;
  paths: Record<string, Partial<Record<HttpMethod, OpenApiOperation>>>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
    securitySchemes?: Record<
      string,
      { type?: string; name?: string; in?: string }
    >;
  };
};

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type ParsedResponse = {
  status: string;
  description: string;
  example?: unknown;
};

export type ParsedOperation = {
  id: string;
  method: HttpMethod;
  path: string;
  tag: string;
  summary: string;
  description?: string;
  parameters: OpenApiParameter[];
  responses: ParsedResponse[];
  requiresApiKey: boolean;
};

const METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete'];

function responseExample(res: OpenApiResponse): unknown | undefined {
  const media =
    res.content?.['application/json'] ??
    Object.values(res.content ?? {})[0];
  if (!media) return undefined;
  if (media.example !== undefined) return media.example;
  if (media.schema?.example !== undefined) return media.schema.example;
  const named = media.examples && Object.values(media.examples)[0];
  if (named?.value !== undefined) return named.value;
  return undefined;
}

export function parseOpenApi(doc: OpenApiDocument): {
  title: string;
  description: string;
  version: string;
  tags: string[];
  operations: ParsedOperation[];
} {
  const operations: ParsedOperation[] = [];

  for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
    if (!pathItem) continue;
    for (const method of METHODS) {
      const op = pathItem[method];
      if (!op) continue;
      const tag = op.tags?.[0] ?? 'default';
      const id = op.operationId ?? `${method}_${path}`;
      operations.push({
        id,
        method,
        path,
        tag,
        summary: op.summary ?? id,
        description: op.description,
        parameters: op.parameters ?? [],
        responses: Object.entries(op.responses ?? {}).map(
          ([status, res]) => ({
            status,
            description: res.description || '—',
            example: responseExample(res),
          }),
        ),
        requiresApiKey: Boolean(
          op.security?.some((entry) => 'api-key' in entry),
        ),
      });
    }
  }

  const orderedTags: string[] = [];
  for (const op of operations) {
    if (!orderedTags.includes(op.tag)) orderedTags.push(op.tag);
  }

  return {
    title: doc.info?.title ?? 'API',
    description: doc.info?.description ?? '',
    version: doc.info?.version ?? '',
    tags: orderedTags,
    operations,
  };
}

export function schemaTypeLabel(schema?: OpenApiSchema): string {
  if (!schema) return 'string';
  if (schema.$ref) return schema.$ref.split('/').pop() ?? 'object';
  if (schema.type === 'array') {
    return `array<${schemaTypeLabel(schema.items)}>`;
  }
  return schema.type ?? 'string';
}
