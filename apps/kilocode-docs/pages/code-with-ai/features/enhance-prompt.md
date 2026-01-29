---
title: "Enhance Prompt"
description: "Automatically improve your prompts for better results"
---

# Enhance Prompt

<<<<<<< HEAD:apps/kilocode-docs/docs/features/enhance-prompt.md
The "Enhance Prompt" feature in AlfaCode assistant helps you improve the quality and effectiveness of your prompts before sending them to the AI model. By clicking the <Codicon name="sparkle" /> icon in the chat input, you can automatically refine your initial request, making it clearer, more specific, and more likely to produce the desired results.
=======
The "Enhance Prompt" feature in Kilo Code helps you improve the quality and effectiveness of your prompts before sending them to the AI model. By clicking the {% codicon name="sparkle" /%} icon in the chat input, you can automatically refine your initial request, making it clearer, more specific, and more likely to produce the desired results.
>>>>>>> origin/main:apps/kilocode-docs/pages/code-with-ai/features/enhance-prompt.md

## Why Use Enhance Prompt?

- **Improved Clarity:** AlfaCode assistant can rephrase your prompt to make it more understandable for the AI model.
- **Added Context:** The enhancement process can add relevant context to your prompt, such as the current file path or selected code.
- **Better Instructions:** AlfaCode assistant can add instructions to guide the AI towards a more helpful response (e.g., requesting specific formatting or a particular level of detail).
- **Reduced Ambiguity:** Enhance Prompt helps to eliminate ambiguity and ensure that AlfaCode assistant understands your intent.
- **Consistency**: Kilo will consistently format prompts the same way to the AI.

### Before and after

{% image src="/docs/img/enhance-prompt/before.png" alt="very primitive prompt" width="300" /%}
{% image src="/docs/img/enhance-prompt/after.png" alt="enhanced prompt" width="300" /%}

## How to Use Enhance Prompt

<<<<<<< HEAD:apps/kilocode-docs/docs/features/enhance-prompt.md
1.  **Type your initial prompt:** Enter your request in the AlfaCode assistant chat input box as you normally would. This can be a simple question, a complex task description, or anything in between.
2.  **Click the <Codicon name="sparkle" /> Icon:** Instead of pressing Enter, click the <Codicon name="sparkle" /> icon located in the bottom right of the chat input box.
3.  **Review the Enhanced Prompt:** AlfaCode assistant will replace your original prompt with an enhanced version. Review the enhanced prompt to make sure it accurately reflects your intent. You can further refine the enhanced prompt before sending.
4.  **Send the Enhanced Prompt:** Press Enter or click the Send icon (<Codicon name="send" />) to send the enhanced prompt to AlfaCode assistant.
=======
1.  **Type your initial prompt:** Enter your request in the Kilo Code chat input box as you normally would. This can be a simple question, a complex task description, or anything in between.
2.  **Click the {% codicon name="sparkle" /%} Icon:** Instead of pressing Enter, click the {% codicon name="sparkle" /%} icon located in the bottom right of the chat input box.
3.  **Review the Enhanced Prompt:** Kilo Code will replace your original prompt with an enhanced version. Review the enhanced prompt to make sure it accurately reflects your intent. You can further refine the enhanced prompt before sending.
4.  **Send the Enhanced Prompt:** Press Enter or click the Send icon ({% codicon name="send" /%}) to send the enhanced prompt to Kilo Code.
>>>>>>> origin/main:apps/kilocode-docs/pages/code-with-ai/features/enhance-prompt.md

## Customizing the Enhancement Process

### Customizing Template

The "Enhance Prompt" feature uses a customizable prompt template. You can modify this template to tailor the enhancement process to your specific needs.

<<<<<<< HEAD:apps/kilocode-docs/docs/features/enhance-prompt.md
1.  **Open the Prompts Tab:** Click the <Codicon name="notebook" /> icon in the AlfaCode assistant top menu bar.
=======
1.  **Open the Prompts Tab:** Click the {% codicon name="notebook" /%} icon in the Kilo Code top menu bar.
>>>>>>> origin/main:apps/kilocode-docs/pages/code-with-ai/features/enhance-prompt.md
2.  **Select "ENHANCE" Tab:** You should see listed out support prompts, including "ENHANCE". Click on this tab.
3.  **Edit the Prompt Template:** Modify the text in the "Prompt" field.

The default prompt template includes the placeholder `${userInput}`, which will be replaced with your original prompt. You can modify this to fit the model's prompt format, and instruct it how to enhance your request.

### Customizing Provider

Speed up prompt enhancement by switching to a more lightweight LLM model provider (e.g. GPT 4.1 Nano). This delivers faster results at lower cost while maintaining quality.

Create a dedicated profile for Enhance Prompt by following the [API configuration profiles guide](/docs/features/api-configuration-profiles).

{% image src="/docs/img/enhance-prompt/custom-enhance-profile.png" alt="Custom profile configuration for Enhance Prompt feature" width="600" /%}

For a detailed walkthrough: https://youtu.be/R1nDnCK-xzw

## Limitations and Best Practices

- **Experimental Feature:** Prompt enhancement is an experimental feature. The quality of the enhanced prompt may vary depending on the complexity of your request and the capabilities of the underlying model.
- **Review Carefully:** Always review the enhanced prompt before sending it. AlfaCode assistant may make changes that don't align with your intentions.
- **Iterative Process:** You can use the "Enhance Prompt" feature multiple times to iteratively refine your prompt.
- **Not a Replacement for Clear Instructions:** While "Enhance Prompt" can help, it's still important to write clear and specific prompts from the start.

By using the "Enhance Prompt" feature, you can improve the quality of your interactions with AlfaCode assistant and get more accurate and helpful responses.
