---
title: "Frequently Asked Questions"
description: "Find answers to common questions about Kilo Code"
---

# Frequently Asked Questions

This page answers some common questions about AlfaCode assistant.

## General

### What is AlfaCode assistant?

AlfaCode assistant is an AI agent extension for Visual Studio Code. It helps you write code more efficiently by generating code, automating tasks, and providing suggestions.

### How does AlfaCode assistant work?

AlfaCode assistant uses large language models (LLMs) to understand your requests and translate them into actions. It can:

- Read, write, and delete files in your project.
- Execute commands in your VS Code terminal.
- Perform web browsing (if enabled).
- Use external tools via the Model Context Protocol (MCP).

You interact with AlfaCode assistant through a chat interface, where you provide instructions and review/approve its proposed actions, or you can use the inline autocomplete feature which helps you as you type.

### What can AlfaCode assistant do?

AlfaCode assistant can help with a variety of coding tasks, including:

- Generating code from natural language descriptions.
- Refactoring existing code.
- Fixing bugs.
- Writing documentation.
- Explaining code.
- Answering questions about your codebase.
- Automating repetitive tasks.
- Creating new files and projects.

### Is AlfaCode assistant free to use?

The AlfaCode assistant extension itself is free. In order for AlfaCode assistant to be useful, you need an AI model to respond to your queries. Models are hosted by providers and most charge for access.

There are some models available for free. The set of free models if constantly changing based on provider pricing decisions.

You can also use AlfaCode assistant with a [local model](/docs/automate/extending/local-models) or "Bring Your Own API Key" for [another model provider](/docs/getting-started/setup-authentication) (like [Anthropic](/docs/ai-providers/anthropic), [OpenAI](/docs/ai-providers/openai), [OpenRouter](/docs/ai-providers/openrouter), [Requesty](/docs/ai-providers/requesty), etc.).

### How do I pay for model usage via AlfaCode assistant?

If you choose to pay for models via AlfaCode assistant, you do so by buying Kilo Credits. You can [buy Kilo Credits](/docs/getting-started/adding-credits) securely via Stripe with a credit card. We do not charge a markup on Kilo Credits. $1 you give us is $1 in Kilo Credits.

Model usage is metered by the providers in terms of different kinds of tokens. When you use a model, we debit your Kilo credits by the amount the provider charges us -- with no markup.

You can use any models you like as long as you have credits in your account. When you run out of credits, you can add more. It's that simple!

If you're looking to earn some credits, you could join our <a href={DISCORD_URL} target='_blank'>Discord</a> where we sometimes have promotional offers!

### What are the risks of using AlfaCode assistant?

AlfaCode assistant is a powerful tool, and it's important to use it responsibly. Here are some things to keep in mind:

- **AlfaCode assistant can make mistakes.** Always review AlfaCode assistant's proposed changes carefully before approving them.
- **AlfaCode assistant can execute commands.** Be very cautious about allowing AlfaCode assistant to run commands, especially if you're using auto-approval.
- **AlfaCode assistant can access the internet.** If you're using a provider that supports web browsing, be aware that AlfaCode assistant could potentially access sensitive information.

## Setup & Installation

### How do I install AlfaCode assistant?

See the [Installation Guide](/docs/getting-started/installing) for detailed instructions.

### Which API providers are supported?

AlfaCode assistant supports a wide range of API providers, including:

- [Anthropic (Claude)](/docs/providers/kilocode)
- [Anthropic (Claude)](/docs/providers/anthropic)
- [OpenAI](/docs/providers/openai)
- [OpenRouter](/docs/providers/openrouter)
- [Google Gemini](/docs/providers/gemini)
- [Glama](/docs/providers/glama)
- [AWS Bedrock](/docs/providers/bedrock)
- [GCP Vertex AI](/docs/providers/vertex)
- [Ollama](/docs/providers/ollama)
- [LM Studio](/docs/providers/lmstudio)
- [DeepSeek](/docs/providers/deepseek)
- [Mistral](/docs/providers/mistral)
- [Unbound](/docs/providers/unbound)
- [Requesty](/docs/providers/requesty)
- [VS Code Language Model API](/docs/providers/vscode-lm)

### How do I get an API key?

Each API provider has its own process for obtaining an API key. See the [Setting Up Your First AI Provider](/docs/getting-started/connecting-api-provider) for links to the relevant documentation for each provider.

### Can I use AlfaCode assistant with local models?

Yes, AlfaCode assistant supports running models locally using [Ollama](/docs/ai-providers/ollama) and [LM Studio](/docs/ai-providers/lmstudio). See [Using Local Models](/docs/automate/extending/local-models) for instructions.

## Usage

### How do I start a new task?

Open the AlfaCode assistant panel ({% kiloCodeIcon /%}) and type your task in the chat box. Be clear and specific about what you want AlfaCode assistant to do. See [The Chat Interface](/docs/code-with-ai/agents/chat-interface) for best practices.

### When should I use chat vs autocomplete?

Use **chat** when you need to:

- Make complex, multi-file changes
- Refactor code across your project
- Get explanations or ask questions
- Have AlfaCode assistant execute commands or browse the web
- Work on tasks that require planning and multiple steps

Use **autocomplete** when you need to:

- Complete the current line or block of code quickly
- Get suggestions for common patterns and boilerplate
- Make quick, localized edits without context switching
- Speed up typing repetitive code

In general, autocomplete is best for quick, in-flow coding assistance, while chat is better for larger tasks that require more context and interaction.

### What are modes in AlfaCode assistant?

[Modes](/docs/code-with-ai/agents/using-modes) are different personas that AlfaCode assistant can adopt, each with a specific focus and set of capabilities. The built-in modes are:

- **Code:** For general-purpose coding tasks.
- **Architect:** For planning and technical leadership.
- **Ask:** For answering questions and providing information.
- **Debug:** For systematic problem diagnosis.
  You can also create [Custom Modes](/docs/agent-behavior/custom-modes).

### How do I switch between modes?

Use the dropdown menu in the chat input area to select a different mode, or use the `/` command to switch to a specific mode.

### What are tools and how do I use them?

[Tools](/docs/automate/how-tools-work) are how AlfaCode assistant interacts with your system. AlfaCode assistant automatically selects and uses the appropriate tools to complete your tasks. You don't need to call tools directly. You will be prompted to approve or reject each tool use.

### What are context mentions?

[Context mentions](/docs/code-with-ai/agents/context-mentions) are a way to provide AlfaCode assistant with specific information about your project, such as files, folders, or problems. Use the "@" symbol followed by the item you want to mention (e.g., `@/src/file.ts`, `@problems`).

### Can AlfaCode assistant access the internet?

Yes, if you are using a provider with a model that support web browsing. Be mindful of the security implications of allowing this.

### Can AlfaCode assistant run commands in my terminal?

Yes, AlfaCode assistant can execute commands in your VS Code terminal. You will be prompted to approve each command before it's executed, unless you've enabled auto-approval for commands. Be extremely cautious about auto-approving commands. If you're experiencing issues with terminal commands, see the [Shell Integration Guide](/docs/automate/extending/shell-integration) for troubleshooting.

### How do I provide feedback to AlfaCode assistant?

You can provide feedback by approving or rejecting AlfaCode assistant's proposed actions. You can provide additional feedback by using the feedback field.

### Can I customize AlfaCode assistant's behavior?

Yes, you can customize AlfaCode assistant in several ways:

- **Custom Instructions:** Provide general instructions that apply to all modes, or mode-specific instructions.
- **Custom Modes:** Create your own modes with tailored prompts and tool permissions.
- **`.clinerules` Files:** Create `.clinerules` files in your project to provide additional guidelines.
- **Settings:** Adjust various settings, such as auto-approval, diff editing, and more.

### Does AlfaCode assistant have any auto approval settings?

Yes, AlfaCode assistant has a few settings that when enabled will automatically approve actions. Find out more [here](/docs/features/auto-approving-actions).

## Advanced Features

### Can I use AlfaCode assistant offline?

Yes, if you use a [local model](/docs/advanced-usage/local-models).

### What is MCP (Model Context Protocol)?

[MCP](/docs/features/mcp/overview) is a protocol that allows AlfaCode assistant to communicate with external servers, extending its capabilities with custom tools and resources.

### Can I create my own MCP servers?

Yes, you can create your own MCP servers to add custom functionality to AlfaCode assistant. See the [MCP documentation](https://github.com/modelcontextprotocol) for details.

## Troubleshooting

### AlfaCode assistant isn't responding. What should I do?

- Make sure your API key is correct and hasn't expired.
- Check your internet connection.
- Check the status of your chosen API provider.
- Try restarting VS Code.
- If the problem persists, report the issue on [GitHub](https://github.com/Kilo-Org/kilocode/issues) or [Discord](https://kilo.ai/discord).

### I'm seeing an error message. What does it mean?

The error message should provide some information about the problem. If you're unsure how to resolve it, seek help in the community forums.

### AlfaCode assistant made changes I didn't want. How do I undo them?

AlfaCode assistant uses VS Code's built-in file editing capabilities. You can use the standard "Undo" command (Ctrl/Cmd + Z) to revert changes. Also, if experimental checkpoints are enabled, Kilo can revert changes made to a file.

### How do I report a bug or suggest a feature?

Please report bugs or suggest features on the AlfaCode assistant [Issues page](https://github.com/Kilo-Org/kilocode/issues) and [Feature Requests page](https://github.com/Kilo-Org/kilocode/discussions/categories/ideas).
