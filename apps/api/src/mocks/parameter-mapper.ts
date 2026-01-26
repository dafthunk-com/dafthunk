/**
 * Mock Parameter Mapper
 *
 * Simplified parameter mapper for testing.
 * Passes values through without transformation.
 */

import type { ParameterValue as ApiParameterValue } from "@dafthunk/types";

import type { ParameterMapper } from "@dafthunk/runtime";

/**
 * Mock implementation of ParameterMapper.
 * For testing, values pass through without transformation.
 */
export class MockParameterMapper implements ParameterMapper {
  async nodeToApi(
    _type: string,
    value: unknown,
    _organizationId: string,
    _executionId?: string
  ): Promise<ApiParameterValue> {
    // Pass through - no storage
    return value as ApiParameterValue;
  }

  async apiToNode(_type: string, value: ApiParameterValue): Promise<unknown> {
    // Pass through - no loading
    return value;
  }
}
