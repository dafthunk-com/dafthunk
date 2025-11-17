# OpenSCAD Integration Plan

## Overview
Add OpenSCAD-style 3D modeling capabilities to Dafthunk using the Manifold library. This will enable users to create and manipulate 3D geometry using primitive shapes, transformations, and Boolean operations through a visual workflow interface.

## Library Selection: Manifold-3D

**Chosen Library:** `manifold-3d` (npm package)

**Justification:**
- Native glTF/GLB export (no conversion needed)
- OpenSCAD-inspired API (familiar to CAD users)
- 5-30x faster than OpenSCAD's CGAL backend
- WASM-based, compatible with Cloudflare Workers
- Proven Node.js support
- Active development and maintenance

**Security Profile:**
- **Safe for use without code execution** - pure computational library
- No arbitrary JavaScript execution required
- Same risk profile as existing 3D nodes (`dem-to-gltf-node`)
- WASM provides memory isolation
- Only requires parameter validation (Zod schemas)

## Implementation Plan

### Phase 1: Setup & Dependencies

**Tasks:**
1. Add `manifold-3d` to `apps/api/package.json` dependencies
2. Run `pnpm install` to install the package
3. Create shared utilities file: `apps/api/src/nodes/3d/manifold-utils.ts`
   - Manifold WASM initialization function
   - glTF conversion helpers
   - Memory management utilities (proper `.delete()` cleanup)
   - Error handling for geometry operations

**Verification:**
- Package installs successfully
- TypeScript types are available
- Can initialize Manifold in test script

---

### Phase 2: Primitive Shape Nodes

Create individual nodes for basic 3D primitives in `apps/api/src/nodes/3d/`:

#### 1. `openscad-cube-node.ts`
```typescript
Inputs:
  - size: json (array [x,y,z] or single number for all dimensions)
  - center: boolean (optional, default false)
Outputs:
  - mesh: gltf (3D geometry in GLB format)
```

#### 2. `openscad-sphere-node.ts`
```typescript
Inputs:
  - radius: number (sphere radius)
  - circularSegments: number (optional, mesh quality)
Outputs:
  - mesh: gltf
```

#### 3. `openscad-cylinder-node.ts`
```typescript
Inputs:
  - height: number
  - radiusBottom: number (bottom radius)
  - radiusTop: number (optional, for cone - defaults to radiusBottom)
  - circularSegments: number (optional, mesh quality)
  - center: boolean (optional, default false)
Outputs:
  - mesh: gltf
```

**Implementation Pattern:**
- Follow `dem-to-gltf-node` structure exactly
- Use Zod schemas for input validation
- Call Manifold API directly (no code execution)
- Convert Manifold mesh to glTF using `@gltf-transform/core` or native export
- Proper memory cleanup with try/finally blocks

---

### Phase 3: Transformation Nodes

Create nodes that transform existing meshes:

#### 4. `openscad-translate-node.ts`
```typescript
Inputs:
  - mesh: gltf (input geometry)
  - offset: json (array [x,y,z] translation)
Outputs:
  - mesh: gltf (transformed geometry)
```

#### 5. `openscad-rotate-node.ts`
```typescript
Inputs:
  - mesh: gltf (input geometry)
  - rotation: json (array [x,y,z] in degrees)
Outputs:
  - mesh: gltf (rotated geometry)
```

#### 6. `openscad-scale-node.ts`
```typescript
Inputs:
  - mesh: gltf (input geometry)
  - scale: json (array [x,y,z] or single number for uniform scaling)
Outputs:
  - mesh: gltf (scaled geometry)
```

**Implementation Notes:**
- Convert glTF input back to Manifold mesh
- Apply transformation using Manifold's matrix operations
- Export back to glTF
- Handle coordinate system conversions if needed

---

### Phase 4: Boolean Operation Nodes (CSG)

Create Constructive Solid Geometry operation nodes:

#### 7. `openscad-union-node.ts`
```typescript
Inputs:
  - meshA: gltf (first geometry)
  - meshB: gltf (second geometry)
Outputs:
  - mesh: gltf (combined geometry)
```

#### 8. `openscad-difference-node.ts`
```typescript
Inputs:
  - meshA: gltf (base geometry)
  - meshB: gltf (geometry to subtract)
Outputs:
  - mesh: gltf (subtracted geometry)
```

#### 9. `openscad-intersection-node.ts`
```typescript
Inputs:
  - meshA: gltf (first geometry)
  - meshB: gltf (second geometry)
Outputs:
  - mesh: gltf (intersected geometry)
```

**Implementation Notes:**
- Parse both input glTF meshes to Manifold format
- Perform Boolean operation using Manifold's CSG functions
- Handle edge cases (non-manifold geometry, empty results)
- Clean up all intermediate objects

---

### Phase 5: Registration & Integration

**Tasks:**
10. Register all nodes in `apps/api/src/nodes/cloudflare-node-registry.ts`
    - Add under `developerMode` flag (consistent with existing 3D nodes)
    - Import all node classes
    - Call `this.registerImplementation()` for each

11. Update type definitions (if needed)
    - Verify `gltf` type exists in `packages/types/`
    - Add any new shared types

12. Create node metadata
    - Add descriptions for each node
    - Include example usage/workflow patterns
    - Document parameters clearly

**File Updates:**
```typescript
// apps/api/src/nodes/cloudflare-node-registry.ts
import { OpenSCADCubeNode } from "./3d/openscad-cube-node";
import { OpenSCADSphereNode } from "./3d/openscad-sphere-node";
// ... import all nodes

if (this.developerMode) {
  // Existing 3D nodes
  this.registerImplementation(DemToGltfNode);

  // New OpenSCAD nodes
  this.registerImplementation(OpenSCADCubeNode);
  this.registerImplementation(OpenSCADSphereNode);
  this.registerImplementation(OpenSCADCylinderNode);
  this.registerImplementation(OpenSCADTranslateNode);
  this.registerImplementation(OpenSCADRotateNode);
  this.registerImplementation(OpenSCADScaleNode);
  this.registerImplementation(OpenSCADUnionNode);
  this.registerImplementation(OpenSCADDifferenceNode);
  this.registerImplementation(OpenSCADIntersectionNode);
}
```

---

### Phase 6: Testing & Validation

**Build & Type Checking:**
```bash
pnpm --filter '@dafthunk/api' build
pnpm --filter '@dafthunk/api' typecheck
pnpm typecheck  # All workspaces
```

**Manual Testing Workflow:**
1. Create cube primitive → Verify glTF output
2. Create sphere primitive → Verify glTF output
3. Chain: Cube → Translate → Verify transformation
4. Chain: Cube + Sphere → Union → Verify Boolean operation
5. Complex workflow: Multiple primitives + transforms + CSG operations

**Validation Checklist:**
- [ ] All nodes build without errors
- [ ] No TypeScript errors
- [ ] glTF outputs render correctly in 3D viewer
- [ ] Memory cleanup works (no WASM leaks)
- [ ] Invalid inputs return proper error messages
- [ ] Works within Cloudflare Workers constraints (bundle size, memory)

---

## Security Considerations

**Approach:** Direct API calls (NO code execution)

**Security Measures:**
- No QuickJS or arbitrary JavaScript execution
- Only validate primitive inputs (numbers, arrays, booleans)
- Follow existing `dem-to-gltf-node` security pattern
- Input validation with Zod schemas
- Proper WASM memory management
- No access to network, filesystem, or environment

**Risk Level:** LOW (same as existing 3D/image processing nodes)

---

## Future Enhancements (Not in Initial Implementation)

**Potential Phase 2 Features:**
- Additional primitives (torus, polyhedron, prism)
- Array/pattern operations (linear_extrude, rotate_extrude)
- Advanced transformations (mirror, hull, minkowski)
- Material/color properties
- Text/2D extrusion nodes

**Code Execution Option (if requested later):**
- Requires QuickJS sandbox implementation
- Would need careful API exposure design
- Security review required
- Consider DSL or builder pattern instead

---

## Success Criteria

1. **Functional:** Users can create basic 3D models by chaining nodes in workflow editor
2. **Performance:** Executes within Cloudflare Workers limits (memory, CPU time)
3. **Secure:** No arbitrary code execution, proper input validation
4. **Maintainable:** Follows existing codebase patterns and conventions
5. **Type-safe:** Full TypeScript coverage, no `any` types

---

## Dependencies

**New:**
- `manifold-3d`: ^3.x.x (check latest stable version)

**Existing (already in use):**
- `@gltf-transform/core`: ^4.2.1 (for glTF manipulation)
- `zod`: (for input validation)

---

## Timeline Estimate

- **Phase 1 (Setup):** 1-2 hours
- **Phase 2 (Primitives):** 4-6 hours (3 nodes)
- **Phase 3 (Transforms):** 4-6 hours (3 nodes)
- **Phase 4 (Boolean ops):** 4-6 hours (3 nodes)
- **Phase 5 (Registration):** 1-2 hours
- **Phase 6 (Testing):** 2-4 hours

**Total:** ~16-26 hours for complete implementation

---

## Open Questions

1. Should we use Manifold's native GLB export or convert through `@gltf-transform/core`?
2. Do we need to support multiple input meshes for union (variadic) or keep it binary?
3. Should transformation nodes support material/color passthrough?
4. What mesh quality defaults should we use (circularSegments, etc.)?

---

## References

- Manifold Library: https://github.com/elalish/manifold
- OpenSCAD Documentation: https://openscad.org/documentation.html
- Existing Implementation: `apps/api/src/nodes/3d/dem-to-gltf-node.ts`
- Node Registry: `apps/api/src/nodes/cloudflare-node-registry.ts`
