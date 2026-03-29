/**
 * Tree-sitter grammar for 1C:Enterprise Script Language (BSL)
 * Based on specification: docs/tree-sitter-onec-grammar-spec.md
 */
module.exports = grammar({
	name: "onec",

	extras: ($) => [
		/\s/, // whitespace
		$.comment,
	],

	rules: {
		// Entry point
		source_file: ($) => repeat($._statement),

		// Comments
		comment: ($) => token(choice(seq("//", /.*/))),

		// Top-level statements
		_statement: ($) =>
			choice(
				$.procedure_declaration,
				$.function_declaration,
				$.variable_declaration,
				$.assignment_statement,
				$.return_statement,
				$.if_statement,
				$.while_statement,
				$.for_statement,
				$.for_each_statement,
				$.break_statement,
				$.continue_statement,
				$.call_expression,
			),

		// Identifiers - case insensitive, supporting Cyrillic
		identifier: ($) => /[a-zA-Zа-яА-ЯёЁ_][a-zA-Zа-яА-ЯёЁ0-9_]*/,

		// Procedure declaration
		procedure_declaration: ($) =>
			seq(
				optional($.annotation),
				caseInsensitive("Процедура"),
				field("name", $.identifier),
				field("parameters", $.parameter_list),
				optional(caseInsensitive("Экспорт")),
				optional($.procedure_body),
				caseInsensitive("КонецПроцедуры"),
			),

		// Function declaration
		function_declaration: ($) =>
			seq(
				optional($.annotation),
				caseInsensitive("Функция"),
				field("name", $.identifier),
				field("parameters", $.parameter_list),
				optional(caseInsensitive("Экспорт")),
				optional($.procedure_body),
				caseInsensitive("КонецФункции"),
			),

		// Parameter list
		parameter_list: ($) => seq("(", optional(seq($.parameter, repeat(seq(",", $.parameter)))), ")"),

		// Parameter
		parameter: ($) =>
			seq(
				optional(choice(caseInsensitive("Знач"), caseInsensitive("Val"))),
				field("name", $.identifier),
				optional(seq("=", field("default", $._expression))),
			),

		// Procedure/function body
		procedure_body: ($) => repeat1($._statement),

		// Variable declaration
		variable_declaration: ($) =>
			seq(caseInsensitive("Перем"), field("name", $.identifier), optional(caseInsensitive("Экспорт")), ";"),

		// Assignment statement
		assignment_statement: ($) => seq(field("left", $.identifier), "=", field("right", $._expression), ";"),

		// Return statement
		return_statement: ($) => seq(caseInsensitive("Возврат"), optional($._expression), ";"),

		// Conditional statement (Если-Тогда-Иначе)
		if_statement: ($) =>
			seq(
				caseInsensitive("Если"),
				field("condition", $._expression),
				caseInsensitive("Тогда"),
				optional(field("consequence", repeat($._statement))),
				repeat($.elseif_clause),
				optional($.else_clause),
				caseInsensitive("КонецЕсли"),
				optional(";"),
			),

		elseif_clause: ($) =>
			seq(
				caseInsensitive("ИначеЕсли"),
				field("condition", $._expression),
				caseInsensitive("Тогда"),
				optional(repeat($._statement)),
			),

		else_clause: ($) => seq(caseInsensitive("Иначе"), optional(repeat($._statement))),

		// While loop (Пока-Цикл)
		while_statement: ($) =>
			seq(
				caseInsensitive("Пока"),
				field("condition", $._expression),
				caseInsensitive("Цикл"),
				optional(field("body", repeat($._statement))),
				caseInsensitive("КонецЦикла"),
				optional(";"),
			),

		// For loop (Для-По-Цикл)
		for_statement: ($) =>
			seq(
				caseInsensitive("Для"),
				field("variable", $.identifier),
				"=",
				field("start", $._expression),
				caseInsensitive("По"),
				field("end", $._expression),
				caseInsensitive("Цикл"),
				optional(field("body", repeat($._statement))),
				caseInsensitive("КонецЦикла"),
				optional(";"),
			),

		// For each loop (Для Каждого-Из-Цикл)
		for_each_statement: ($) =>
			seq(
				caseInsensitive("Для"),
				caseInsensitive("Каждого"),
				field("variable", $.identifier),
				caseInsensitive("Из"),
				field("collection", $._expression),
				caseInsensitive("Цикл"),
				optional(field("body", repeat($._statement))),
				caseInsensitive("КонецЦикла"),
				optional(";"),
			),

		// Break statement (Прервать)
		break_statement: ($) => seq(caseInsensitive("Прервать"), ";"),

		// Continue statement (Продолжить)
		continue_statement: ($) => seq(caseInsensitive("Продолжить"), ";"),

		// Expressions
		_expression: ($) =>
			choice(
				$.identifier,
				$.number_literal,
				$.string_literal,
				$.boolean_literal,
				$.call_expression,
				$.binary_expression,
				$.unary_expression,
				$.comparison_expression,
				$.logical_expression,
				$.parenthesized_expression,
			),

		// Call expression
		call_expression: ($) =>
			seq(
				field("function", $.identifier),
				"(",
				optional(seq($._expression, repeat(seq(",", $._expression)))),
				")",
			),

		// Binary expression (basic arithmetic)
		binary_expression: ($) =>
			choice(
				prec.left(5, seq($._expression, "+", $._expression)),
				prec.left(5, seq($._expression, "-", $._expression)),
				prec.left(6, seq($._expression, "*", $._expression)),
				prec.left(6, seq($._expression, "/", $._expression)),
			),

		// Unary expression
		unary_expression: ($) =>
			prec(10, seq(choice("+", "-", caseInsensitive("Не"), caseInsensitive("Not")), $._expression)),

		// Comparison expression
		comparison_expression: ($) =>
			prec.left(
				4,
				seq(
					field("left", $._expression),
					field("operator", choice("=", "<>", "<", ">", "<=", ">=")),
					field("right", $._expression),
				),
			),

		// Logical expression
		logical_expression: ($) =>
			choice(
				prec.left(
					2,
					seq(
						field("left", $._expression),
						choice(caseInsensitive("И"), caseInsensitive("And")),
						field("right", $._expression),
					),
				),
				prec.left(
					1,
					seq(
						field("left", $._expression),
						choice(caseInsensitive("Или"), caseInsensitive("Or")),
						field("right", $._expression),
					),
				),
			),

		// Parenthesized expression
		parenthesized_expression: ($) => seq("(", $._expression, ")"),

		// Literals
		number_literal: ($) => /\d+(\.\d+)?/,

		string_literal: ($) =>
			seq(
				'"',
				repeat(
					choice(
						/[^"]/,
						'""', // Escaped quote in 1C
					),
				),
				'"',
			),

		boolean_literal: ($) =>
			choice(
				caseInsensitive("Истина"),
				caseInsensitive("Ложь"),
				caseInsensitive("True"),
				caseInsensitive("False"),
			),

		// Annotation (placeholder for future)
		annotation: ($) => seq("&", $.identifier),
	},
})

/**
 * Helper function for case-insensitive keywords
 * Handles both Russian and English keywords
 */
function caseInsensitive(keyword) {
	return new RegExp(
		keyword
			.split("")
			.map((letter) => {
				if (letter.toLowerCase() !== letter.toUpperCase()) {
					return `[${letter.toLowerCase()}${letter.toUpperCase()}]`
				}
				return letter
			})
			.join(""),
	)
}
