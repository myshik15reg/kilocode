import { OpenAI } from "openai/client"
import askFollowupQuestion from "./ask_followup_question"
import attemptCompletion from "./attempt_completion"
import browserAction from "./browser_action"
import codebaseSearch from "./codebase_search"
import editFile from "./edit_file"
import executeCommand from "./execute_command"
import fetchInstructions from "./fetch_instructions"
import generateImage from "./generate_image"
import insertContent from "./insert_content"
import listCodeDefinitionNames from "./list_code_definition_names"
import listFiles from "./list_files"
import newTask from "./new_task"
import readFile from "./read_file"
import runSlashCommand from "./run_slash_command"
import searchAndReplace from "./search_and_replace"
import searchFiles from "./search_files"
import switchMode from "./switch_mode"
import updateTodoList from "./update_todo_list"
import writeToFile from "./write_to_file"

export const nativeTools = [
	askFollowupQuestion,
	attemptCompletion,
	browserAction,
	codebaseSearch,
	editFile,
	executeCommand,
	fetchInstructions,
	generateImage,
	insertContent,
	listCodeDefinitionNames,
	listFiles,
	newTask,
	readFile,
	runSlashCommand,
	searchAndReplace,
	searchFiles,
	switchMode,
	updateTodoList,
	writeToFile,
] satisfies OpenAI.Chat.ChatCompletionTool[]
