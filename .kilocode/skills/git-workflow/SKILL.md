---
name: git-workflow
description: Standardized workflow for Git operations.
---

# Git Workflow Skill

## Purpose
This skill provides a standardized workflow for Git operations, ensuring safe version control practices, proper branching strategies, and clean commit history.

## Triggers
Use this skill when:
- User asks to commit changes
- User asks to create a branch
- User asks to merge code
- Need to resolve conflicts
- Working with pull requests
- Managing releases

## Context
Before performing Git operations, this skill reads:
- `.kilocode/memory-bank/tech.md` - To understand Git workflow preferences
- `.kilocode/memory-bank/architecture.md` - To follow branching conventions
- `.kilocode/rules/git-workflow-rules.md` - For Git standards (if exists)

## Workflow

### Step 1: Check Repository Status

Before any Git operation:

```bash
git status
git branch --show-current
git log --oneline -5
```

**Analyze:**
- Current branch name
- Uncommitted changes
- Untracked files
- Recent commit history

### Step 2: Choose Appropriate Operation

#### Creating a New Branch

**Naming conventions:**
- Feature: `feat/feature-name`
- Bugfix: `fix/bug-description`
- Hotfix: `hotfix/critical-issue`
- Refactor: `refactor/component-name`
- Docs: `docs/what-documenting`

**Process:**
```bash
# Ensure main/master is up to date
git checkout main
git pull origin main

# Create and switch to new branch
git checkout -b feat/feature-name
```

#### Committing Changes

**Preparation:**
1. Review all changes: `git diff`
2. Stage relevant files: `git add file1 file2`
3. Check staged changes: `git diff --staged`

**Commit message format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Example:**
```bash
git commit -m "feat(auth): add JWT token refresh mechanism

Implement automatic token refresh before expiration:
- Add refresh endpoint
- Implement client-side refresh logic
- Add tests for token lifecycle

Closes #123"
```

#### Pushing Changes

**First push:**
```bash
git push -u origin feat/feature-name
```

**Subsequent pushes:**
```bash
git push
```

### Step 3: Working with Remote

#### Pulling Changes

**Safe pull (rebase):**
```bash
git pull --rebase origin main
```

**Standard pull (merge):**
```bash
git pull origin main
```

#### Handling Conflicts

**When conflicts occur:**
```bash
# 1. See conflicting files
git status

# 2. Open conflicting files and resolve
# Look for conflict markers:
# <<<<<<< HEAD
# =======
# >>>>>>> branch-name

# 3. After resolving, mark as resolved
git add resolved-file.ts

# 4. Continue operation
git rebase --continue  # if rebasing
git merge --continue   # if merging
```

### Step 4: Pull Request Workflow

#### Creating a Pull Request

**Preparation checklist:**
- [ ] All tests pass
- [ ] Code follows style guide
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] Commits are clean and meaningful

**Using GitHub CLI:**
```bash
gh pr create \
  --title "feat: Add user authentication" \
  --body "Description of changes..." \
  --base main \
  --head feat/user-auth
```

#### Updating a Pull Request

**Adding new commits:**
```bash
# Make changes
git add .
git commit -m "fix: address review comments"
git push
```

**Squashing commits:**
```bash
# Interactive rebase to squash commits
git rebase -i HEAD~3

# In editor, mark commits as 'squash' or 'fixup'
# Save and exit

# Force push (only on feature branches!)
git push --force-with-lease
```

### Step 5: Merging

#### Merge Strategies

**Fast-forward merge (clean history):**
```bash
git checkout main
git merge --ff-only feat/feature-name
```

**Squash merge (single commit):**
```bash
git checkout main
git merge --squash feat/feature-name
git commit -m "feat: comprehensive feature description"
```

**Standard merge (preserve history):**
```bash
git checkout main
git merge --no-ff feat/feature-name
```

#### Post-merge Cleanup

```bash
# Delete local branch
git branch -d feat/feature-name

# Delete remote branch
git push origin --delete feat/feature-name
```

## Best Practices

### Commit Hygiene

**DO:**
- Make atomic commits (one logical change per commit)
- Write clear, descriptive commit messages
- Commit often, push regularly
- Review changes before committing

**DON'T:**
- Commit sensitive data (.env files, credentials)
- Make huge commits with unrelated changes
- Use generic messages ("fix", "update", "WIP")
- Commit generated files or dependencies

### Branch Management

**DO:**
- Keep branches short-lived
- Sync with main/master regularly
- Delete merged branches
- Use descriptive branch names

**DON'T:**
- Work directly on main/master
- Keep stale branches
- Create branches from other feature branches (unless necessary)

### Code Review

**Before requesting review:**
- [ ] Self-review all changes
- [ ] Run all tests
- [ ] Check for debug code/console.logs
- [ ] Verify no merge conflicts
- [ ] Update documentation

## Advanced Operations

### Stashing Changes

**Save work in progress:**
```bash
# Stash all changes
git stash save "WIP: feature description"

# List stashes
git stash list

# Apply stash
git stash apply stash@{0}

# Apply and remove stash
git stash pop
```

### Cherry-picking

**Apply specific commit to current branch:**
```bash
# Get commit hash
git log --oneline

# Cherry-pick commit
git cherry-pick <commit-hash>
```

### Rewriting History

**CAUTION: Only on unshared branches!**

**Interactive rebase:**
```bash
# Rebase last 5 commits
git rebase -i HEAD~5

# Options:
# pick - use commit
# reword - change commit message
# edit - amend commit
# squash - merge with previous
# fixup - merge, discard message
# drop - remove commit
```

**Amending last commit:**
```bash
# Modify last commit
git add forgotten-file.ts
git commit --amend --no-edit

# Change last commit message
git commit --amend -m "Better message"
```

### Tagging Releases

**Create annotated tag:**
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

**List tags:**
```bash
git tag -l
```

## Troubleshooting

### Undo Operations

**Uncommitted changes:**
```bash
# Discard changes in file
git checkout -- file.ts

# Discard all changes
git reset --hard HEAD
```

**Last commit (not pushed):**
```bash
# Keep changes
git reset --soft HEAD~1

# Discard changes
git reset --hard HEAD~1
```

**Pushed commit:**
```bash
# Create revert commit
git revert <commit-hash>
git push
```

### Recovery

**Lost commits:**
```bash
# View all operations
git reflog

# Recover lost commit
git cherry-pick <lost-commit-hash>
```

**Accidentally deleted branch:**
```bash
# Find commit hash in reflog
git reflog

# Recreate branch
git checkout -b recovered-branch <commit-hash>
```

## Integration with Protocols

When this skill is used as part of a protocol:

1. **Document Git operations** in `execution.md`:
   - Branch created
   - Commits made
   - Conflicts resolved
   - PRs created/merged

2. **Follow protocol workflow:**
   - Create feature branch for protocol
   - Commit after each major step
   - Update plan.md in same commit
   - Create PR when protocol complete

3. **Naming convention:**
   ```
   feat/protocol-YYYY-MM-DD-feature-name
   ```

## Safety Rules

### ALWAYS Confirm Before:
- Force pushing (`git push --force`)
- Deleting branches with unmerged changes
- Rewriting history on shared branches
- Resetting to previous commits

### NEVER:
- Force push to main/master
- Commit secrets or credentials
- Rewrite history on public branches
- Work directly on production branches

### VERIFY:
- Current branch before committing
- Changes being committed (git diff)
- Remote branch before force pushing
- Tests pass before pushing

## Examples

### Example 1: Starting New Feature

```bash
# 1. Ensure main is up to date
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feat/user-profile

# 3. Make changes and commit
git add src/components/UserProfile.tsx
git commit -m "feat(profile): add user profile component

Implement basic user profile display:
- Avatar image
- Name and email
- Edit profile button

Issue: #234"

# 4. Push to remote
git push -u origin feat/user-profile

# 5. Create PR
gh pr create --title "feat: Add user profile component" \
  --body "Implements user profile display as per #234"
```

### Example 2: Hotfix Critical Bug

```bash
# 1. Create hotfix branch from production
git checkout production
git pull origin production
git checkout -b hotfix/auth-bypass

# 2. Fix the bug
git add src/middleware/auth.ts
git commit -m "fix(auth): prevent authentication bypass

Critical security fix:
- Validate token signature before use
- Add rate limiting
- Add security tests

CVE: CVE-2024-XXXXX"

# 3. Push and create urgent PR
git push -u origin hotfix/auth-bypass
gh pr create --title "HOTFIX: Prevent auth bypass" \
  --body "Critical security fix for CVE-2024-XXXXX" \
  --label "critical,security"

# 4. After merge, tag the release
git checkout production
git pull origin production
git tag -a v1.2.3 -m "Hotfix: Auth bypass patch"
git push origin v1.2.3
```

### Example 3: Resolving Merge Conflicts

```bash
# 1. Try to merge
git checkout main
git pull origin main
git checkout feat/my-feature
git merge main

# Conflict occurs!

# 2. Check conflicting files
git status

# 3. Open and resolve conflicts
# Edit conflicting files, remove markers

# 4. Mark as resolved
git add resolved-file.ts

# 5. Complete merge
git commit -m "merge: resolve conflicts with main"

# 6. Push
git push
```

## Checklist for Common Operations

### Before Creating PR:
- [ ] All tests pass locally
- [ ] Code follows project standards
- [ ] No console.logs or debug code
- [ ] Documentation updated
- [ ] Branch up to date with main
- [ ] Meaningful commit messages
- [ ] No merge conflicts

### Before Merging PR:
- [ ] Code review approved
- [ ] CI/CD pipeline passes
- [ ] No merge conflicts
- [ ] Documentation complete
- [ ] Tests coverage maintained
- [ ] Security scan passed

### After Merging:
- [ ] Delete feature branch
- [ ] Update Memory Bank if needed
- [ ] Close related issues
- [ ] Tag release if applicable
- [ ] Notify team if needed
