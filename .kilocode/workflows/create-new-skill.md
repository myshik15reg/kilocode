# Create New Skill Workflow

## Purpose
This workflow guides the agent through the process of creating a new skill for the Skills infrastructure. Skills are reusable capabilities that can be applied to repetitive tasks or specialized domains.

## When to Use
Use this workflow when:
- A task reveals a repetitive pattern that could be automated
- Multiple protocols require similar steps or procedures
- User requests help with a specific domain that could benefit from a dedicated skill
- Existing skills don't cover the current task requirements

## Workflow Steps

### Step 1: Analyze the Pattern
Before creating a new skill, identify the repetitive pattern:

1. **Identify the common task**: What specific task is being repeated?
   - Example: "Running tests in different projects"
   - Example: "Executing CLI commands safely"
   - Example: "Setting up development environments"

2. **Document the trigger conditions**: When should this skill be used?
   - What user requests trigger this skill?
   - What project situations require this skill?
   - What protocols would benefit from this skill?

3. **Analyze the steps involved**: What are the consistent steps in this pattern?
   - List all steps in order
   - Identify which steps are always the same
   - Note which steps vary based on context

4. **Identify required context**: What information does this skill need?
   - Which Memory Bank files should be read?
   - What project files should be checked?
   - What environment information is needed?

### Step 2: Design the Skill Structure
Create a comprehensive skill file with the following sections:

#### Required Sections:

**1. Purpose**
- Clear, concise description of what the skill does
- Why this skill exists
- What problems it solves

**2. Triggers**
- List of situations when this skill should be used
- User request patterns that trigger this skill
- Protocol scenarios that benefit from this skill

**3. Context**
- List of Memory Bank files to read
- List of project files to check
- Any other context requirements

**4. Workflow**
- Step-by-step instructions
- Clear, actionable steps
- Logical ordering of operations
- Decision points and branching logic

#### Recommended Sections:

**5. Best Practices**
- Tips for optimal usage
- Common patterns to follow
- Performance considerations

**6. Troubleshooting**
- Common issues and solutions
- Error scenarios and fixes
- Debugging tips

**7. Integration with Protocols**
- How to use this skill within protocols
- What to document in `plan.md`
- What to record in `execution.md`
- How to update Memory Bank if needed

**8. Examples**
- Concrete usage examples
- Sample commands or code
- Before/after scenarios

### Step 3: Create the Skill File
Write the skill file to `.kilocode/skills/[skill-name].md`:

```markdown
# [Skill Name] Skill

## Purpose
[Clear description of what this skill does]

## Triggers
Use this skill when:
- [Trigger condition 1]
- [Trigger condition 2]
- [Trigger condition 3]

## Context
Before using this skill, read:
- `.kilocode/rules/memory-bank/[relevant-file].md` - [Reason]
- `[project-file]` - [Reason]

## Workflow

### Step 1: [Step Title]
[Detailed instructions for this step]

### Step 2: [Step Title]
[Detailed instructions for this step]

[Continue with more steps...]

## Best Practices
- [Best practice 1]
- [Best practice 2]

## Troubleshooting

### [Issue 1]
[Description and solution]

### [Issue 2]
[Description and solution]

## Integration with Protocols
When this skill is used as part of a protocol:
1. [Action 1]
2. [Action 2]
3. [Action 3]

## Examples

### Example 1: [Example Title]
[Detailed example with steps]
```

### Step 4: Update Skills Index
Update `.kilocode/rules/skills-index.md` to include the new skill:

1. Add the skill to the "Available Skills" section
2. Categorize appropriately (Core Skills, Custom Skills, Domain-Specific Skills)
3. Provide a brief description of what the skill does

**Example update:**
```markdown
## Available Skills

### Core Skills
- `project-tests.md` - Standardized testing workflow
- `cli-master.md` - Safe and effective CLI usage
- `[new-skill-name].md` - [Brief description]

### Custom Skills
[Additional skills listed here]
```

### Step 5: Test the Skill
Before considering the skill complete:

1. **Review for clarity**: Is the skill easy to understand?
2. **Check for completeness**: Are all necessary steps included?
3. **Verify accuracy**: Do the instructions work as described?
4. **Test integration**: Does it integrate well with existing workflows?

### Step 6: Document the Creation
Record the skill creation in the appropriate location:

1. **If created during a protocol**: Add to protocol's `execution.md`
2. **If created independently**: Consider creating a brief protocol for the skill creation
3. **Update Memory Bank**: If the skill represents a significant pattern, update relevant Memory Bank files

## Skill Creation Checklist

Use this checklist to ensure quality:

- [ ] **Purpose is clear**: The skill's purpose is immediately understandable
- [ ] **Triggers are specific**: It's obvious when to use this skill
- [ ] **Context is defined**: Required context files are listed
- [ ] **Workflow is complete**: All necessary steps are included
- [ ] **Steps are actionable**: Each step can be executed without ambiguity
- [ ] **Best practices are included**: Tips for optimal usage are provided
- [ ] **Troubleshooting covers common issues**: Known problems have solutions
- [ ] **Examples are provided**: Concrete usage examples are included
- [ ] **Protocol integration is defined**: How to use within protocols is clear
- [ ] **Skills index is updated**: The skill is listed in the index
- [ ] **File naming follows convention**: Uses kebab-case, descriptive name
- [ ] **Markdown formatting is correct**: Proper headers, lists, code blocks

## Examples of Good Skills

### Example 1: Database Migration Skill
A skill for running database migrations would include:
- Purpose: Standardize database schema updates
- Triggers: When schema changes are needed
- Context: Read database config, migration files
- Workflow: Check current version, create migration, run migration, verify
- Best Practices: Always backup first, test on staging
- Troubleshooting: Handle lock issues, rollback procedures

### Example 2: API Documentation Skill
A skill for generating API documentation would include:
- Purpose: Generate consistent API documentation
- Triggers: When endpoints are added/modified
- Context: Read API routes, models, schemas
- Workflow: Extract endpoints, generate docs, validate, deploy
- Best Practices: Include examples, error codes
- Troubleshooting: Handle missing docstrings, type mismatches

## Common Pitfalls to Avoid

1. **Too Generic**: Skills that are too broad become hard to use
   - ❌ "Handle all file operations"
   - ✅ "Safely delete files with confirmation"

2. **Too Specific**: Skills that are too narrow have limited reusability
   - ❌ "Create user with name 'John' and email 'john@example.com'"
   - ✅ "Create user with validation and error handling"

3. **Missing Context**: Forgetting to specify what context is needed
   - Always list Memory Bank files and project files to read

4. **No Examples**: Skills without examples are hard to understand
   - Always provide at least one concrete example

5. **Unclear Triggers**: Not knowing when to use a skill
   - Be specific about what triggers skill usage

## Integration with Existing Workflows

New skills should integrate seamlessly with:
- **Memory Bank**: Skills should read relevant context files
- **Protocols**: Skills should be usable within protocol workflows
- **Other Skills**: Skills should complement, not duplicate, existing skills
- **Project Rules**: Skills should respect project-specific rules and patterns

## Continuous Improvement

After creating a skill:
1. Monitor its usage and effectiveness
2. Gather feedback from agents using it
3. Update based on real-world usage patterns
4. Consider splitting or merging skills if patterns emerge
5. Keep skills aligned with project evolution

## Template for Quick Skill Creation

Use this template for rapid skill creation:

```markdown
# [Skill Name] Skill

## Purpose
[One sentence description]

## Triggers
Use this skill when:
- [Trigger 1]
- [Trigger 2]

## Context
Read:
- `.kilocode/rules/memory-bank/[file].md` - [Reason]

## Workflow

### Step 1: [Title]
[Instructions]

### Step 2: [Title]
[Instructions]

## Best Practices
- [Tip 1]
- [Tip 2]

## Integration with Protocols
When using this skill in a protocol:
1. [Action 1]
2. [Action 2]
```

Fill in the template with your specific skill details, then expand sections as needed.
