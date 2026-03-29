# 1C (firm): Extension hotfix via fix-only extension (`1c-alfa-extension-hotfix`)

## Purpose
Use an extension only as a temporary production hotfix without breaking upgradeability.

## Source of truth
- Policy for extensions: [`REG`](../sources/1c-alfa/reg.md#extensions)

## Rules
1. New business functionality belongs in the base configuration, not in the extension.
2. The extension is allowed only for urgent defect correction and should stay minimal.
3. Record an expiration date and the target release where the fix will be moved to the base configuration.
4. After the base fix is released, remove or deactivate the extension.
5. Update traceability for the related `<TICKET>`.

## Naming
Use a stable pattern:
`<TICKET> <USER> <DEADLINE> <SHORT_NAME>`

## Workflow
1. Confirm why a normal base release is too slow.
2. Create a fix-only extension.
3. Implement the smallest safe delta.
4. Add rollback and transfer notes for the base configuration.
5. Update changed objects / release traceability.
6. Schedule extension removal.

## Exit criteria
- defect fixed
- transfer to base configuration planned
- traceability updated
- extension cleanup planned

## Related
- `.kilocode/workflows/1c-alfa-sdlc.md`
- `.kilocode/workflows/1c-alfa-traceability.md`
