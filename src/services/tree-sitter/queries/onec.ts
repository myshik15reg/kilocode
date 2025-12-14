/*
 * Tree-sitter Query Patterns for 1C:Enterprise Script Language (BSL)
 *
 * Captures:
 * - Procedure declarations (with export and annotations)
 * - Function declarations (with export and annotations)
 * - Variable declarations (module-level)
 * - Control flow statements (if, while, for, for each)
 * - Comments
 */

/**
 * Базовый query для извлечения определений (используется в семантическом поиске)
 */
export const onecBaseQuery = `
; Procedure declarations
(procedure_declaration
	name: (identifier) @name.definition.procedure) @definition.procedure

; Function declarations
(function_declaration
	name: (identifier) @name.definition.function) @definition.function

; Variable declarations (module-level)
(variable_declaration
	name: (identifier) @name.definition.variable) @definition.variable

; If statements
(if_statement
	condition: (_) @definition.if.condition) @definition.if

; While loops
(while_statement
	condition: (_) @definition.while.condition) @definition.while

; For loops
(for_statement
	variable: (identifier) @name.definition.for.variable) @definition.for

; For each loops
(for_each_statement
	variable: (identifier) @name.definition.for_each.variable) @definition.for_each

; Comments
(comment) @definition.comment

; Annotations (decorators for procedures/functions)
(annotation) @definition.annotation

; Call expressions (for potential test framework detection)
(call_expression
	function: (identifier) @name.definition.call) @definition.call
`

/**
 * Расширенный query для извлечения relationships (используется в Neo4j графе)
 */
export const onecGraphQuery = `
; Функции с параметрами
(function_declaration
	name: (identifier) @function.name
	parameters: (parameter_list
		(parameter
			name: (identifier) @parameter.name)*)?
) @function.declaration

; Процедуры с параметрами
(procedure_declaration
	name: (identifier) @procedure.name
	parameters: (parameter_list
		(parameter
			name: (identifier) @parameter.name)*)?
) @procedure.declaration

; Вызовы функций
(call_expression
	function: (identifier) @call.function) @call.expression

; Присваивания
(assignment_statement
	left: (identifier) @assignment.target
	right: (_) @assignment.value) @assignment

; Возвраты из функций
(return_statement
	(_)? @return.value) @return
`

/**
 * Полный query (объединение базового и расширенного)
 */
const onecFullQuery = onecBaseQuery + '\n' + onecGraphQuery

/**
 * Экспорт для использования в разных контекстах
 */
export const onecQueries = {
	base: onecBaseQuery,
	graph: onecGraphQuery,
	full: onecFullQuery
}

/**
 * Default export для обратной совместимости
 */
export default onecBaseQuery