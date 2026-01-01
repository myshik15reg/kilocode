---
name: cli-master
description: Safe and effective command-line interface (CLI) operations.
---

# CLI Master Skill

## Purpose
This skill provides a standardized workflow for safe and effective command-line interface (CLI) operations, ensuring commands are properly validated, executed, and their results are analyzed.

## Triggers
Use this skill when:
- User asks to execute a CLI command
- Task requires running shell commands
- Need to install dependencies or build the project
- Need to interact with git, npm, or other CLI tools
- Task involves file system operations through CLI

## Context
Before executing CLI commands, this skill reads:
- `.kilocode/memory-bank/tech.md` - To understand available CLI tools and their configurations
- `.kilocode/memory-bank/architecture.md` - To follow project-specific CLI conventions
- `package.json` - To identify available scripts and dependencies

## Workflow

### Step 1: Analyze the Command
Before executing any command:

1. **Understand the purpose**: What is this command supposed to do?
2. **Identify risks**: Is this command destructive? Does it modify files or data?
3. **Check prerequisites**: Are dependencies installed? Is the environment configured?

2. **Verify the command**:
   - Is the command syntax correct?
   - Are all required parameters provided?
   - Are flags and options appropriate for the context?

### Step 2: Validate Safety
Apply safety checks based on command type:

**Destructive Commands (Require Extra Caution):**
- `rm`, `rmdir` - File/directory deletion
- `git clean`, `git reset --hard` - Git operations that lose data
- `npm install --force`, `npm uninstall` - Package management changes
- `drop`, `truncate` - Database operations

**Safe Commands:**
- `ls`, `cat`, `echo` - Read-only operations
- `git status`, `git log` - Git read operations
- `npm test`, `npm run build` - Build and test commands
- `grep`, `find` - Search operations

**Validation Checklist:**
- [ ] Command purpose is clear
- [ ] Command syntax is correct
- [ ] Working directory is appropriate
- [ ] Destructive commands have confirmation
- [ ] Environment variables are set if needed

### Step 3: Prepare Execution
1. **Set working directory**: Use the `cwd` parameter appropriately
2. **Chain commands efficiently**: Use `&&` for dependent commands, `||` for alternatives
3. **Handle paths**: Use relative paths when possible, avoid ~ or $HOME

**Example of proper command preparation:**
```bash
# Good: Clear purpose, safe operation
npm install && npm run build

# Good: Explicit working directory
cd ./frontend && npm run dev

# Avoid: Ambiguous paths
rm -rf ~/Downloads/old-project  # Don't use ~
```

### Step 4: Execute Command
Use the `execute_command` tool with proper parameters:

```bash
execute_command command="npm test" cwd="."
```

**Best practices:**
- Provide clear explanation of what the command does
- Use appropriate working directory
- Consider command output size for long-running operations
- For interactive commands, warn the user about potential blocking

### Step 5: Analyze Output
After command execution, analyze the results:

**Success Indicators:**
- Exit code 0 (success)
- Expected output present
- No error messages
- Command completed without hanging

**Failure Indicators:**
- Non-zero exit code
- Error messages or stack traces
- Command timed out
- Unexpected output format

**Output Analysis Steps:**
1. Check if command succeeded (exit code 0)
2. Review output for errors or warnings
3. Verify expected results are present
4. Note any unexpected behavior
5. Identify next steps based on output

### Step 6: Report Results
Provide a clear summary to the user:

**Success Example:**
```
✅ Command executed successfully
Command: npm install
Result: All dependencies installed successfully
Duration: 15.2 seconds
Output: Added 247 packages in 15.2s
```

**Failure Example:**
```
❌ Command failed
Command: npm run build
Error: Build failed with TypeScript errors
Details:
- src/components/Header.tsx:45:12 - Type 'string' is not assignable to type 'number'
- src/utils/helpers.ts:78:5 - Function 'calculateTotal' is missing return type

Suggested actions:
1. Fix TypeScript errors in the identified files
2. Run `npm run build` again after fixes
```

## Best Practices

### Command Chaining
Use `&&` for commands that should only run if the previous succeeds:
```bash
npm install && npm run build && npm test
```

Use `||` for fallback commands:
```bash
npm run build || echo "Build failed, check logs"
```

### Working with Paths
- Always use relative paths from workspace root
- Avoid using `~` or `$HOME`
- Use `./` for explicit current directory reference
- Quote paths with spaces: `"./path with spaces/file.txt"`

### Long-Running Commands
- Warn user before starting
- Monitor for timeout issues
- Consider running in background if appropriate
- Provide progress updates if possible

### Interactive Commands
- Warn user that command may require input
- Consider alternatives that are non-interactive
- Use flags like `--yes`, `--force`, `--silent` when appropriate

## Troubleshooting

### Command Not Found
- Verify the command is installed
- Check if it's in the system PATH
- Consider using npx/yarn/pnpm for Node.js tools
- Install missing dependencies

### Permission Denied
- Check file/directory permissions
- Verify user has necessary access rights
- Consider using sudo with caution (and user confirmation)

### Command Hangs
- Check if command is waiting for input
- Verify network connectivity for remote operations
- Consider adding timeout flags
- Use non-interactive alternatives

### Unexpected Output
- Verify command syntax
- Check for version differences
- Review documentation for flags/options
- Test command manually if needed

## Safety Rules

### NEVER Execute Without Verification:
- Commands that delete data without confirmation
- Commands that modify system files
- Commands with unknown or suspicious flags
- Commands from untrusted sources

### ALWAYS Confirm Before:
- Deleting files or directories
- Modifying git history
- Running database migrations
- Installing packages with unusual flags
- Executing scripts from external sources

### Document:
- All destructive commands in protocol execution logs
- Any workarounds or non-standard command usage
- Command failures and their resolutions

## Integration with Protocols
When this skill is used as part of a protocol:
1. Update the protocol's `plan.md` to mark CLI operations as complete
2. Record command execution details in `execution.md`:
   - Command executed
   - Working directory
   - Exit code
   - Key output
   - Any issues encountered
3. If commands fail, document the issues and decide whether to:
   - Retry with different parameters
   - Fix underlying issues
   - Create a new protocol to address them
   - Note them as known issues in `progress.md`

## Examples

### Installing Dependencies
```bash
# Step 1: Check package.json for dependencies
# Step 2: Verify node_modules doesn't exist or is outdated
# Step 3: Execute
execute_command command="npm install" cwd="."
# Step 4: Verify installation completed successfully
```

### Running Build Process
```bash
# Step 1: Check for build script in package.json
# Step 2: Verify dependencies are installed
# Step 3: Execute
execute_command command="npm run build" cwd="."
# Step 4: Check build output directory exists
```

### Git Operations
```bash
# Step 1: Verify git is initialized
# Step 2: Check current branch
execute_command command="git branch --show-current" cwd="."
# Step 3: Create new branch if needed
execute_command command="git checkout -b feat/new-feature" cwd="."
# Step 4: Verify branch creation
```
