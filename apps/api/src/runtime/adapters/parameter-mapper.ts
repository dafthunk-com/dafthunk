/**
 * Cloudflare Parameter Mapper
 *
 * Implementation of ParameterMapper port for the Cloudflare platform.
 * Wraps existing parameter-mapper functions with ObjectStore dependency injection.
 */

import type { ObjectStore, ParameterMapper } from "@dafthunk/runtime";
import type { ParameterValue as ApiParameterValue } from "@dafthunk/types";
import {
  apiToNodeParameter,
  nodeToApiParameter,
} from "../../nodes/parameter-mapper";

/**
 * Cloudflare implementation of ParameterMapper.
 * Wraps the existing parameter-mapper functions with ObjectStore dependency injection.
 */
export class CloudflareParameterMapper implements ParameterMapper {
  constructor(private readonly objectStore: ObjectStore) {}

  async nodeToApi(
    type: string,
    value: unknown,
    organizationId: string,
    executionId?: string
  ): Promise<ApiParameterValue> {
    return nodeToApiParameter(
      type as any,
      value,
      this.objectStore,
      organizationId,
      executionId
    );
  }

  async apiToNode(type: string, value: ApiParameterValue): Promise<unknown> {
    return apiToNodeParameter(type as any, value, this.objectStore);
  }
}
