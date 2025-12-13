import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react"

import { Button } from "@/components/ui/button"
import { useAppTranslation } from "@/i18n/TranslationContext"

import { PasswordFieldProps } from "./types"
import { useNeo4jTranslations } from "./translations"

export const PasswordField = ({
	value = "",
	onChange,
	onSetPassword,
	disabled = false,
	hasPassword = false,
}: PasswordFieldProps) => {
	const { i18n } = useAppTranslation()
	const t = useNeo4jTranslations(i18n.language as "en" | "ru")
	const [showPassword, setShowPassword] = useState(false)
	const [localValue, setLocalValue] = useState(value)

	const handleChange = (e: any) => {
		const newValue = e.target.value
		setLocalValue(newValue)
		onChange(newValue)
	}

	const handleToggleVisibility = () => {
		setShowPassword(!showPassword)
	}

	const handleSetPassword = () => {
		onSetPassword()
		setLocalValue("")
	}

	return (
		<div className="flex flex-col gap-2">
			<label className="block font-medium">{t.password.label}</label>
			<div className="flex items-center gap-2">
				<div className="relative flex-1">
					<VSCodeTextField
						type={showPassword ? "text" : "password"}
						value={localValue}
						onChange={handleChange}
						disabled={disabled}
						className="w-full"
					/>
					<button
						type="button"
						onClick={handleToggleVisibility}
						disabled={disabled}
						className="absolute right-2 top-1/2 -translate-y-1/2 input-icon-button"
						aria-label={showPassword ? t.password.hideButton : t.password.showButton}>
						{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
					</button>
				</div>
				<Button
					variant="secondary"
					onClick={handleSetPassword}
					disabled={disabled || !localValue.trim()}>
					{t.password.setButton}
				</Button>
			</div>
			{hasPassword && (
				<div className="text-vscode-charts-green text-sm">{t.password.statusSet}</div>
			)}
		</div>
	)
}