# Dual Analysis Pattern

> A collaborative approach for high-quality requirements discovery and architectural design.

## Concept

The **Dual Analysis** pattern utilizes a collaborative dynamic between two distinct roles (or mindsets) to ensure robust and well-thought-out solutions. It moves away from a linear "think -> write" process to a cyclic "generate -> critique -> improve" loop.

## Roles

### 1. The Generator (Architect / Solution Lead)
*   **Goal:** Create a viable solution or requirement definition.
*   **Mindset:** Optimistic, creative, solution-oriented.
*   **Responsibilities:**
    *   Drafting the initial proposal.
    *   Defining the happy path.
    *   Focusing on business value and user needs.
    *   Structuring the document.

### 2. The Critic (Co-pilot / Skeptic)
*   **Goal:** Find flaws, risks, and edge cases in the proposal.
*   **Mindset:** Pessimistic, analytical, risk-aware.
*   **Responsibilities:**
    *   Challenging assumptions ("What if this fails?").
    *   Identifying edge cases and error states.
    *   Checking for security vulnerabilities and performance bottlenecks.
    *   Verifying alignment with constraints and standards.

## Workflow

1.  **Generation Phase:**
    *   The **Generator** produces an initial draft (e.g., a BRD or Architectural Design).
    *   Focus is on completeness of the core functionality.

2.  **Critique Phase:**
    *   The **Critic** reviews the draft specifically looking for gaps.
    *   Questions are raised: "How do we handle network failure?", "Is this scalable?", "What if the user input is malformed?".

3.  **Improvement Phase:**
    *   The **Generator** addresses the critique.
    *   The draft is refined to include error handling, edge case management, and mitigation strategies.

## When to Use

*   **Complex Requirements:** When requirements are vague or high-risk.
*   **Architectural Design:** When choosing between trade-offs.
*   **Security Planning:** To ensure threat modeling is comprehensive.
*   **Critical Algorithms:** When correctness is paramount.

## Example Prompting for AI

When acting as the **Critic**, use prompts like:
*   "Review this design for potential security vulnerabilities."
*   "Identify 3 edge cases where this logic might fail."
*   "What are the performance implications of this approach at scale?"

## Benefits

*   **Reduced Risk:** Early identification of potential issues.
*   **Higher Quality:** More robust and comprehensive documentation.
*   **Better Coverage:** Edge cases are considered from the start.