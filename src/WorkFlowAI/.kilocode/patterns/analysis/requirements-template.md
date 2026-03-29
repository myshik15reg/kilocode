# Business Requirements Document (BRD) Template

> Template for capturing detailed business requirements using the Dual Analysis approach.

## 1. Executive Summary
*   **Objective:** What are we building and why?
*   **Target Audience:** Who is this for?
*   **Key Value:** What problem does it solve?

## 2. User Scenarios & Testing *(mandatory)*
*Describe prioritized user journeys. Each story should be independently testable.*

### User Story 1 - [Title] (Priority: P1)
*   **Story:** [Describe the journey in plain language]
*   **Why this priority:** [Why this matters most]
*   **Independent Test:** [How to test this story alone]
*   **Acceptance Scenarios:**
    1. **Given** [state], **When** [action], **Then** [outcome]
    2. **Given** [state], **When** [action], **Then** [outcome]

### User Story 2 - [Title] (Priority: P2)
*   **Story:** [Describe the journey]
*   **Why this priority:** [Reason]
*   **Independent Test:** [How to test this story alone]
*   **Acceptance Scenarios:**
    1. **Given** [state], **When** [action], **Then** [outcome]

### Edge Cases
*   What happens when [boundary condition]?
*   How does the system handle [error scenario]?

## 3. Functional Requirements
*List specific behaviors and functions of the system.*

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-01 | User Login | High | Users must be able to log in using email/password. |
| FR-02 | ... | ... | ... |

*Use `[NEEDS CLARIFICATION: ...]` for any ambiguity.*

## 4. Non-Functional Requirements (NFRs)
*Quality attributes, performance, security, etc.*

*   **Performance:** (e.g., Response time < 200ms)
*   **Scalability:** (e.g., Support 10k concurrent users)
*   **Security:** (e.g., Encryption at rest, OWASP compliance)
*   **Reliability:** (e.g., 99.9% uptime)

## 5. Constraints & Assumptions
*   **Technical Constraints:** (e.g., Must use PostgreSQL)
*   **Business Constraints:** (e.g., Budget, Deadline)
*   **Assumptions:** (e.g., External API is available)

## 6. Success Criteria *(mandatory)*
*Define measurable outcomes that indicate success.*

*   **SC-01:** [Measurable outcome]
*   **SC-02:** [Performance target]
*   **SC-03:** [User satisfaction or business metric]

## 7. Testing & Acceptance Criteria
*How do we know it works?*

*   [ ] Verify FR-01 with valid credentials.
*   [ ] Verify FR-01 with invalid credentials (lockout after 5 attempts).
*   [ ] Performance test under load.

## 8. Dual Analysis Notes (Critique & Refinement)
*Record of the critique phase.*

*   **Risks Identified:** [List potential risks found by the Critic]
*   **Edge Cases:** [List edge cases to handle]
*   **Mitigation Strategy:** [How the design was improved to address these]
