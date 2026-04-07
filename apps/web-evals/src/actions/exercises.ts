"use server"

import { requireWebEvalsAuthorization } from "@/lib/server/auth"
import { exerciseLanguages, listDirectories } from "@roo-code/evals"

import * as path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EVALS_REPO_PATH = path.resolve(__dirname, "../../../../../evals")

export const getExercises = async () => {
	await requireWebEvalsAuthorization()
	const result = await Promise.all(
		exerciseLanguages.map(async (language) => {
			const languagePath = path.join(EVALS_REPO_PATH, language)
			const exercises = await listDirectories(__dirname, languagePath)
			return exercises.map((exercise) => `${language}/${exercise}`)
		}),
	)

	return result.flat()
}
