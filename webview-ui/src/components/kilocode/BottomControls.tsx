import React from "react"
import { vscode } from "../../utils/vscode"
import { useAppTranslation } from "@/i18n/TranslationContext"
import KiloRulesToggleModal from "./rules/KiloRulesToggleModal"
import BottomButton from "./BottomButton"
import { BottomApiConfig } from "./BottomApiConfig" // kilocode_change

interface BottomControlsProps {
	showApiConfig?: boolean
}

const BottomControls: React.FC<BottomControlsProps> = ({ showApiConfig = false }) => {
	const { t } = useAppTranslation()

	const showFeedbackOptions = () => {
		vscode.postMessage({ type: "showFeedbackOptions" })
	}

	const openTechDebt = () => {
		vscode.postMessage({ type: "switchTab", tab: "techDebt" })
	}

	return (
		<div className="flex flex-row w-auto items-center justify-between h-[30px] mx-3.5 mt-2.5 mb-1 gap-1">
			<div className="flex flex-item flex-row justify-start gap-1 grow overflow-hidden">
				{showApiConfig && <BottomApiConfig />}
			</div>
			<div className="flex flex-row justify-end w-auto">
				<div className="flex items-center gap-1">
					<BottomButton
						iconClass="codicon-wrench"
						ariaLabel={t("kilocode:techDebt.title")}
						title={t("kilocode:techDebt.title")}
						onClick={openTechDebt}
					/>
					<KiloRulesToggleModal />
					<BottomButton
						iconClass="codicon-feedback"
						title={t("common:feedback.title")}
						onClick={showFeedbackOptions}
					/>
				</div>
			</div>
		</div>
	)
}

export default BottomControls
