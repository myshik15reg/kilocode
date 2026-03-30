// kilocode_change - new file
import type { OrchestrationPatternMemoryState } from "@roo-code/types"

import type { PatternMemoryProviderLike } from "./PatternMemoryTypes"
import type { OrchestrationPatternMemoryRuntime } from "./OrchestrationPatternMemoryService"

export class ProviderPatternMemoryRuntime implements OrchestrationPatternMemoryRuntime {
	constructor(private readonly provider: PatternMemoryProviderLike) {}

	public getState(): OrchestrationPatternMemoryState | undefined {
		return this.provider.getValue("orchestrationPatternMemoryState")
	}

	public async setState(state: OrchestrationPatternMemoryState): Promise<void> {
		await this.provider.setValue("orchestrationPatternMemoryState", state)
	}

	public log(message: string): void {
		this.provider.log(message)
	}
}
