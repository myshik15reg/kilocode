import React, { useMemo, useState } from "react"
import type { RequestUserInputData } from "@roo-code/types"

import { cn } from "../../../lib/utils"

interface StructuredUserInputCardProps {
	data: RequestUserInputData
	onSubmit: (content: string) => void
}

type AnswerMap = Record<number, string[]>

function resolveOptionValue(option: { label: string; value?: string }): string {
	return option.value && option.value.trim() !== "" ? option.value : option.label
}

function buildStructuredResponse(data: RequestUserInputData, answers: AnswerMap): string {
	return data.questions
		.map((question, index) => {
			const answer = answers[index] ?? []
			return answer.length > 0 ? `${question.header}: ${answer.join(", ")}` : `${question.header}:`
		})
		.join("\n")
}

export function StructuredUserInputCard({ data, onSubmit }: StructuredUserInputCardProps) {
	const [answers, setAnswers] = useState<AnswerMap>({})

	const isComplete = useMemo(
		() => data.questions.every((_, index) => (answers[index]?.length ?? 0) > 0),
		[data.questions, answers],
	)

	const selectSingle = (questionIndex: number, optionValue: string) => {
		setAnswers((current) => ({
			...current,
			[questionIndex]: [optionValue],
		}))
	}

	const toggleMulti = (questionIndex: number, optionValue: string, checked: boolean) => {
		setAnswers((current) => {
			const existing = current[questionIndex] ?? []
			const nextValues = checked
				? [...existing.filter((value) => value !== optionValue), optionValue]
				: existing.filter((value) => value !== optionValue)

			return {
				...current,
				[questionIndex]: nextValues,
			}
		})
	}

	return (
		<form
			className="am-structured-input"
			onSubmit={(event) => {
				event.preventDefault()
				if (!isComplete) {
					return
				}

				onSubmit(buildStructuredResponse(data, answers))
			}}>
			{data.questions.map((question, questionIndex) => {
				const selectedValues = answers[questionIndex] ?? []

				return (
					<fieldset key={`${question.header}-${questionIndex}`} className="am-structured-question">
						<legend className="am-structured-legend">
							<span className="am-structured-header">{question.header}</span>
							<span className="am-structured-question-text">{question.question}</span>
						</legend>
						{question.preview && <p className="am-structured-preview">{question.preview}</p>}
						<div className="am-structured-options">
							{question.options.map((option, optionIndex) => {
								const optionValue = resolveOptionValue(option)
								const isChecked = selectedValues.includes(optionValue)

								return (
									<label
										key={`${question.header}-${option.label}-${optionIndex}`}
										className={cn(
											"am-structured-option",
											isChecked && "am-structured-option-selected",
										)}>
										<input
											className="am-structured-option-input"
											type={question.multiSelect ? "checkbox" : "radio"}
											name={`structured-question-${questionIndex}`}
											checked={isChecked}
											aria-label={`${question.header}: ${option.label}`}
											onChange={(event) => {
												if (question.multiSelect) {
													toggleMulti(questionIndex, optionValue, event.target.checked)
													return
												}

												selectSingle(questionIndex, optionValue)
											}}
										/>
										<span className="am-structured-option-copy">
											<span className="am-structured-option-label">{option.label}</span>
											<span className="am-structured-option-description">
												{option.description}
											</span>
											{option.preview && (
												<span className="am-structured-option-preview">{option.preview}</span>
											)}
										</span>
									</label>
								)
							})}
						</div>
					</fieldset>
				)
			})}

			<div className="am-structured-actions">
				<button type="submit" className="am-structured-submit" disabled={!isComplete}>
					Send selections
				</button>
			</div>
		</form>
	)
}
