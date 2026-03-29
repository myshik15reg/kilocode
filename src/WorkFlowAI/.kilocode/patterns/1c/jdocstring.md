# 1C `jdocstring` pattern

## Purpose
Document exported 1C procedures and functions in a predictable format.

## Core rule
Use `///` only for API documentation comments, not for change markers.

## Required sections
- `@description` — what the routine does
- `@param` — each input with type and meaning
- `@returns` — return value for functions
- `@throws` — expected error cases when relevant
- `@task` — ticket link if the project requires traceability in comments

## Example
```bsl
/// @description Builds payment schedule for the contract.
/// @param {DocumentRef.Contract} Contract - Source contract.
/// @param {Date} StartDate - Schedule start date.
/// @returns {ValueTable} Payment schedule.
Function BuildSchedule(Contract, StartDate) Export
EndFunction
```

## Related
- change markers: [`kilocode-change-marker.md`](kilocode-change-marker.md)

## Checklist
- exported routines documented
- params and return types match code
- docs stay short and factual
