# LLM Autocompletion Tests

Standalone test suite for AutoTriggerStrategy with real LLM calls using approval testing.

## Approval Testing

This test suite uses approval testing instead of regex pattern matching to validate LLM autocompletion outputs.

### How It Works

1. **First Run**: When a test runs and produces output that hasn't been seen before, the runner will:

    - Display the test input and output
    - Ask you whether the output is acceptable
    - Save your decision to `approvals/{category}/{test-name}/approved.N.txt` or `rejected.N.txt`

2. **Subsequent Runs**:
    - If the output matches a previously approved file, the test passes
    - If the output matches a previously rejected file, the test fails
    - If the output is new, you'll be asked again

### Directory Structure

```
approvals/
├── basic-syntax/
│   ├── closing-brace/
│   │   ├── approved/
│   │   │   ├── approved.1.txt
│   │   │   └── approved.2.txt
│   │   └── rejected/
│   │       └── rejected.1.txt
│   └── semicolon/
│       └── approved/
│           └── approved.1.txt
└── property-access/
    └── ...
```

## Running Tests

```bash
# Run all tests
pnpm run test

# Run with verbose output
pnpm run test:verbose

# Run without interactive approval (fail if not already approved)
pnpm run test --skip-approval

# Run a single test
pnpm run test closing-brace

# Clean up orphaned approval files
pnpm run clean

# Combine flags
pnpm run test --verbose --skip-approval
```

### Clean Command

The `clean` command removes approval files for test cases that no longer exist:

```bash
pnpm run clean
```

This is useful when you've deleted or renamed test cases and want to clean up the corresponding approval files. The command will:

- Scan all approval files in the `approvals/` directory
- Check if each approval corresponds to an existing test case
- Remove approvals for test cases that no longer exist
- Report how many files were cleaned

### Skip Approval Mode

Use `--skip-approval` (or `-sa`) to run tests in CI/CD or when you want to avoid interactive prompts:

- Tests that match previously approved outputs will **pass**
- Tests that match previously rejected outputs will **fail**
- Tests with new outputs (not previously approved or rejected) will be marked as **unknown** without prompting

The accuracy calculation only includes passed and failed tests, excluding unknown tests. This gives you a true measure of how the model performs on known cases.

This is useful for:

- Running tests in CI/CD pipelines
- Regression testing to ensure outputs haven't changed
- Validating that all test outputs have been reviewed

## User Interaction

When new output is detected, you'll see:

```
═════════════════════════════════════════════════════════════════════════════

🔍 New output detected for: basic-syntax/closing-brace

Input:
function test() {\n\t\tconsole.log('hello')<CURSOR>

Output:
}

────────────────────────────────────────────────────────────────────────────

Is this acceptable? (y/n):
```

## Benefits

- **Flexibility**: Accepts any valid output, not just predefined patterns
- **History**: Keeps track of all approved and rejected outputs
- **Interactive**: Only asks for input when truly needed
- **Context-Rich**: Shows the full context when asking for approval

## Notes

- The `approvals/` directory is gitignored
- Each approved/rejected output gets a unique numbered file
- Tests only prompt for input in the terminal when output is new
- The test summary at the end shows how many passed/failed
