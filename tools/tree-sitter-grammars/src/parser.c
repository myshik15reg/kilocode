#include <tree_sitter/parser.h>

#if defined(__GNUC__) || defined(__clang__)
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wmissing-field-initializers"
#endif

#define LANGUAGE_VERSION 14
#define STATE_COUNT 174
#define LARGE_STATE_COUNT 2
#define SYMBOL_COUNT 88
#define ALIAS_COUNT 0
#define TOKEN_COUNT 55
#define EXTERNAL_TOKEN_COUNT 0
#define FIELD_COUNT 14
#define MAX_ALIAS_SEQUENCE_LENGTH 10
#define PRODUCTION_ID_COUNT 17

enum {
  sym_comment = 1,
  sym_identifier = 2,
  aux_sym_procedure_declaration_token1 = 3,
  aux_sym_procedure_declaration_token2 = 4,
  aux_sym_procedure_declaration_token3 = 5,
  aux_sym_function_declaration_token1 = 6,
  aux_sym_function_declaration_token2 = 7,
  anon_sym_LPAREN = 8,
  anon_sym_COMMA = 9,
  anon_sym_RPAREN = 10,
  aux_sym_parameter_token1 = 11,
  aux_sym_parameter_token2 = 12,
  anon_sym_EQ = 13,
  aux_sym_variable_declaration_token1 = 14,
  anon_sym_SEMI = 15,
  aux_sym_return_statement_token1 = 16,
  aux_sym_if_statement_token1 = 17,
  aux_sym_if_statement_token2 = 18,
  aux_sym_if_statement_token3 = 19,
  aux_sym_elseif_clause_token1 = 20,
  aux_sym_else_clause_token1 = 21,
  aux_sym_while_statement_token1 = 22,
  aux_sym_while_statement_token2 = 23,
  aux_sym_while_statement_token3 = 24,
  aux_sym_for_statement_token1 = 25,
  aux_sym_for_statement_token2 = 26,
  aux_sym_for_each_statement_token1 = 27,
  aux_sym_for_each_statement_token2 = 28,
  aux_sym_break_statement_token1 = 29,
  aux_sym_continue_statement_token1 = 30,
  anon_sym_PLUS = 31,
  anon_sym_DASH = 32,
  anon_sym_STAR = 33,
  anon_sym_SLASH = 34,
  aux_sym_unary_expression_token1 = 35,
  aux_sym_unary_expression_token2 = 36,
  anon_sym_LT_GT = 37,
  anon_sym_LT = 38,
  anon_sym_GT = 39,
  anon_sym_LT_EQ = 40,
  anon_sym_GT_EQ = 41,
  aux_sym_logical_expression_token1 = 42,
  aux_sym_logical_expression_token2 = 43,
  aux_sym_logical_expression_token3 = 44,
  aux_sym_logical_expression_token4 = 45,
  sym_number_literal = 46,
  anon_sym_DQUOTE = 47,
  aux_sym_string_literal_token1 = 48,
  anon_sym_DQUOTE_DQUOTE = 49,
  aux_sym_boolean_literal_token1 = 50,
  aux_sym_boolean_literal_token2 = 51,
  aux_sym_boolean_literal_token3 = 52,
  aux_sym_boolean_literal_token4 = 53,
  anon_sym_AMP = 54,
  sym_source_file = 55,
  sym__statement = 56,
  sym_procedure_declaration = 57,
  sym_function_declaration = 58,
  sym_parameter_list = 59,
  sym_parameter = 60,
  sym_procedure_body = 61,
  sym_variable_declaration = 62,
  sym_assignment_statement = 63,
  sym_return_statement = 64,
  sym_if_statement = 65,
  sym_elseif_clause = 66,
  sym_else_clause = 67,
  sym_while_statement = 68,
  sym_for_statement = 69,
  sym_for_each_statement = 70,
  sym_break_statement = 71,
  sym_continue_statement = 72,
  sym__expression = 73,
  sym_call_expression = 74,
  sym_binary_expression = 75,
  sym_unary_expression = 76,
  sym_comparison_expression = 77,
  sym_logical_expression = 78,
  sym_parenthesized_expression = 79,
  sym_string_literal = 80,
  sym_boolean_literal = 81,
  sym_annotation = 82,
  aux_sym_source_file_repeat1 = 83,
  aux_sym_parameter_list_repeat1 = 84,
  aux_sym_if_statement_repeat1 = 85,
  aux_sym_call_expression_repeat1 = 86,
  aux_sym_string_literal_repeat1 = 87,
};

static const char * const ts_symbol_names[] = {
  [ts_builtin_sym_end] = "end",
  [sym_comment] = "comment",
  [sym_identifier] = "identifier",
  [aux_sym_procedure_declaration_token1] = "procedure_declaration_token1",
  [aux_sym_procedure_declaration_token2] = "procedure_declaration_token2",
  [aux_sym_procedure_declaration_token3] = "procedure_declaration_token3",
  [aux_sym_function_declaration_token1] = "function_declaration_token1",
  [aux_sym_function_declaration_token2] = "function_declaration_token2",
  [anon_sym_LPAREN] = "(",
  [anon_sym_COMMA] = ",",
  [anon_sym_RPAREN] = ")",
  [aux_sym_parameter_token1] = "parameter_token1",
  [aux_sym_parameter_token2] = "parameter_token2",
  [anon_sym_EQ] = "=",
  [aux_sym_variable_declaration_token1] = "variable_declaration_token1",
  [anon_sym_SEMI] = ";",
  [aux_sym_return_statement_token1] = "return_statement_token1",
  [aux_sym_if_statement_token1] = "if_statement_token1",
  [aux_sym_if_statement_token2] = "if_statement_token2",
  [aux_sym_if_statement_token3] = "if_statement_token3",
  [aux_sym_elseif_clause_token1] = "elseif_clause_token1",
  [aux_sym_else_clause_token1] = "else_clause_token1",
  [aux_sym_while_statement_token1] = "while_statement_token1",
  [aux_sym_while_statement_token2] = "while_statement_token2",
  [aux_sym_while_statement_token3] = "while_statement_token3",
  [aux_sym_for_statement_token1] = "for_statement_token1",
  [aux_sym_for_statement_token2] = "for_statement_token2",
  [aux_sym_for_each_statement_token1] = "for_each_statement_token1",
  [aux_sym_for_each_statement_token2] = "for_each_statement_token2",
  [aux_sym_break_statement_token1] = "break_statement_token1",
  [aux_sym_continue_statement_token1] = "continue_statement_token1",
  [anon_sym_PLUS] = "+",
  [anon_sym_DASH] = "-",
  [anon_sym_STAR] = "*",
  [anon_sym_SLASH] = "/",
  [aux_sym_unary_expression_token1] = "unary_expression_token1",
  [aux_sym_unary_expression_token2] = "unary_expression_token2",
  [anon_sym_LT_GT] = "<>",
  [anon_sym_LT] = "<",
  [anon_sym_GT] = ">",
  [anon_sym_LT_EQ] = "<=",
  [anon_sym_GT_EQ] = ">=",
  [aux_sym_logical_expression_token1] = "logical_expression_token1",
  [aux_sym_logical_expression_token2] = "logical_expression_token2",
  [aux_sym_logical_expression_token3] = "logical_expression_token3",
  [aux_sym_logical_expression_token4] = "logical_expression_token4",
  [sym_number_literal] = "number_literal",
  [anon_sym_DQUOTE] = "\"",
  [aux_sym_string_literal_token1] = "string_literal_token1",
  [anon_sym_DQUOTE_DQUOTE] = "\"\"",
  [aux_sym_boolean_literal_token1] = "boolean_literal_token1",
  [aux_sym_boolean_literal_token2] = "boolean_literal_token2",
  [aux_sym_boolean_literal_token3] = "boolean_literal_token3",
  [aux_sym_boolean_literal_token4] = "boolean_literal_token4",
  [anon_sym_AMP] = "&",
  [sym_source_file] = "source_file",
  [sym__statement] = "_statement",
  [sym_procedure_declaration] = "procedure_declaration",
  [sym_function_declaration] = "function_declaration",
  [sym_parameter_list] = "parameter_list",
  [sym_parameter] = "parameter",
  [sym_procedure_body] = "procedure_body",
  [sym_variable_declaration] = "variable_declaration",
  [sym_assignment_statement] = "assignment_statement",
  [sym_return_statement] = "return_statement",
  [sym_if_statement] = "if_statement",
  [sym_elseif_clause] = "elseif_clause",
  [sym_else_clause] = "else_clause",
  [sym_while_statement] = "while_statement",
  [sym_for_statement] = "for_statement",
  [sym_for_each_statement] = "for_each_statement",
  [sym_break_statement] = "break_statement",
  [sym_continue_statement] = "continue_statement",
  [sym__expression] = "_expression",
  [sym_call_expression] = "call_expression",
  [sym_binary_expression] = "binary_expression",
  [sym_unary_expression] = "unary_expression",
  [sym_comparison_expression] = "comparison_expression",
  [sym_logical_expression] = "logical_expression",
  [sym_parenthesized_expression] = "parenthesized_expression",
  [sym_string_literal] = "string_literal",
  [sym_boolean_literal] = "boolean_literal",
  [sym_annotation] = "annotation",
  [aux_sym_source_file_repeat1] = "source_file_repeat1",
  [aux_sym_parameter_list_repeat1] = "parameter_list_repeat1",
  [aux_sym_if_statement_repeat1] = "if_statement_repeat1",
  [aux_sym_call_expression_repeat1] = "call_expression_repeat1",
  [aux_sym_string_literal_repeat1] = "string_literal_repeat1",
};

static const TSSymbol ts_symbol_map[] = {
  [ts_builtin_sym_end] = ts_builtin_sym_end,
  [sym_comment] = sym_comment,
  [sym_identifier] = sym_identifier,
  [aux_sym_procedure_declaration_token1] = aux_sym_procedure_declaration_token1,
  [aux_sym_procedure_declaration_token2] = aux_sym_procedure_declaration_token2,
  [aux_sym_procedure_declaration_token3] = aux_sym_procedure_declaration_token3,
  [aux_sym_function_declaration_token1] = aux_sym_function_declaration_token1,
  [aux_sym_function_declaration_token2] = aux_sym_function_declaration_token2,
  [anon_sym_LPAREN] = anon_sym_LPAREN,
  [anon_sym_COMMA] = anon_sym_COMMA,
  [anon_sym_RPAREN] = anon_sym_RPAREN,
  [aux_sym_parameter_token1] = aux_sym_parameter_token1,
  [aux_sym_parameter_token2] = aux_sym_parameter_token2,
  [anon_sym_EQ] = anon_sym_EQ,
  [aux_sym_variable_declaration_token1] = aux_sym_variable_declaration_token1,
  [anon_sym_SEMI] = anon_sym_SEMI,
  [aux_sym_return_statement_token1] = aux_sym_return_statement_token1,
  [aux_sym_if_statement_token1] = aux_sym_if_statement_token1,
  [aux_sym_if_statement_token2] = aux_sym_if_statement_token2,
  [aux_sym_if_statement_token3] = aux_sym_if_statement_token3,
  [aux_sym_elseif_clause_token1] = aux_sym_elseif_clause_token1,
  [aux_sym_else_clause_token1] = aux_sym_else_clause_token1,
  [aux_sym_while_statement_token1] = aux_sym_while_statement_token1,
  [aux_sym_while_statement_token2] = aux_sym_while_statement_token2,
  [aux_sym_while_statement_token3] = aux_sym_while_statement_token3,
  [aux_sym_for_statement_token1] = aux_sym_for_statement_token1,
  [aux_sym_for_statement_token2] = aux_sym_for_statement_token2,
  [aux_sym_for_each_statement_token1] = aux_sym_for_each_statement_token1,
  [aux_sym_for_each_statement_token2] = aux_sym_for_each_statement_token2,
  [aux_sym_break_statement_token1] = aux_sym_break_statement_token1,
  [aux_sym_continue_statement_token1] = aux_sym_continue_statement_token1,
  [anon_sym_PLUS] = anon_sym_PLUS,
  [anon_sym_DASH] = anon_sym_DASH,
  [anon_sym_STAR] = anon_sym_STAR,
  [anon_sym_SLASH] = anon_sym_SLASH,
  [aux_sym_unary_expression_token1] = aux_sym_unary_expression_token1,
  [aux_sym_unary_expression_token2] = aux_sym_unary_expression_token2,
  [anon_sym_LT_GT] = anon_sym_LT_GT,
  [anon_sym_LT] = anon_sym_LT,
  [anon_sym_GT] = anon_sym_GT,
  [anon_sym_LT_EQ] = anon_sym_LT_EQ,
  [anon_sym_GT_EQ] = anon_sym_GT_EQ,
  [aux_sym_logical_expression_token1] = aux_sym_logical_expression_token1,
  [aux_sym_logical_expression_token2] = aux_sym_logical_expression_token2,
  [aux_sym_logical_expression_token3] = aux_sym_logical_expression_token3,
  [aux_sym_logical_expression_token4] = aux_sym_logical_expression_token4,
  [sym_number_literal] = sym_number_literal,
  [anon_sym_DQUOTE] = anon_sym_DQUOTE,
  [aux_sym_string_literal_token1] = aux_sym_string_literal_token1,
  [anon_sym_DQUOTE_DQUOTE] = anon_sym_DQUOTE_DQUOTE,
  [aux_sym_boolean_literal_token1] = aux_sym_boolean_literal_token1,
  [aux_sym_boolean_literal_token2] = aux_sym_boolean_literal_token2,
  [aux_sym_boolean_literal_token3] = aux_sym_boolean_literal_token3,
  [aux_sym_boolean_literal_token4] = aux_sym_boolean_literal_token4,
  [anon_sym_AMP] = anon_sym_AMP,
  [sym_source_file] = sym_source_file,
  [sym__statement] = sym__statement,
  [sym_procedure_declaration] = sym_procedure_declaration,
  [sym_function_declaration] = sym_function_declaration,
  [sym_parameter_list] = sym_parameter_list,
  [sym_parameter] = sym_parameter,
  [sym_procedure_body] = sym_procedure_body,
  [sym_variable_declaration] = sym_variable_declaration,
  [sym_assignment_statement] = sym_assignment_statement,
  [sym_return_statement] = sym_return_statement,
  [sym_if_statement] = sym_if_statement,
  [sym_elseif_clause] = sym_elseif_clause,
  [sym_else_clause] = sym_else_clause,
  [sym_while_statement] = sym_while_statement,
  [sym_for_statement] = sym_for_statement,
  [sym_for_each_statement] = sym_for_each_statement,
  [sym_break_statement] = sym_break_statement,
  [sym_continue_statement] = sym_continue_statement,
  [sym__expression] = sym__expression,
  [sym_call_expression] = sym_call_expression,
  [sym_binary_expression] = sym_binary_expression,
  [sym_unary_expression] = sym_unary_expression,
  [sym_comparison_expression] = sym_comparison_expression,
  [sym_logical_expression] = sym_logical_expression,
  [sym_parenthesized_expression] = sym_parenthesized_expression,
  [sym_string_literal] = sym_string_literal,
  [sym_boolean_literal] = sym_boolean_literal,
  [sym_annotation] = sym_annotation,
  [aux_sym_source_file_repeat1] = aux_sym_source_file_repeat1,
  [aux_sym_parameter_list_repeat1] = aux_sym_parameter_list_repeat1,
  [aux_sym_if_statement_repeat1] = aux_sym_if_statement_repeat1,
  [aux_sym_call_expression_repeat1] = aux_sym_call_expression_repeat1,
  [aux_sym_string_literal_repeat1] = aux_sym_string_literal_repeat1,
};

static const TSSymbolMetadata ts_symbol_metadata[] = {
  [ts_builtin_sym_end] = {
    .visible = false,
    .named = true,
  },
  [sym_comment] = {
    .visible = true,
    .named = true,
  },
  [sym_identifier] = {
    .visible = true,
    .named = true,
  },
  [aux_sym_procedure_declaration_token1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_procedure_declaration_token2] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_procedure_declaration_token3] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_function_declaration_token1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_function_declaration_token2] = {
    .visible = false,
    .named = false,
  },
  [anon_sym_LPAREN] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_COMMA] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_RPAREN] = {
    .visible = true,
    .named = false,
  },
  [aux_sym_parameter_token1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_parameter_token2] = {
    .visible = false,
    .named = false,
  },
  [anon_sym_EQ] = {
    .visible = true,
    .named = false,
  },
  [aux_sym_variable_declaration_token1] = {
    .visible = false,
    .named = false,
  },
  [anon_sym_SEMI] = {
    .visible = true,
    .named = false,
  },
  [aux_sym_return_statement_token1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_if_statement_token1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_if_statement_token2] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_if_statement_token3] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_elseif_clause_token1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_else_clause_token1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_while_statement_token1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_while_statement_token2] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_while_statement_token3] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_for_statement_token1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_for_statement_token2] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_for_each_statement_token1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_for_each_statement_token2] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_break_statement_token1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_continue_statement_token1] = {
    .visible = false,
    .named = false,
  },
  [anon_sym_PLUS] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_DASH] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_STAR] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_SLASH] = {
    .visible = true,
    .named = false,
  },
  [aux_sym_unary_expression_token1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_unary_expression_token2] = {
    .visible = false,
    .named = false,
  },
  [anon_sym_LT_GT] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_LT] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_GT] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_LT_EQ] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_GT_EQ] = {
    .visible = true,
    .named = false,
  },
  [aux_sym_logical_expression_token1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_logical_expression_token2] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_logical_expression_token3] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_logical_expression_token4] = {
    .visible = false,
    .named = false,
  },
  [sym_number_literal] = {
    .visible = true,
    .named = true,
  },
  [anon_sym_DQUOTE] = {
    .visible = true,
    .named = false,
  },
  [aux_sym_string_literal_token1] = {
    .visible = false,
    .named = false,
  },
  [anon_sym_DQUOTE_DQUOTE] = {
    .visible = true,
    .named = false,
  },
  [aux_sym_boolean_literal_token1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_boolean_literal_token2] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_boolean_literal_token3] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_boolean_literal_token4] = {
    .visible = false,
    .named = false,
  },
  [anon_sym_AMP] = {
    .visible = true,
    .named = false,
  },
  [sym_source_file] = {
    .visible = true,
    .named = true,
  },
  [sym__statement] = {
    .visible = false,
    .named = true,
  },
  [sym_procedure_declaration] = {
    .visible = true,
    .named = true,
  },
  [sym_function_declaration] = {
    .visible = true,
    .named = true,
  },
  [sym_parameter_list] = {
    .visible = true,
    .named = true,
  },
  [sym_parameter] = {
    .visible = true,
    .named = true,
  },
  [sym_procedure_body] = {
    .visible = true,
    .named = true,
  },
  [sym_variable_declaration] = {
    .visible = true,
    .named = true,
  },
  [sym_assignment_statement] = {
    .visible = true,
    .named = true,
  },
  [sym_return_statement] = {
    .visible = true,
    .named = true,
  },
  [sym_if_statement] = {
    .visible = true,
    .named = true,
  },
  [sym_elseif_clause] = {
    .visible = true,
    .named = true,
  },
  [sym_else_clause] = {
    .visible = true,
    .named = true,
  },
  [sym_while_statement] = {
    .visible = true,
    .named = true,
  },
  [sym_for_statement] = {
    .visible = true,
    .named = true,
  },
  [sym_for_each_statement] = {
    .visible = true,
    .named = true,
  },
  [sym_break_statement] = {
    .visible = true,
    .named = true,
  },
  [sym_continue_statement] = {
    .visible = true,
    .named = true,
  },
  [sym__expression] = {
    .visible = false,
    .named = true,
  },
  [sym_call_expression] = {
    .visible = true,
    .named = true,
  },
  [sym_binary_expression] = {
    .visible = true,
    .named = true,
  },
  [sym_unary_expression] = {
    .visible = true,
    .named = true,
  },
  [sym_comparison_expression] = {
    .visible = true,
    .named = true,
  },
  [sym_logical_expression] = {
    .visible = true,
    .named = true,
  },
  [sym_parenthesized_expression] = {
    .visible = true,
    .named = true,
  },
  [sym_string_literal] = {
    .visible = true,
    .named = true,
  },
  [sym_boolean_literal] = {
    .visible = true,
    .named = true,
  },
  [sym_annotation] = {
    .visible = true,
    .named = true,
  },
  [aux_sym_source_file_repeat1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_parameter_list_repeat1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_if_statement_repeat1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_call_expression_repeat1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_string_literal_repeat1] = {
    .visible = false,
    .named = false,
  },
};

enum {
  field_body = 1,
  field_collection = 2,
  field_condition = 3,
  field_consequence = 4,
  field_default = 5,
  field_end = 6,
  field_function = 7,
  field_left = 8,
  field_name = 9,
  field_operator = 10,
  field_parameters = 11,
  field_right = 12,
  field_start = 13,
  field_variable = 14,
};

static const char * const ts_field_names[] = {
  [0] = NULL,
  [field_body] = "body",
  [field_collection] = "collection",
  [field_condition] = "condition",
  [field_consequence] = "consequence",
  [field_default] = "default",
  [field_end] = "end",
  [field_function] = "function",
  [field_left] = "left",
  [field_name] = "name",
  [field_operator] = "operator",
  [field_parameters] = "parameters",
  [field_right] = "right",
  [field_start] = "start",
  [field_variable] = "variable",
};

static const TSFieldMapSlice ts_field_map_slices[PRODUCTION_ID_COUNT] = {
  [1] = {.index = 0, .length = 1},
  [2] = {.index = 1, .length = 1},
  [3] = {.index = 2, .length = 2},
  [4] = {.index = 4, .length = 1},
  [5] = {.index = 5, .length = 2},
  [6] = {.index = 7, .length = 3},
  [7] = {.index = 10, .length = 1},
  [8] = {.index = 11, .length = 2},
  [9] = {.index = 13, .length = 2},
  [10] = {.index = 15, .length = 2},
  [11] = {.index = 17, .length = 2},
  [12] = {.index = 19, .length = 2},
  [13] = {.index = 21, .length = 2},
  [14] = {.index = 23, .length = 3},
  [15] = {.index = 26, .length = 3},
  [16] = {.index = 29, .length = 4},
};

static const TSFieldMapEntry ts_field_map_entries[] = {
  [0] =
    {field_function, 0},
  [1] =
    {field_name, 1},
  [2] =
    {field_left, 0},
    {field_right, 2},
  [4] =
    {field_name, 0},
  [5] =
    {field_name, 1},
    {field_parameters, 2},
  [7] =
    {field_left, 0},
    {field_operator, 1},
    {field_right, 2},
  [10] =
    {field_condition, 1},
  [11] =
    {field_condition, 1},
    {field_consequence, 3},
  [13] =
    {field_body, 3},
    {field_condition, 1},
  [15] =
    {field_name, 2},
    {field_parameters, 3},
  [17] =
    {field_default, 2},
    {field_name, 0},
  [19] =
    {field_default, 3},
    {field_name, 1},
  [21] =
    {field_collection, 4},
    {field_variable, 2},
  [23] =
    {field_end, 5},
    {field_start, 3},
    {field_variable, 1},
  [26] =
    {field_body, 6},
    {field_collection, 4},
    {field_variable, 2},
  [29] =
    {field_body, 7},
    {field_end, 5},
    {field_start, 3},
    {field_variable, 1},
};

static const TSSymbol ts_alias_sequences[PRODUCTION_ID_COUNT][MAX_ALIAS_SEQUENCE_LENGTH] = {
  [0] = {0},
};

static const uint16_t ts_non_terminal_alias_map[] = {
  0,
};

static const TSStateId ts_primary_state_ids[STATE_COUNT] = {
  [0] = 0,
  [1] = 1,
  [2] = 2,
  [3] = 3,
  [4] = 4,
  [5] = 5,
  [6] = 6,
  [7] = 7,
  [8] = 8,
  [9] = 9,
  [10] = 10,
  [11] = 11,
  [12] = 12,
  [13] = 13,
  [14] = 14,
  [15] = 15,
  [16] = 16,
  [17] = 17,
  [18] = 18,
  [19] = 19,
  [20] = 20,
  [21] = 21,
  [22] = 22,
  [23] = 23,
  [24] = 24,
  [25] = 25,
  [26] = 25,
  [27] = 27,
  [28] = 28,
  [29] = 29,
  [30] = 30,
  [31] = 31,
  [32] = 32,
  [33] = 33,
  [34] = 34,
  [35] = 35,
  [36] = 36,
  [37] = 37,
  [38] = 38,
  [39] = 39,
  [40] = 40,
  [41] = 41,
  [42] = 42,
  [43] = 43,
  [44] = 44,
  [45] = 45,
  [46] = 46,
  [47] = 47,
  [48] = 48,
  [49] = 49,
  [50] = 50,
  [51] = 51,
  [52] = 52,
  [53] = 53,
  [54] = 54,
  [55] = 55,
  [56] = 56,
  [57] = 57,
  [58] = 58,
  [59] = 59,
  [60] = 60,
  [61] = 61,
  [62] = 62,
  [63] = 63,
  [64] = 64,
  [65] = 65,
  [66] = 66,
  [67] = 67,
  [68] = 68,
  [69] = 69,
  [70] = 70,
  [71] = 71,
  [72] = 72,
  [73] = 73,
  [74] = 74,
  [75] = 75,
  [76] = 49,
  [77] = 77,
  [78] = 78,
  [79] = 79,
  [80] = 80,
  [81] = 81,
  [82] = 82,
  [83] = 83,
  [84] = 84,
  [85] = 85,
  [86] = 86,
  [87] = 50,
  [88] = 88,
  [89] = 89,
  [90] = 90,
  [91] = 91,
  [92] = 92,
  [93] = 93,
  [94] = 94,
  [95] = 95,
  [96] = 96,
  [97] = 97,
  [98] = 98,
  [99] = 48,
  [100] = 100,
  [101] = 101,
  [102] = 102,
  [103] = 103,
  [104] = 104,
  [105] = 105,
  [106] = 105,
  [107] = 107,
  [108] = 108,
  [109] = 109,
  [110] = 110,
  [111] = 111,
  [112] = 112,
  [113] = 113,
  [114] = 114,
  [115] = 115,
  [116] = 116,
  [117] = 117,
  [118] = 118,
  [119] = 119,
  [120] = 120,
  [121] = 121,
  [122] = 122,
  [123] = 123,
  [124] = 124,
  [125] = 125,
  [126] = 126,
  [127] = 127,
  [128] = 128,
  [129] = 129,
  [130] = 130,
  [131] = 131,
  [132] = 132,
  [133] = 133,
  [134] = 134,
  [135] = 135,
  [136] = 133,
  [137] = 137,
  [138] = 138,
  [139] = 139,
  [140] = 140,
  [141] = 141,
  [142] = 142,
  [143] = 143,
  [144] = 144,
  [145] = 145,
  [146] = 146,
  [147] = 147,
  [148] = 148,
  [149] = 149,
  [150] = 150,
  [151] = 151,
  [152] = 152,
  [153] = 153,
  [154] = 154,
  [155] = 155,
  [156] = 156,
  [157] = 157,
  [158] = 158,
  [159] = 159,
  [160] = 160,
  [161] = 161,
  [162] = 162,
  [163] = 163,
  [164] = 164,
  [165] = 165,
  [166] = 166,
  [167] = 167,
  [168] = 168,
  [169] = 169,
  [170] = 170,
  [171] = 171,
  [172] = 172,
  [173] = 173,
};

static bool ts_lex(TSLexer *lexer, TSStateId state) {
  START_LEXER();
  eof = lexer->eof(lexer);
  switch (state) {
    case 0:
      if (eof) ADVANCE(72);
      if (lookahead == '"') ADVANCE(210);
      if (lookahead == '&') ADVANCE(215);
      if (lookahead == '(') ADVANCE(182);
      if (lookahead == ')') ADVANCE(184);
      if (lookahead == '*') ADVANCE(196);
      if (lookahead == '+') ADVANCE(194);
      if (lookahead == ',') ADVANCE(183);
      if (lookahead == '-') ADVANCE(195);
      if (lookahead == '/') ADVANCE(197);
      if (lookahead == ';') ADVANCE(186);
      if (lookahead == '<') ADVANCE(199);
      if (lookahead == '=') ADVANCE(185);
      if (lookahead == '>') ADVANCE(200);
      if (lookahead == 'A' ||
          lookahead == 'a') ADVANCE(80);
      if (lookahead == 'F' ||
          lookahead == 'f') ADVANCE(74);
      if (lookahead == 'N' ||
          lookahead == 'n') ADVANCE(81);
      if (lookahead == 'O' ||
          lookahead == 'o') ADVANCE(82);
      if (lookahead == 'T' ||
          lookahead == 't') ADVANCE(83);
      if (lookahead == 'V' ||
          lookahead == 'v') ADVANCE(75);
      if (lookahead == 1042 ||
          lookahead == 1074) ADVANCE(143);
      if (lookahead == 1044 ||
          lookahead == 1076) ADVANCE(131);
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(159);
      if (lookahead == 1047 ||
          lookahead == 1079) ADVANCE(136);
      if (lookahead == 1048 ||
          lookahead == 1080) ADVANCE(132);
      if (lookahead == 1050 ||
          lookahead == 1082) ADVANCE(88);
      if (lookahead == 1051 ||
          lookahead == 1083) ADVANCE(145);
      if (lookahead == 1053 ||
          lookahead == 1085) ADVANCE(104);
      if (lookahead == 1055 ||
          lookahead == 1087) ADVANCE(105);
      if (lookahead == 1058 ||
          lookahead == 1090) ADVANCE(144);
      if (lookahead == 1060 ||
          lookahead == 1092) ADVANCE(163);
      if (lookahead == 1062 ||
          lookahead == 1094) ADVANCE(120);
      if (lookahead == 1069 ||
          lookahead == 1101) ADVANCE(124);
      if (lookahead == '\t' ||
          lookahead == '\n' ||
          lookahead == '\r' ||
          lookahead == ' ') SKIP(0)
      if (('0' <= lookahead && lookahead <= '9')) ADVANCE(207);
      if (('B' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('b' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 1:
      if (lookahead == '"') ADVANCE(210);
      if (lookahead == '/') ADVANCE(212);
      if (lookahead == '\t' ||
          lookahead == '\n' ||
          lookahead == '\r' ||
          lookahead == ' ') ADVANCE(213);
      if (lookahead != 0) ADVANCE(211);
      END_STATE();
    case 2:
      if (lookahead == '(') ADVANCE(182);
      if (lookahead == ')') ADVANCE(184);
      if (lookahead == '*') ADVANCE(196);
      if (lookahead == '+') ADVANCE(194);
      if (lookahead == ',') ADVANCE(183);
      if (lookahead == '-') ADVANCE(195);
      if (lookahead == '/') ADVANCE(197);
      if (lookahead == ';') ADVANCE(186);
      if (lookahead == '<') ADVANCE(199);
      if (lookahead == '=') ADVANCE(185);
      if (lookahead == '>') ADVANCE(200);
      if (lookahead == 'A' ||
          lookahead == 'a') ADVANCE(6);
      if (lookahead == 'O' ||
          lookahead == 'o') ADVANCE(7);
      if (lookahead == 1048 ||
          lookahead == 1080) ADVANCE(203);
      if (lookahead == 1050 ||
          lookahead == 1082) ADVANCE(41);
      if (lookahead == 1055 ||
          lookahead == 1087) ADVANCE(42);
      if (lookahead == 1058 ||
          lookahead == 1090) ADVANCE(43);
      if (lookahead == 1060 ||
          lookahead == 1092) ADVANCE(57);
      if (lookahead == 1062 ||
          lookahead == 1094) ADVANCE(28);
      if (lookahead == 1069 ||
          lookahead == 1101) ADVANCE(30);
      if (lookahead == '\t' ||
          lookahead == '\n' ||
          lookahead == '\r' ||
          lookahead == ' ') SKIP(2)
      END_STATE();
    case 3:
      if (lookahead == '/') ADVANCE(73);
      END_STATE();
    case 4:
      if (lookahead == '/') ADVANCE(3);
      if (lookahead == 1048 ||
          lookahead == 1080) ADVANCE(22);
      if (lookahead == 1050 ||
          lookahead == 1082) ADVANCE(46);
      if (lookahead == '\t' ||
          lookahead == '\n' ||
          lookahead == '\r' ||
          lookahead == ' ') SKIP(4)
      END_STATE();
    case 5:
      if (lookahead == 'D' ||
          lookahead == 'd') ADVANCE(204);
      END_STATE();
    case 6:
      if (lookahead == 'N' ||
          lookahead == 'n') ADVANCE(5);
      END_STATE();
    case 7:
      if (lookahead == 'R' ||
          lookahead == 'r') ADVANCE(206);
      END_STATE();
    case 8:
      if (lookahead == 1040 ||
          lookahead == 1072) ADVANCE(187);
      END_STATE();
    case 9:
      if (lookahead == 1040 ||
          lookahead == 1072) ADVANCE(177);
      END_STATE();
    case 10:
      if (lookahead == 1040 ||
          lookahead == 1072) ADVANCE(67);
      END_STATE();
    case 11:
      if (lookahead == 1043 ||
          lookahead == 1075) ADVANCE(12);
      END_STATE();
    case 12:
      if (lookahead == 1044 ||
          lookahead == 1076) ADVANCE(8);
      END_STATE();
    case 13:
      if (lookahead == 1044 ||
          lookahead == 1076) ADVANCE(58);
      END_STATE();
    case 14:
      if (lookahead == 1044 ||
          lookahead == 1076) ADVANCE(59);
      END_STATE();
    case 15:
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(190);
      END_STATE();
    case 16:
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(54);
      END_STATE();
    case 17:
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(54);
      if (lookahead == 1055 ||
          lookahead == 1087) ADVANCE(52);
      if (lookahead == 1060 ||
          lookahead == 1092) ADVANCE(60);
      END_STATE();
    case 18:
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(61);
      END_STATE();
    case 19:
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(13);
      END_STATE();
    case 20:
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(64);
      END_STATE();
    case 21:
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(14);
      END_STATE();
    case 22:
      if (lookahead == 1047 ||
          lookahead == 1079) ADVANCE(193);
      if (lookahead == 1053 ||
          lookahead == 1085) ADVANCE(10);
      END_STATE();
    case 23:
      if (lookahead == 1048 ||
          lookahead == 1080) ADVANCE(205);
      END_STATE();
    case 24:
      if (lookahead == 1048 ||
          lookahead == 1080) ADVANCE(69);
      END_STATE();
    case 25:
      if (lookahead == 1048 ||
          lookahead == 1080) ADVANCE(188);
      END_STATE();
    case 26:
      if (lookahead == 1048 ||
          lookahead == 1080) ADVANCE(181);
      END_STATE();
    case 27:
      if (lookahead == 1048 ||
          lookahead == 1080) ADVANCE(189);
      END_STATE();
    case 28:
      if (lookahead == 1048 ||
          lookahead == 1080) ADVANCE(31);
      END_STATE();
    case 29:
      if (lookahead == 1048 ||
          lookahead == 1080) ADVANCE(26);
      END_STATE();
    case 30:
      if (lookahead == 1050 ||
          lookahead == 1082) ADVANCE(53);
      END_STATE();
    case 31:
      if (lookahead == 1050 ||
          lookahead == 1082) ADVANCE(34);
      END_STATE();
    case 32:
      if (lookahead == 1050 ||
          lookahead == 1082) ADVANCE(63);
      END_STATE();
    case 33:
      if (lookahead == 1050 ||
          lookahead == 1082) ADVANCE(65);
      END_STATE();
    case 34:
      if (lookahead == 1051 ||
          lookahead == 1083) ADVANCE(191);
      END_STATE();
    case 35:
      if (lookahead == 1051 ||
          lookahead == 1083) ADVANCE(25);
      END_STATE();
    case 36:
      if (lookahead == 1051 ||
          lookahead == 1083) ADVANCE(27);
      END_STATE();
    case 37:
      if (lookahead == 1053 ||
          lookahead == 1085) ADVANCE(18);
      END_STATE();
    case 38:
      if (lookahead == 1053 ||
          lookahead == 1085) ADVANCE(32);
      END_STATE();
    case 39:
      if (lookahead == 1053 ||
          lookahead == 1085) ADVANCE(20);
      END_STATE();
    case 40:
      if (lookahead == 1053 ||
          lookahead == 1085) ADVANCE(33);
      END_STATE();
    case 41:
      if (lookahead == 1054 ||
          lookahead == 1086) ADVANCE(37);
      END_STATE();
    case 42:
      if (lookahead == 1054 ||
          lookahead == 1086) ADVANCE(192);
      if (lookahead == 1056 ||
          lookahead == 1088) ADVANCE(44);
      END_STATE();
    case 43:
      if (lookahead == 1054 ||
          lookahead == 1086) ADVANCE(11);
      END_STATE();
    case 44:
      if (lookahead == 1054 ||
          lookahead == 1086) ADVANCE(62);
      END_STATE();
    case 45:
      if (lookahead == 1054 ||
          lookahead == 1086) ADVANCE(49);
      END_STATE();
    case 46:
      if (lookahead == 1054 ||
          lookahead == 1086) ADVANCE(39);
      END_STATE();
    case 47:
      if (lookahead == 1054 ||
          lookahead == 1086) ADVANCE(66);
      END_STATE();
    case 48:
      if (lookahead == 1055 ||
          lookahead == 1087) ADVANCE(45);
      END_STATE();
    case 49:
      if (lookahead == 1056 ||
          lookahead == 1088) ADVANCE(56);
      END_STATE();
    case 50:
      if (lookahead == 1056 ||
          lookahead == 1088) ADVANCE(68);
      END_STATE();
    case 51:
      if (lookahead == 1056 ||
          lookahead == 1088) ADVANCE(9);
      END_STATE();
    case 52:
      if (lookahead == 1056 ||
          lookahead == 1088) ADVANCE(47);
      END_STATE();
    case 53:
      if (lookahead == 1057 ||
          lookahead == 1089) ADVANCE(48);
      END_STATE();
    case 54:
      if (lookahead == 1057 ||
          lookahead == 1089) ADVANCE(35);
      END_STATE();
    case 55:
      if (lookahead == 1057 ||
          lookahead == 1089) ADVANCE(36);
      END_STATE();
    case 56:
      if (lookahead == 1058 ||
          lookahead == 1090) ADVANCE(178);
      END_STATE();
    case 57:
      if (lookahead == 1059 ||
          lookahead == 1091) ADVANCE(38);
      END_STATE();
    case 58:
      if (lookahead == 1059 ||
          lookahead == 1091) ADVANCE(51);
      END_STATE();
    case 59:
      if (lookahead == 1059 ||
          lookahead == 1091) ADVANCE(50);
      END_STATE();
    case 60:
      if (lookahead == 1059 ||
          lookahead == 1091) ADVANCE(40);
      END_STATE();
    case 61:
      if (lookahead == 1062 ||
          lookahead == 1094) ADVANCE(17);
      END_STATE();
    case 62:
      if (lookahead == 1062 ||
          lookahead == 1094) ADVANCE(19);
      END_STATE();
    case 63:
      if (lookahead == 1062 ||
          lookahead == 1094) ADVANCE(24);
      END_STATE();
    case 64:
      if (lookahead == 1062 ||
          lookahead == 1094) ADVANCE(16);
      END_STATE();
    case 65:
      if (lookahead == 1062 ||
          lookahead == 1094) ADVANCE(29);
      END_STATE();
    case 66:
      if (lookahead == 1062 ||
          lookahead == 1094) ADVANCE(21);
      END_STATE();
    case 67:
      if (lookahead == 1063 ||
          lookahead == 1095) ADVANCE(15);
      END_STATE();
    case 68:
      if (lookahead == 1067 ||
          lookahead == 1099) ADVANCE(179);
      END_STATE();
    case 69:
      if (lookahead == 1071 ||
          lookahead == 1103) ADVANCE(180);
      END_STATE();
    case 70:
      if (('0' <= lookahead && lookahead <= '9')) ADVANCE(208);
      END_STATE();
    case 71:
      if (eof) ADVANCE(72);
      if (lookahead == '"') ADVANCE(209);
      if (lookahead == '&') ADVANCE(215);
      if (lookahead == '(') ADVANCE(182);
      if (lookahead == ')') ADVANCE(184);
      if (lookahead == '+') ADVANCE(194);
      if (lookahead == '-') ADVANCE(195);
      if (lookahead == '/') ADVANCE(3);
      if (lookahead == ';') ADVANCE(186);
      if (lookahead == 'F' ||
          lookahead == 'f') ADVANCE(74);
      if (lookahead == 'N' ||
          lookahead == 'n') ADVANCE(81);
      if (lookahead == 'T' ||
          lookahead == 't') ADVANCE(83);
      if (lookahead == 'V' ||
          lookahead == 'v') ADVANCE(75);
      if (lookahead == 1042 ||
          lookahead == 1074) ADVANCE(143);
      if (lookahead == 1044 ||
          lookahead == 1076) ADVANCE(131);
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(159);
      if (lookahead == 1047 ||
          lookahead == 1079) ADVANCE(136);
      if (lookahead == 1048 ||
          lookahead == 1080) ADVANCE(140);
      if (lookahead == 1050 ||
          lookahead == 1082) ADVANCE(88);
      if (lookahead == 1051 ||
          lookahead == 1083) ADVANCE(145);
      if (lookahead == 1053 ||
          lookahead == 1085) ADVANCE(104);
      if (lookahead == 1055 ||
          lookahead == 1087) ADVANCE(106);
      if (lookahead == 1060 ||
          lookahead == 1092) ADVANCE(163);
      if (lookahead == 1069 ||
          lookahead == 1101) ADVANCE(124);
      if (lookahead == '\t' ||
          lookahead == '\n' ||
          lookahead == '\r' ||
          lookahead == ' ') SKIP(71)
      if (('0' <= lookahead && lookahead <= '9')) ADVANCE(207);
      if (('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 72:
      ACCEPT_TOKEN(ts_builtin_sym_end);
      END_STATE();
    case 73:
      ACCEPT_TOKEN(sym_comment);
      if (lookahead != 0 &&
          lookahead != '\n') ADVANCE(73);
      END_STATE();
    case 74:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 'A' ||
          lookahead == 'a') ADVANCE(79);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('B' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('b' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 75:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 'A' ||
          lookahead == 'a') ADVANCE(78);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('B' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('b' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 76:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 'D' ||
          lookahead == 'd') ADVANCE(176);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 77:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 'E' ||
          lookahead == 'e') ADVANCE(176);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 78:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 'L' ||
          lookahead == 'l') ADVANCE(176);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 79:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 'L' ||
          lookahead == 'l') ADVANCE(84);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 80:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 'N' ||
          lookahead == 'n') ADVANCE(76);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 81:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 'O' ||
          lookahead == 'o') ADVANCE(85);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 82:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 'R' ||
          lookahead == 'r') ADVANCE(176);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 83:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 'R' ||
          lookahead == 'r') ADVANCE(86);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 84:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 'S' ||
          lookahead == 's') ADVANCE(77);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 85:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 'T' ||
          lookahead == 't') ADVANCE(176);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 86:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 'U' ||
          lookahead == 'u') ADVANCE(77);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 87:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1040 ||
          lookahead == 1072) ADVANCE(176);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1041 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 88:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1040 ||
          lookahead == 1072) ADVANCE(113);
      if (lookahead == 1054 ||
          lookahead == 1086) ADVANCE(137);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1041 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 89:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1040 ||
          lookahead == 1072) ADVANCE(171);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1041 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 90:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1040 ||
          lookahead == 1072) ADVANCE(160);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1041 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 91:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1040 ||
          lookahead == 1072) ADVANCE(172);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1041 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 92:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1040 ||
          lookahead == 1072) ADVANCE(161);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1041 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 93:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1042 ||
          lookahead == 1074) ADVANCE(156);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 94:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1042 ||
          lookahead == 1074) ADVANCE(92);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 95:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1043 ||
          lookahead == 1075) ADVANCE(98);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 96:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1043 ||
          lookahead == 1075) ADVANCE(142);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 97:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1044 ||
          lookahead == 1076) ADVANCE(164);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 98:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1044 ||
          lookahead == 1076) ADVANCE(87);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 99:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1044 ||
          lookahead == 1076) ADVANCE(146);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 100:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1044 ||
          lookahead == 1076) ADVANCE(148);
      if (lookahead == 1062 ||
          lookahead == 1094) ADVANCE(110);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 101:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1044 ||
          lookahead == 1076) ADVANCE(165);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 102:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(159);
      if (lookahead == 1055 ||
          lookahead == 1087) ADVANCE(157);
      if (lookahead == 1060 ||
          lookahead == 1092) ADVANCE(166);
      if (lookahead == 1062 ||
          lookahead == 1094) ADVANCE(123);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 103:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(159);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 104:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(176);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 105:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(155);
      if (lookahead == 1054 ||
          lookahead == 1086) ADVANCE(176);
      if (lookahead == 1056 ||
          lookahead == 1088) ADVANCE(109);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 106:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(155);
      if (lookahead == 1054 ||
          lookahead == 1086) ADVANCE(125);
      if (lookahead == 1056 ||
          lookahead == 1088) ADVANCE(109);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 107:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(167);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 108:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(135);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 109:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(154);
      if (lookahead == 1054 ||
          lookahead == 1086) ADVANCE(100);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 110:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(97);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 111:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(103);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 112:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(101);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 113:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1046 ||
          lookahead == 1078) ADVANCE(99);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 114:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1046 ||
          lookahead == 1078) ADVANCE(174);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 115:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1046 ||
          lookahead == 1078) ADVANCE(121);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 116:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1047 ||
          lookahead == 1079) ADVANCE(93);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 117:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1048 ||
          lookahead == 1080) ADVANCE(176);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 118:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1048 ||
          lookahead == 1080) ADVANCE(175);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 119:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1048 ||
          lookahead == 1080) ADVANCE(117);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 120:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1048 ||
          lookahead == 1080) ADVANCE(127);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 121:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1048 ||
          lookahead == 1080) ADVANCE(161);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 122:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1048 ||
          lookahead == 1080) ADVANCE(138);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 123:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1048 ||
          lookahead == 1080) ADVANCE(128);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 124:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1050 ||
          lookahead == 1082) ADVANCE(158);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 125:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1050 ||
          lookahead == 1082) ADVANCE(87);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 126:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1050 ||
          lookahead == 1082) ADVANCE(168);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 127:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1050 ||
          lookahead == 1082) ADVANCE(130);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 128:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1050 ||
          lookahead == 1082) ADVANCE(133);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 129:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1050 ||
          lookahead == 1082) ADVANCE(169);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 130:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1051 ||
          lookahead == 1083) ADVANCE(176);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 131:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1051 ||
          lookahead == 1083) ADVANCE(175);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 132:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1051 ||
          lookahead == 1083) ADVANCE(117);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 133:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1051 ||
          lookahead == 1083) ADVANCE(87);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 134:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1051 ||
          lookahead == 1083) ADVANCE(115);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 135:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1052 ||
          lookahead == 1084) ADVANCE(176);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 136:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1053 ||
          lookahead == 1085) ADVANCE(89);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 137:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1053 ||
          lookahead == 1085) ADVANCE(107);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 138:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1053 ||
          lookahead == 1085) ADVANCE(87);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 139:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1053 ||
          lookahead == 1085) ADVANCE(126);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 140:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1053 ||
          lookahead == 1085) ADVANCE(91);
      if (lookahead == 1057 ||
          lookahead == 1089) ADVANCE(162);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 141:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1053 ||
          lookahead == 1085) ADVANCE(129);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 142:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1054 ||
          lookahead == 1086) ADVANCE(176);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 143:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1054 ||
          lookahead == 1086) ADVANCE(116);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 144:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1054 ||
          lookahead == 1086) ADVANCE(95);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 145:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1054 ||
          lookahead == 1086) ADVANCE(114);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 146:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1054 ||
          lookahead == 1086) ADVANCE(96);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 147:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1054 ||
          lookahead == 1086) ADVANCE(170);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 148:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1054 ||
          lookahead == 1086) ADVANCE(134);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 149:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1054 ||
          lookahead == 1086) ADVANCE(151);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 150:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1055 ||
          lookahead == 1087) ADVANCE(149);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 151:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1056 ||
          lookahead == 1088) ADVANCE(160);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 152:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1056 ||
          lookahead == 1088) ADVANCE(173);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 153:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1056 ||
          lookahead == 1088) ADVANCE(87);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 154:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1056 ||
          lookahead == 1088) ADVANCE(94);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 155:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1056 ||
          lookahead == 1088) ADVANCE(108);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 156:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1056 ||
          lookahead == 1088) ADVANCE(90);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 157:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1056 ||
          lookahead == 1088) ADVANCE(147);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 158:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1057 ||
          lookahead == 1089) ADVANCE(150);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 159:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1057 ||
          lookahead == 1089) ADVANCE(132);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 160:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1058 ||
          lookahead == 1090) ADVANCE(176);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 161:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1058 ||
          lookahead == 1090) ADVANCE(174);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 162:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1058 ||
          lookahead == 1090) ADVANCE(122);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 163:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1059 ||
          lookahead == 1091) ADVANCE(139);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 164:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1059 ||
          lookahead == 1091) ADVANCE(153);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 165:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1059 ||
          lookahead == 1091) ADVANCE(152);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 166:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1059 ||
          lookahead == 1091) ADVANCE(141);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 167:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1062 ||
          lookahead == 1094) ADVANCE(102);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 168:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1062 ||
          lookahead == 1094) ADVANCE(118);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 169:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1062 ||
          lookahead == 1094) ADVANCE(119);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 170:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1062 ||
          lookahead == 1094) ADVANCE(112);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 171:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1063 ||
          lookahead == 1095) ADVANCE(176);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 172:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1063 ||
          lookahead == 1095) ADVANCE(111);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 173:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1067 ||
          lookahead == 1099) ADVANCE(176);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 174:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1068 ||
          lookahead == 1100) ADVANCE(176);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 175:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 1071 ||
          lookahead == 1103) ADVANCE(176);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1102) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 176:
      ACCEPT_TOKEN(sym_identifier);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          lookahead == 1025 ||
          (1040 <= lookahead && lookahead <= 1103) ||
          lookahead == 1105) ADVANCE(176);
      END_STATE();
    case 177:
      ACCEPT_TOKEN(aux_sym_procedure_declaration_token1);
      END_STATE();
    case 178:
      ACCEPT_TOKEN(aux_sym_procedure_declaration_token2);
      END_STATE();
    case 179:
      ACCEPT_TOKEN(aux_sym_procedure_declaration_token3);
      END_STATE();
    case 180:
      ACCEPT_TOKEN(aux_sym_function_declaration_token1);
      END_STATE();
    case 181:
      ACCEPT_TOKEN(aux_sym_function_declaration_token2);
      END_STATE();
    case 182:
      ACCEPT_TOKEN(anon_sym_LPAREN);
      END_STATE();
    case 183:
      ACCEPT_TOKEN(anon_sym_COMMA);
      END_STATE();
    case 184:
      ACCEPT_TOKEN(anon_sym_RPAREN);
      END_STATE();
    case 185:
      ACCEPT_TOKEN(anon_sym_EQ);
      END_STATE();
    case 186:
      ACCEPT_TOKEN(anon_sym_SEMI);
      END_STATE();
    case 187:
      ACCEPT_TOKEN(aux_sym_if_statement_token2);
      END_STATE();
    case 188:
      ACCEPT_TOKEN(aux_sym_if_statement_token3);
      END_STATE();
    case 189:
      ACCEPT_TOKEN(aux_sym_elseif_clause_token1);
      END_STATE();
    case 190:
      ACCEPT_TOKEN(aux_sym_else_clause_token1);
      if (lookahead == 1045 ||
          lookahead == 1077) ADVANCE(55);
      END_STATE();
    case 191:
      ACCEPT_TOKEN(aux_sym_while_statement_token2);
      END_STATE();
    case 192:
      ACCEPT_TOKEN(aux_sym_for_statement_token2);
      END_STATE();
    case 193:
      ACCEPT_TOKEN(aux_sym_for_each_statement_token2);
      END_STATE();
    case 194:
      ACCEPT_TOKEN(anon_sym_PLUS);
      END_STATE();
    case 195:
      ACCEPT_TOKEN(anon_sym_DASH);
      END_STATE();
    case 196:
      ACCEPT_TOKEN(anon_sym_STAR);
      END_STATE();
    case 197:
      ACCEPT_TOKEN(anon_sym_SLASH);
      if (lookahead == '/') ADVANCE(73);
      END_STATE();
    case 198:
      ACCEPT_TOKEN(anon_sym_LT_GT);
      END_STATE();
    case 199:
      ACCEPT_TOKEN(anon_sym_LT);
      if (lookahead == '=') ADVANCE(201);
      if (lookahead == '>') ADVANCE(198);
      END_STATE();
    case 200:
      ACCEPT_TOKEN(anon_sym_GT);
      if (lookahead == '=') ADVANCE(202);
      END_STATE();
    case 201:
      ACCEPT_TOKEN(anon_sym_LT_EQ);
      END_STATE();
    case 202:
      ACCEPT_TOKEN(anon_sym_GT_EQ);
      END_STATE();
    case 203:
      ACCEPT_TOKEN(aux_sym_logical_expression_token1);
      if (lookahead == 1051 ||
          lookahead == 1083) ADVANCE(23);
      END_STATE();
    case 204:
      ACCEPT_TOKEN(aux_sym_logical_expression_token2);
      END_STATE();
    case 205:
      ACCEPT_TOKEN(aux_sym_logical_expression_token3);
      END_STATE();
    case 206:
      ACCEPT_TOKEN(aux_sym_logical_expression_token4);
      END_STATE();
    case 207:
      ACCEPT_TOKEN(sym_number_literal);
      if (lookahead == '.') ADVANCE(70);
      if (('0' <= lookahead && lookahead <= '9')) ADVANCE(207);
      END_STATE();
    case 208:
      ACCEPT_TOKEN(sym_number_literal);
      if (('0' <= lookahead && lookahead <= '9')) ADVANCE(208);
      END_STATE();
    case 209:
      ACCEPT_TOKEN(anon_sym_DQUOTE);
      END_STATE();
    case 210:
      ACCEPT_TOKEN(anon_sym_DQUOTE);
      if (lookahead == '"') ADVANCE(214);
      END_STATE();
    case 211:
      ACCEPT_TOKEN(aux_sym_string_literal_token1);
      END_STATE();
    case 212:
      ACCEPT_TOKEN(aux_sym_string_literal_token1);
      if (lookahead == '/') ADVANCE(73);
      END_STATE();
    case 213:
      ACCEPT_TOKEN(aux_sym_string_literal_token1);
      if (lookahead == '/') ADVANCE(212);
      if (lookahead == '\t' ||
          lookahead == '\n' ||
          lookahead == '\r' ||
          lookahead == ' ') ADVANCE(213);
      if (lookahead != 0 &&
          lookahead != '"') ADVANCE(211);
      END_STATE();
    case 214:
      ACCEPT_TOKEN(anon_sym_DQUOTE_DQUOTE);
      END_STATE();
    case 215:
      ACCEPT_TOKEN(anon_sym_AMP);
      END_STATE();
    default:
      return false;
  }
}

static const TSLexMode ts_lex_modes[STATE_COUNT] = {
  [0] = {.lex_state = 0},
  [1] = {.lex_state = 71},
  [2] = {.lex_state = 71},
  [3] = {.lex_state = 71},
  [4] = {.lex_state = 71},
  [5] = {.lex_state = 71},
  [6] = {.lex_state = 71},
  [7] = {.lex_state = 71},
  [8] = {.lex_state = 71},
  [9] = {.lex_state = 71},
  [10] = {.lex_state = 71},
  [11] = {.lex_state = 71},
  [12] = {.lex_state = 71},
  [13] = {.lex_state = 71},
  [14] = {.lex_state = 71},
  [15] = {.lex_state = 71},
  [16] = {.lex_state = 71},
  [17] = {.lex_state = 71},
  [18] = {.lex_state = 71},
  [19] = {.lex_state = 71},
  [20] = {.lex_state = 71},
  [21] = {.lex_state = 71},
  [22] = {.lex_state = 71},
  [23] = {.lex_state = 71},
  [24] = {.lex_state = 71},
  [25] = {.lex_state = 71},
  [26] = {.lex_state = 71},
  [27] = {.lex_state = 71},
  [28] = {.lex_state = 71},
  [29] = {.lex_state = 71},
  [30] = {.lex_state = 71},
  [31] = {.lex_state = 71},
  [32] = {.lex_state = 71},
  [33] = {.lex_state = 71},
  [34] = {.lex_state = 71},
  [35] = {.lex_state = 2},
  [36] = {.lex_state = 71},
  [37] = {.lex_state = 71},
  [38] = {.lex_state = 71},
  [39] = {.lex_state = 71},
  [40] = {.lex_state = 71},
  [41] = {.lex_state = 71},
  [42] = {.lex_state = 71},
  [43] = {.lex_state = 71},
  [44] = {.lex_state = 71},
  [45] = {.lex_state = 71},
  [46] = {.lex_state = 2},
  [47] = {.lex_state = 2},
  [48] = {.lex_state = 2},
  [49] = {.lex_state = 2},
  [50] = {.lex_state = 2},
  [51] = {.lex_state = 2},
  [52] = {.lex_state = 2},
  [53] = {.lex_state = 2},
  [54] = {.lex_state = 2},
  [55] = {.lex_state = 2},
  [56] = {.lex_state = 2},
  [57] = {.lex_state = 2},
  [58] = {.lex_state = 2},
  [59] = {.lex_state = 71},
  [60] = {.lex_state = 71},
  [61] = {.lex_state = 71},
  [62] = {.lex_state = 71},
  [63] = {.lex_state = 71},
  [64] = {.lex_state = 71},
  [65] = {.lex_state = 71},
  [66] = {.lex_state = 71},
  [67] = {.lex_state = 71},
  [68] = {.lex_state = 71},
  [69] = {.lex_state = 71},
  [70] = {.lex_state = 71},
  [71] = {.lex_state = 71},
  [72] = {.lex_state = 71},
  [73] = {.lex_state = 71},
  [74] = {.lex_state = 71},
  [75] = {.lex_state = 71},
  [76] = {.lex_state = 71},
  [77] = {.lex_state = 71},
  [78] = {.lex_state = 71},
  [79] = {.lex_state = 71},
  [80] = {.lex_state = 71},
  [81] = {.lex_state = 71},
  [82] = {.lex_state = 71},
  [83] = {.lex_state = 71},
  [84] = {.lex_state = 71},
  [85] = {.lex_state = 71},
  [86] = {.lex_state = 71},
  [87] = {.lex_state = 71},
  [88] = {.lex_state = 71},
  [89] = {.lex_state = 71},
  [90] = {.lex_state = 71},
  [91] = {.lex_state = 71},
  [92] = {.lex_state = 71},
  [93] = {.lex_state = 71},
  [94] = {.lex_state = 71},
  [95] = {.lex_state = 71},
  [96] = {.lex_state = 71},
  [97] = {.lex_state = 71},
  [98] = {.lex_state = 71},
  [99] = {.lex_state = 71},
  [100] = {.lex_state = 71},
  [101] = {.lex_state = 71},
  [102] = {.lex_state = 71},
  [103] = {.lex_state = 71},
  [104] = {.lex_state = 71},
  [105] = {.lex_state = 2},
  [106] = {.lex_state = 2},
  [107] = {.lex_state = 2},
  [108] = {.lex_state = 2},
  [109] = {.lex_state = 2},
  [110] = {.lex_state = 2},
  [111] = {.lex_state = 2},
  [112] = {.lex_state = 2},
  [113] = {.lex_state = 2},
  [114] = {.lex_state = 2},
  [115] = {.lex_state = 2},
  [116] = {.lex_state = 2},
  [117] = {.lex_state = 2},
  [118] = {.lex_state = 2},
  [119] = {.lex_state = 71},
  [120] = {.lex_state = 71},
  [121] = {.lex_state = 71},
  [122] = {.lex_state = 4},
  [123] = {.lex_state = 4},
  [124] = {.lex_state = 71},
  [125] = {.lex_state = 4},
  [126] = {.lex_state = 1},
  [127] = {.lex_state = 71},
  [128] = {.lex_state = 1},
  [129] = {.lex_state = 1},
  [130] = {.lex_state = 0},
  [131] = {.lex_state = 0},
  [132] = {.lex_state = 0},
  [133] = {.lex_state = 0},
  [134] = {.lex_state = 0},
  [135] = {.lex_state = 0},
  [136] = {.lex_state = 0},
  [137] = {.lex_state = 0},
  [138] = {.lex_state = 0},
  [139] = {.lex_state = 71},
  [140] = {.lex_state = 0},
  [141] = {.lex_state = 0},
  [142] = {.lex_state = 0},
  [143] = {.lex_state = 2},
  [144] = {.lex_state = 0},
  [145] = {.lex_state = 2},
  [146] = {.lex_state = 0},
  [147] = {.lex_state = 2},
  [148] = {.lex_state = 71},
  [149] = {.lex_state = 71},
  [150] = {.lex_state = 2},
  [151] = {.lex_state = 0},
  [152] = {.lex_state = 0},
  [153] = {.lex_state = 4},
  [154] = {.lex_state = 2},
  [155] = {.lex_state = 2},
  [156] = {.lex_state = 71},
  [157] = {.lex_state = 2},
  [158] = {.lex_state = 2},
  [159] = {.lex_state = 2},
  [160] = {.lex_state = 2},
  [161] = {.lex_state = 2},
  [162] = {.lex_state = 0},
  [163] = {.lex_state = 2},
  [164] = {.lex_state = 71},
  [165] = {.lex_state = 71},
  [166] = {.lex_state = 2},
  [167] = {.lex_state = 2},
  [168] = {.lex_state = 71},
  [169] = {.lex_state = 0},
  [170] = {.lex_state = 71},
  [171] = {.lex_state = 71},
  [172] = {.lex_state = 2},
  [173] = {.lex_state = 0},
};

static const uint16_t ts_parse_table[LARGE_STATE_COUNT][SYMBOL_COUNT] = {
  [0] = {
    [ts_builtin_sym_end] = ACTIONS(1),
    [sym_comment] = ACTIONS(3),
    [sym_identifier] = ACTIONS(1),
    [aux_sym_procedure_declaration_token1] = ACTIONS(1),
    [aux_sym_procedure_declaration_token2] = ACTIONS(1),
    [aux_sym_procedure_declaration_token3] = ACTIONS(1),
    [aux_sym_function_declaration_token1] = ACTIONS(1),
    [aux_sym_function_declaration_token2] = ACTIONS(1),
    [anon_sym_LPAREN] = ACTIONS(1),
    [anon_sym_COMMA] = ACTIONS(1),
    [anon_sym_RPAREN] = ACTIONS(1),
    [aux_sym_parameter_token1] = ACTIONS(1),
    [aux_sym_parameter_token2] = ACTIONS(1),
    [anon_sym_EQ] = ACTIONS(1),
    [aux_sym_variable_declaration_token1] = ACTIONS(1),
    [anon_sym_SEMI] = ACTIONS(1),
    [aux_sym_return_statement_token1] = ACTIONS(1),
    [aux_sym_if_statement_token1] = ACTIONS(1),
    [aux_sym_if_statement_token2] = ACTIONS(1),
    [aux_sym_if_statement_token3] = ACTIONS(1),
    [aux_sym_while_statement_token2] = ACTIONS(1),
    [aux_sym_while_statement_token3] = ACTIONS(1),
    [aux_sym_for_statement_token1] = ACTIONS(1),
    [aux_sym_for_statement_token2] = ACTIONS(1),
    [aux_sym_for_each_statement_token1] = ACTIONS(1),
    [aux_sym_break_statement_token1] = ACTIONS(1),
    [aux_sym_continue_statement_token1] = ACTIONS(1),
    [anon_sym_PLUS] = ACTIONS(1),
    [anon_sym_DASH] = ACTIONS(1),
    [anon_sym_STAR] = ACTIONS(1),
    [anon_sym_SLASH] = ACTIONS(1),
    [aux_sym_unary_expression_token1] = ACTIONS(1),
    [aux_sym_unary_expression_token2] = ACTIONS(1),
    [anon_sym_LT_GT] = ACTIONS(1),
    [anon_sym_LT] = ACTIONS(1),
    [anon_sym_GT] = ACTIONS(1),
    [anon_sym_LT_EQ] = ACTIONS(1),
    [anon_sym_GT_EQ] = ACTIONS(1),
    [aux_sym_logical_expression_token1] = ACTIONS(1),
    [aux_sym_logical_expression_token2] = ACTIONS(1),
    [aux_sym_logical_expression_token3] = ACTIONS(1),
    [aux_sym_logical_expression_token4] = ACTIONS(1),
    [sym_number_literal] = ACTIONS(1),
    [anon_sym_DQUOTE] = ACTIONS(1),
    [anon_sym_DQUOTE_DQUOTE] = ACTIONS(1),
    [aux_sym_boolean_literal_token2] = ACTIONS(1),
    [aux_sym_boolean_literal_token3] = ACTIONS(1),
    [aux_sym_boolean_literal_token4] = ACTIONS(1),
    [anon_sym_AMP] = ACTIONS(1),
  },
  [1] = {
    [sym_source_file] = STATE(151),
    [sym__statement] = STATE(17),
    [sym_procedure_declaration] = STATE(17),
    [sym_function_declaration] = STATE(17),
    [sym_variable_declaration] = STATE(17),
    [sym_assignment_statement] = STATE(17),
    [sym_return_statement] = STATE(17),
    [sym_if_statement] = STATE(17),
    [sym_while_statement] = STATE(17),
    [sym_for_statement] = STATE(17),
    [sym_for_each_statement] = STATE(17),
    [sym_break_statement] = STATE(17),
    [sym_continue_statement] = STATE(17),
    [sym_call_expression] = STATE(17),
    [sym_annotation] = STATE(147),
    [aux_sym_source_file_repeat1] = STATE(17),
    [ts_builtin_sym_end] = ACTIONS(5),
    [sym_comment] = ACTIONS(3),
    [sym_identifier] = ACTIONS(7),
    [aux_sym_procedure_declaration_token1] = ACTIONS(9),
    [aux_sym_function_declaration_token1] = ACTIONS(11),
    [aux_sym_variable_declaration_token1] = ACTIONS(13),
    [aux_sym_return_statement_token1] = ACTIONS(15),
    [aux_sym_if_statement_token1] = ACTIONS(17),
    [aux_sym_while_statement_token1] = ACTIONS(19),
    [aux_sym_for_statement_token1] = ACTIONS(21),
    [aux_sym_break_statement_token1] = ACTIONS(23),
    [aux_sym_continue_statement_token1] = ACTIONS(25),
    [anon_sym_AMP] = ACTIONS(27),
  },
};

static const uint16_t ts_small_parse_table[] = {
  [0] = 16,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(29), 1,
      ts_builtin_sym_end,
    ACTIONS(31), 1,
      sym_identifier,
    ACTIONS(34), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(39), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(42), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(45), 1,
      aux_sym_return_statement_token1,
    ACTIONS(48), 1,
      aux_sym_if_statement_token1,
    ACTIONS(51), 1,
      aux_sym_while_statement_token1,
    ACTIONS(54), 1,
      aux_sym_for_statement_token1,
    ACTIONS(57), 1,
      aux_sym_break_statement_token1,
    ACTIONS(60), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(63), 1,
      anon_sym_AMP,
    STATE(147), 1,
      sym_annotation,
    ACTIONS(37), 6,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token2,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token3,
    STATE(2), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [67] = 19,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    ACTIONS(66), 1,
      aux_sym_if_statement_token3,
    ACTIONS(68), 1,
      aux_sym_elseif_clause_token1,
    ACTIONS(70), 1,
      aux_sym_else_clause_token1,
    STATE(147), 1,
      sym_annotation,
    STATE(155), 1,
      sym_else_clause,
    STATE(122), 2,
      sym_elseif_clause,
      aux_sym_if_statement_repeat1,
    STATE(2), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [139] = 19,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    ACTIONS(68), 1,
      aux_sym_elseif_clause_token1,
    ACTIONS(70), 1,
      aux_sym_else_clause_token1,
    ACTIONS(72), 1,
      aux_sym_if_statement_token3,
    STATE(147), 1,
      sym_annotation,
    STATE(160), 1,
      sym_else_clause,
    STATE(123), 2,
      sym_elseif_clause,
      aux_sym_if_statement_repeat1,
    STATE(3), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [211] = 15,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    STATE(147), 1,
      sym_annotation,
    ACTIONS(74), 3,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
    STATE(9), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [272] = 17,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    ACTIONS(76), 1,
      aux_sym_procedure_declaration_token2,
    ACTIONS(78), 1,
      aux_sym_procedure_declaration_token3,
    STATE(147), 1,
      sym_annotation,
    STATE(163), 1,
      sym_procedure_body,
    STATE(15), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [337] = 17,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    ACTIONS(80), 1,
      aux_sym_procedure_declaration_token2,
    ACTIONS(82), 1,
      aux_sym_function_declaration_token2,
    STATE(147), 1,
      sym_annotation,
    STATE(172), 1,
      sym_procedure_body,
    STATE(15), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [402] = 17,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    ACTIONS(84), 1,
      aux_sym_procedure_declaration_token2,
    ACTIONS(86), 1,
      aux_sym_function_declaration_token2,
    STATE(147), 1,
      sym_annotation,
    STATE(166), 1,
      sym_procedure_body,
    STATE(15), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [467] = 15,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    STATE(147), 1,
      sym_annotation,
    ACTIONS(88), 3,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
    STATE(2), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [528] = 17,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    ACTIONS(90), 1,
      aux_sym_procedure_declaration_token2,
    ACTIONS(92), 1,
      aux_sym_procedure_declaration_token3,
    STATE(147), 1,
      sym_annotation,
    STATE(167), 1,
      sym_procedure_body,
    STATE(15), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [593] = 16,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    ACTIONS(94), 1,
      aux_sym_procedure_declaration_token3,
    STATE(147), 1,
      sym_annotation,
    STATE(159), 1,
      sym_procedure_body,
    STATE(15), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [655] = 16,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    ACTIONS(96), 1,
      aux_sym_function_declaration_token2,
    STATE(147), 1,
      sym_annotation,
    STATE(150), 1,
      sym_procedure_body,
    STATE(15), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [717] = 16,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    ACTIONS(98), 1,
      aux_sym_procedure_declaration_token3,
    STATE(147), 1,
      sym_annotation,
    STATE(161), 1,
      sym_procedure_body,
    STATE(15), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [779] = 16,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    ACTIONS(100), 1,
      aux_sym_function_declaration_token2,
    STATE(147), 1,
      sym_annotation,
    STATE(158), 1,
      sym_procedure_body,
    STATE(15), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [841] = 15,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    STATE(147), 1,
      sym_annotation,
    ACTIONS(102), 2,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token2,
    STATE(2), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [901] = 15,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    ACTIONS(104), 1,
      aux_sym_while_statement_token3,
    STATE(147), 1,
      sym_annotation,
    STATE(22), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [960] = 15,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    ACTIONS(106), 1,
      ts_builtin_sym_end,
    STATE(147), 1,
      sym_annotation,
    STATE(2), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [1019] = 15,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    ACTIONS(108), 1,
      aux_sym_while_statement_token3,
    STATE(147), 1,
      sym_annotation,
    STATE(23), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [1078] = 15,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    ACTIONS(110), 1,
      aux_sym_if_statement_token3,
    STATE(147), 1,
      sym_annotation,
    STATE(2), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [1137] = 15,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    ACTIONS(112), 1,
      aux_sym_if_statement_token3,
    STATE(147), 1,
      sym_annotation,
    STATE(19), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [1196] = 15,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    ACTIONS(114), 1,
      aux_sym_while_statement_token3,
    STATE(147), 1,
      sym_annotation,
    STATE(24), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [1255] = 15,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    ACTIONS(116), 1,
      aux_sym_while_statement_token3,
    STATE(147), 1,
      sym_annotation,
    STATE(2), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [1314] = 15,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    ACTIONS(118), 1,
      aux_sym_while_statement_token3,
    STATE(147), 1,
      sym_annotation,
    STATE(2), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [1373] = 15,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(11), 1,
      aux_sym_function_declaration_token1,
    ACTIONS(13), 1,
      aux_sym_variable_declaration_token1,
    ACTIONS(15), 1,
      aux_sym_return_statement_token1,
    ACTIONS(17), 1,
      aux_sym_if_statement_token1,
    ACTIONS(19), 1,
      aux_sym_while_statement_token1,
    ACTIONS(21), 1,
      aux_sym_for_statement_token1,
    ACTIONS(23), 1,
      aux_sym_break_statement_token1,
    ACTIONS(25), 1,
      aux_sym_continue_statement_token1,
    ACTIONS(27), 1,
      anon_sym_AMP,
    ACTIONS(120), 1,
      aux_sym_while_statement_token3,
    STATE(147), 1,
      sym_annotation,
    STATE(2), 14,
      sym__statement,
      sym_procedure_declaration,
      sym_function_declaration,
      sym_variable_declaration,
      sym_assignment_statement,
      sym_return_statement,
      sym_if_statement,
      sym_while_statement,
      sym_for_statement,
      sym_for_each_statement,
      sym_break_statement,
      sym_continue_statement,
      sym_call_expression,
      aux_sym_source_file_repeat1,
  [1432] = 10,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(126), 1,
      anon_sym_RPAREN,
    ACTIONS(132), 1,
      sym_number_literal,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(106), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [1476] = 10,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(138), 1,
      anon_sym_RPAREN,
    ACTIONS(140), 1,
      sym_number_literal,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(105), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [1520] = 10,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(142), 1,
      anon_sym_SEMI,
    ACTIONS(144), 1,
      sym_number_literal,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(110), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [1564] = 9,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(146), 1,
      sym_number_literal,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(115), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [1605] = 9,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(148), 1,
      sym_number_literal,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(117), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [1646] = 9,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(150), 1,
      sym_number_literal,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(112), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [1687] = 9,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(152), 1,
      sym_number_literal,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(116), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [1728] = 9,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(154), 1,
      sym_number_literal,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(47), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [1769] = 9,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(156), 1,
      sym_number_literal,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(107), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [1810] = 9,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(158), 1,
      sym_number_literal,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(57), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [1851] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(160), 1,
      anon_sym_LPAREN,
    ACTIONS(164), 4,
      anon_sym_SLASH,
      anon_sym_LT,
      anon_sym_GT,
      aux_sym_logical_expression_token1,
    ACTIONS(162), 16,
      anon_sym_COMMA,
      anon_sym_RPAREN,
      anon_sym_EQ,
      anon_sym_SEMI,
      aux_sym_if_statement_token2,
      aux_sym_while_statement_token2,
      aux_sym_for_statement_token2,
      anon_sym_PLUS,
      anon_sym_DASH,
      anon_sym_STAR,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
      aux_sym_logical_expression_token2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
  [1882] = 9,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(166), 1,
      sym_number_literal,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(56), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [1923] = 9,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(168), 1,
      sym_number_literal,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(108), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [1964] = 9,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(170), 1,
      sym_number_literal,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(55), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [2005] = 9,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(172), 1,
      sym_number_literal,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(54), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [2046] = 9,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(174), 1,
      sym_number_literal,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(46), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [2087] = 9,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(176), 1,
      sym_number_literal,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(111), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [2128] = 9,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(178), 1,
      sym_number_literal,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(113), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [2169] = 9,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(180), 1,
      sym_number_literal,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(109), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [2210] = 9,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(182), 1,
      sym_number_literal,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(118), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [2251] = 9,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(122), 1,
      sym_identifier,
    ACTIONS(124), 1,
      anon_sym_LPAREN,
    ACTIONS(134), 1,
      anon_sym_DQUOTE,
    ACTIONS(184), 1,
      sym_number_literal,
    ACTIONS(128), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(130), 2,
      aux_sym_unary_expression_token1,
      aux_sym_unary_expression_token2,
    ACTIONS(136), 4,
      aux_sym_boolean_literal_token1,
      aux_sym_boolean_literal_token2,
      aux_sym_boolean_literal_token3,
      aux_sym_boolean_literal_token4,
    STATE(114), 9,
      sym__expression,
      sym_call_expression,
      sym_binary_expression,
      sym_unary_expression,
      sym_comparison_expression,
      sym_logical_expression,
      sym_parenthesized_expression,
      sym_string_literal,
      sym_boolean_literal,
  [2292] = 9,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(192), 1,
      anon_sym_STAR,
    ACTIONS(194), 1,
      anon_sym_SLASH,
    ACTIONS(198), 1,
      aux_sym_logical_expression_token1,
    ACTIONS(200), 1,
      aux_sym_logical_expression_token2,
    ACTIONS(190), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(196), 2,
      anon_sym_LT,
      anon_sym_GT,
    ACTIONS(188), 4,
      anon_sym_EQ,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
    ACTIONS(186), 8,
      anon_sym_COMMA,
      anon_sym_RPAREN,
      anon_sym_SEMI,
      aux_sym_if_statement_token2,
      aux_sym_while_statement_token2,
      aux_sym_for_statement_token2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
  [2332] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(204), 4,
      anon_sym_SLASH,
      anon_sym_LT,
      anon_sym_GT,
      aux_sym_logical_expression_token1,
    ACTIONS(202), 16,
      anon_sym_COMMA,
      anon_sym_RPAREN,
      anon_sym_EQ,
      anon_sym_SEMI,
      aux_sym_if_statement_token2,
      aux_sym_while_statement_token2,
      aux_sym_for_statement_token2,
      anon_sym_PLUS,
      anon_sym_DASH,
      anon_sym_STAR,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
      aux_sym_logical_expression_token2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
  [2360] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(208), 4,
      anon_sym_SLASH,
      anon_sym_LT,
      anon_sym_GT,
      aux_sym_logical_expression_token1,
    ACTIONS(206), 16,
      anon_sym_COMMA,
      anon_sym_RPAREN,
      anon_sym_EQ,
      anon_sym_SEMI,
      aux_sym_if_statement_token2,
      aux_sym_while_statement_token2,
      aux_sym_for_statement_token2,
      anon_sym_PLUS,
      anon_sym_DASH,
      anon_sym_STAR,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
      aux_sym_logical_expression_token2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
  [2388] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(212), 4,
      anon_sym_SLASH,
      anon_sym_LT,
      anon_sym_GT,
      aux_sym_logical_expression_token1,
    ACTIONS(210), 16,
      anon_sym_COMMA,
      anon_sym_RPAREN,
      anon_sym_EQ,
      anon_sym_SEMI,
      aux_sym_if_statement_token2,
      aux_sym_while_statement_token2,
      aux_sym_for_statement_token2,
      anon_sym_PLUS,
      anon_sym_DASH,
      anon_sym_STAR,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
      aux_sym_logical_expression_token2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
  [2416] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(216), 4,
      anon_sym_SLASH,
      anon_sym_LT,
      anon_sym_GT,
      aux_sym_logical_expression_token1,
    ACTIONS(214), 16,
      anon_sym_COMMA,
      anon_sym_RPAREN,
      anon_sym_EQ,
      anon_sym_SEMI,
      aux_sym_if_statement_token2,
      aux_sym_while_statement_token2,
      aux_sym_for_statement_token2,
      anon_sym_PLUS,
      anon_sym_DASH,
      anon_sym_STAR,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
      aux_sym_logical_expression_token2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
  [2444] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(220), 4,
      anon_sym_SLASH,
      anon_sym_LT,
      anon_sym_GT,
      aux_sym_logical_expression_token1,
    ACTIONS(218), 16,
      anon_sym_COMMA,
      anon_sym_RPAREN,
      anon_sym_EQ,
      anon_sym_SEMI,
      aux_sym_if_statement_token2,
      aux_sym_while_statement_token2,
      aux_sym_for_statement_token2,
      anon_sym_PLUS,
      anon_sym_DASH,
      anon_sym_STAR,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
      aux_sym_logical_expression_token2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
  [2472] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(224), 4,
      anon_sym_SLASH,
      anon_sym_LT,
      anon_sym_GT,
      aux_sym_logical_expression_token1,
    ACTIONS(222), 16,
      anon_sym_COMMA,
      anon_sym_RPAREN,
      anon_sym_EQ,
      anon_sym_SEMI,
      aux_sym_if_statement_token2,
      aux_sym_while_statement_token2,
      aux_sym_for_statement_token2,
      anon_sym_PLUS,
      anon_sym_DASH,
      anon_sym_STAR,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
      aux_sym_logical_expression_token2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
  [2500] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(228), 4,
      anon_sym_SLASH,
      anon_sym_LT,
      anon_sym_GT,
      aux_sym_logical_expression_token1,
    ACTIONS(226), 16,
      anon_sym_COMMA,
      anon_sym_RPAREN,
      anon_sym_EQ,
      anon_sym_SEMI,
      aux_sym_if_statement_token2,
      aux_sym_while_statement_token2,
      aux_sym_for_statement_token2,
      anon_sym_PLUS,
      anon_sym_DASH,
      anon_sym_STAR,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
      aux_sym_logical_expression_token2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
  [2528] = 8,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(192), 1,
      anon_sym_STAR,
    ACTIONS(194), 1,
      anon_sym_SLASH,
    ACTIONS(230), 1,
      aux_sym_logical_expression_token1,
    ACTIONS(190), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(196), 2,
      anon_sym_LT,
      anon_sym_GT,
    ACTIONS(188), 4,
      anon_sym_EQ,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
    ACTIONS(186), 9,
      anon_sym_COMMA,
      anon_sym_RPAREN,
      anon_sym_SEMI,
      aux_sym_if_statement_token2,
      aux_sym_while_statement_token2,
      aux_sym_for_statement_token2,
      aux_sym_logical_expression_token2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
  [2566] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(234), 4,
      anon_sym_SLASH,
      anon_sym_LT,
      anon_sym_GT,
      aux_sym_logical_expression_token1,
    ACTIONS(232), 16,
      anon_sym_COMMA,
      anon_sym_RPAREN,
      anon_sym_EQ,
      anon_sym_SEMI,
      aux_sym_if_statement_token2,
      aux_sym_while_statement_token2,
      aux_sym_for_statement_token2,
      anon_sym_PLUS,
      anon_sym_DASH,
      anon_sym_STAR,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
      aux_sym_logical_expression_token2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
  [2594] = 5,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(192), 1,
      anon_sym_STAR,
    ACTIONS(194), 1,
      anon_sym_SLASH,
    ACTIONS(234), 3,
      anon_sym_LT,
      anon_sym_GT,
      aux_sym_logical_expression_token1,
    ACTIONS(232), 15,
      anon_sym_COMMA,
      anon_sym_RPAREN,
      anon_sym_EQ,
      anon_sym_SEMI,
      aux_sym_if_statement_token2,
      aux_sym_while_statement_token2,
      aux_sym_for_statement_token2,
      anon_sym_PLUS,
      anon_sym_DASH,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
      aux_sym_logical_expression_token2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
  [2626] = 6,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(192), 1,
      anon_sym_STAR,
    ACTIONS(194), 1,
      anon_sym_SLASH,
    ACTIONS(190), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(238), 3,
      anon_sym_LT,
      anon_sym_GT,
      aux_sym_logical_expression_token1,
    ACTIONS(236), 13,
      anon_sym_COMMA,
      anon_sym_RPAREN,
      anon_sym_EQ,
      anon_sym_SEMI,
      aux_sym_if_statement_token2,
      aux_sym_while_statement_token2,
      aux_sym_for_statement_token2,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
      aux_sym_logical_expression_token2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
  [2660] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(242), 4,
      anon_sym_SLASH,
      anon_sym_LT,
      anon_sym_GT,
      aux_sym_logical_expression_token1,
    ACTIONS(240), 16,
      anon_sym_COMMA,
      anon_sym_RPAREN,
      anon_sym_EQ,
      anon_sym_SEMI,
      aux_sym_if_statement_token2,
      aux_sym_while_statement_token2,
      aux_sym_for_statement_token2,
      anon_sym_PLUS,
      anon_sym_DASH,
      anon_sym_STAR,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
      aux_sym_logical_expression_token2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
  [2688] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(248), 1,
      anon_sym_SEMI,
    ACTIONS(244), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(246), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [2717] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(254), 1,
      anon_sym_SEMI,
    ACTIONS(250), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(252), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [2746] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(260), 1,
      anon_sym_SEMI,
    ACTIONS(256), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(258), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [2775] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(266), 1,
      anon_sym_SEMI,
    ACTIONS(262), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(264), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [2804] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(272), 1,
      anon_sym_SEMI,
    ACTIONS(268), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(270), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [2833] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(278), 1,
      anon_sym_SEMI,
    ACTIONS(274), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(276), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [2862] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(284), 1,
      anon_sym_SEMI,
    ACTIONS(280), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(282), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [2891] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(290), 1,
      anon_sym_SEMI,
    ACTIONS(286), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(288), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [2920] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(296), 1,
      anon_sym_SEMI,
    ACTIONS(292), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(294), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [2949] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(302), 1,
      anon_sym_SEMI,
    ACTIONS(298), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(300), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [2978] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(308), 1,
      anon_sym_SEMI,
    ACTIONS(304), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(306), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3007] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(314), 1,
      anon_sym_SEMI,
    ACTIONS(310), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(312), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3036] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(316), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(318), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3062] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(320), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(322), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3088] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(324), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(326), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3114] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(328), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(330), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3140] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(332), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(334), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3166] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(210), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(212), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3192] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(336), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(338), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3218] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(340), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(342), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3244] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(344), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(346), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3270] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(280), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(282), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3296] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(348), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(350), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3322] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(286), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(288), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3348] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(352), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(354), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3374] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(356), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(358), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3400] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(360), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(362), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3426] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(364), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(366), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3452] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(214), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(216), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3478] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(368), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(370), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3504] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(372), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(374), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3530] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(376), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(378), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3556] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(380), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(382), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3582] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(384), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(386), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3608] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(388), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(390), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3634] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(292), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(294), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3660] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(392), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(394), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3686] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(396), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(398), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3712] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(400), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(402), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3738] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(262), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(264), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3764] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(206), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(208), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3790] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(404), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(406), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3816] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(408), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(410), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3842] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(412), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(414), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3868] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(416), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(418), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3894] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(420), 3,
      ts_builtin_sym_end,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(422), 15,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_if_statement_token3,
      aux_sym_elseif_clause_token1,
      aux_sym_else_clause_token1,
      aux_sym_while_statement_token1,
      aux_sym_while_statement_token3,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [3920] = 12,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(192), 1,
      anon_sym_STAR,
    ACTIONS(194), 1,
      anon_sym_SLASH,
    ACTIONS(198), 1,
      aux_sym_logical_expression_token1,
    ACTIONS(200), 1,
      aux_sym_logical_expression_token2,
    ACTIONS(424), 1,
      anon_sym_COMMA,
    ACTIONS(426), 1,
      anon_sym_RPAREN,
    STATE(136), 1,
      aux_sym_call_expression_repeat1,
    ACTIONS(190), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(196), 2,
      anon_sym_LT,
      anon_sym_GT,
    ACTIONS(428), 2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
    ACTIONS(188), 4,
      anon_sym_EQ,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
  [3963] = 12,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(192), 1,
      anon_sym_STAR,
    ACTIONS(194), 1,
      anon_sym_SLASH,
    ACTIONS(198), 1,
      aux_sym_logical_expression_token1,
    ACTIONS(200), 1,
      aux_sym_logical_expression_token2,
    ACTIONS(424), 1,
      anon_sym_COMMA,
    ACTIONS(430), 1,
      anon_sym_RPAREN,
    STATE(133), 1,
      aux_sym_call_expression_repeat1,
    ACTIONS(190), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(196), 2,
      anon_sym_LT,
      anon_sym_GT,
    ACTIONS(428), 2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
    ACTIONS(188), 4,
      anon_sym_EQ,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
  [4006] = 10,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(192), 1,
      anon_sym_STAR,
    ACTIONS(194), 1,
      anon_sym_SLASH,
    ACTIONS(198), 1,
      aux_sym_logical_expression_token1,
    ACTIONS(200), 1,
      aux_sym_logical_expression_token2,
    ACTIONS(190), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(196), 2,
      anon_sym_LT,
      anon_sym_GT,
    ACTIONS(428), 2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
    ACTIONS(432), 2,
      anon_sym_COMMA,
      anon_sym_RPAREN,
    ACTIONS(188), 4,
      anon_sym_EQ,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
  [4044] = 10,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(192), 1,
      anon_sym_STAR,
    ACTIONS(194), 1,
      anon_sym_SLASH,
    ACTIONS(198), 1,
      aux_sym_logical_expression_token1,
    ACTIONS(200), 1,
      aux_sym_logical_expression_token2,
    ACTIONS(190), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(196), 2,
      anon_sym_LT,
      anon_sym_GT,
    ACTIONS(428), 2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
    ACTIONS(434), 2,
      anon_sym_COMMA,
      anon_sym_RPAREN,
    ACTIONS(188), 4,
      anon_sym_EQ,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
  [4082] = 10,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(192), 1,
      anon_sym_STAR,
    ACTIONS(194), 1,
      anon_sym_SLASH,
    ACTIONS(198), 1,
      aux_sym_logical_expression_token1,
    ACTIONS(200), 1,
      aux_sym_logical_expression_token2,
    ACTIONS(190), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(196), 2,
      anon_sym_LT,
      anon_sym_GT,
    ACTIONS(428), 2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
    ACTIONS(436), 2,
      anon_sym_COMMA,
      anon_sym_RPAREN,
    ACTIONS(188), 4,
      anon_sym_EQ,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
  [4120] = 10,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(192), 1,
      anon_sym_STAR,
    ACTIONS(194), 1,
      anon_sym_SLASH,
    ACTIONS(198), 1,
      aux_sym_logical_expression_token1,
    ACTIONS(200), 1,
      aux_sym_logical_expression_token2,
    ACTIONS(438), 1,
      anon_sym_SEMI,
    ACTIONS(190), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(196), 2,
      anon_sym_LT,
      anon_sym_GT,
    ACTIONS(428), 2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
    ACTIONS(188), 4,
      anon_sym_EQ,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
  [4157] = 10,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(192), 1,
      anon_sym_STAR,
    ACTIONS(194), 1,
      anon_sym_SLASH,
    ACTIONS(198), 1,
      aux_sym_logical_expression_token1,
    ACTIONS(200), 1,
      aux_sym_logical_expression_token2,
    ACTIONS(440), 1,
      aux_sym_while_statement_token2,
    ACTIONS(190), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(196), 2,
      anon_sym_LT,
      anon_sym_GT,
    ACTIONS(428), 2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
    ACTIONS(188), 4,
      anon_sym_EQ,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
  [4194] = 10,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(192), 1,
      anon_sym_STAR,
    ACTIONS(194), 1,
      anon_sym_SLASH,
    ACTIONS(198), 1,
      aux_sym_logical_expression_token1,
    ACTIONS(200), 1,
      aux_sym_logical_expression_token2,
    ACTIONS(442), 1,
      aux_sym_if_statement_token2,
    ACTIONS(190), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(196), 2,
      anon_sym_LT,
      anon_sym_GT,
    ACTIONS(428), 2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
    ACTIONS(188), 4,
      anon_sym_EQ,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
  [4231] = 10,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(192), 1,
      anon_sym_STAR,
    ACTIONS(194), 1,
      anon_sym_SLASH,
    ACTIONS(198), 1,
      aux_sym_logical_expression_token1,
    ACTIONS(200), 1,
      aux_sym_logical_expression_token2,
    ACTIONS(444), 1,
      anon_sym_SEMI,
    ACTIONS(190), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(196), 2,
      anon_sym_LT,
      anon_sym_GT,
    ACTIONS(428), 2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
    ACTIONS(188), 4,
      anon_sym_EQ,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
  [4268] = 10,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(192), 1,
      anon_sym_STAR,
    ACTIONS(194), 1,
      anon_sym_SLASH,
    ACTIONS(198), 1,
      aux_sym_logical_expression_token1,
    ACTIONS(200), 1,
      aux_sym_logical_expression_token2,
    ACTIONS(446), 1,
      aux_sym_for_statement_token2,
    ACTIONS(190), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(196), 2,
      anon_sym_LT,
      anon_sym_GT,
    ACTIONS(428), 2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
    ACTIONS(188), 4,
      anon_sym_EQ,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
  [4305] = 10,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(192), 1,
      anon_sym_STAR,
    ACTIONS(194), 1,
      anon_sym_SLASH,
    ACTIONS(198), 1,
      aux_sym_logical_expression_token1,
    ACTIONS(200), 1,
      aux_sym_logical_expression_token2,
    ACTIONS(448), 1,
      anon_sym_RPAREN,
    ACTIONS(190), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(196), 2,
      anon_sym_LT,
      anon_sym_GT,
    ACTIONS(428), 2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
    ACTIONS(188), 4,
      anon_sym_EQ,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
  [4342] = 10,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(192), 1,
      anon_sym_STAR,
    ACTIONS(194), 1,
      anon_sym_SLASH,
    ACTIONS(198), 1,
      aux_sym_logical_expression_token1,
    ACTIONS(200), 1,
      aux_sym_logical_expression_token2,
    ACTIONS(450), 1,
      aux_sym_if_statement_token2,
    ACTIONS(190), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(196), 2,
      anon_sym_LT,
      anon_sym_GT,
    ACTIONS(428), 2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
    ACTIONS(188), 4,
      anon_sym_EQ,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
  [4379] = 10,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(192), 1,
      anon_sym_STAR,
    ACTIONS(194), 1,
      anon_sym_SLASH,
    ACTIONS(198), 1,
      aux_sym_logical_expression_token1,
    ACTIONS(200), 1,
      aux_sym_logical_expression_token2,
    ACTIONS(452), 1,
      aux_sym_while_statement_token2,
    ACTIONS(190), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(196), 2,
      anon_sym_LT,
      anon_sym_GT,
    ACTIONS(428), 2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
    ACTIONS(188), 4,
      anon_sym_EQ,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
  [4416] = 10,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(192), 1,
      anon_sym_STAR,
    ACTIONS(194), 1,
      anon_sym_SLASH,
    ACTIONS(198), 1,
      aux_sym_logical_expression_token1,
    ACTIONS(200), 1,
      aux_sym_logical_expression_token2,
    ACTIONS(454), 1,
      aux_sym_while_statement_token2,
    ACTIONS(190), 2,
      anon_sym_PLUS,
      anon_sym_DASH,
    ACTIONS(196), 2,
      anon_sym_LT,
      anon_sym_GT,
    ACTIONS(428), 2,
      aux_sym_logical_expression_token3,
      aux_sym_logical_expression_token4,
    ACTIONS(188), 4,
      anon_sym_EQ,
      anon_sym_LT_GT,
      anon_sym_LT_EQ,
      anon_sym_GT_EQ,
  [4453] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(456), 2,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(458), 12,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token2,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_while_statement_token1,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [4475] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(460), 2,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(462), 12,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token2,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_while_statement_token1,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [4497] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(464), 2,
      sym_identifier,
      anon_sym_AMP,
    ACTIONS(466), 12,
      aux_sym_procedure_declaration_token1,
      aux_sym_procedure_declaration_token2,
      aux_sym_procedure_declaration_token3,
      aux_sym_function_declaration_token1,
      aux_sym_function_declaration_token2,
      aux_sym_variable_declaration_token1,
      aux_sym_return_statement_token1,
      aux_sym_if_statement_token1,
      aux_sym_while_statement_token1,
      aux_sym_for_statement_token1,
      aux_sym_break_statement_token1,
      aux_sym_continue_statement_token1,
  [4519] = 6,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(70), 1,
      aux_sym_else_clause_token1,
    ACTIONS(468), 1,
      aux_sym_if_statement_token3,
    ACTIONS(470), 1,
      aux_sym_elseif_clause_token1,
    STATE(157), 1,
      sym_else_clause,
    STATE(125), 2,
      sym_elseif_clause,
      aux_sym_if_statement_repeat1,
  [4539] = 6,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(70), 1,
      aux_sym_else_clause_token1,
    ACTIONS(470), 1,
      aux_sym_elseif_clause_token1,
    ACTIONS(472), 1,
      aux_sym_if_statement_token3,
    STATE(154), 1,
      sym_else_clause,
    STATE(125), 2,
      sym_elseif_clause,
      aux_sym_if_statement_repeat1,
  [4559] = 5,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(474), 1,
      sym_identifier,
    ACTIONS(476), 1,
      anon_sym_RPAREN,
    STATE(131), 1,
      sym_parameter,
    ACTIONS(478), 2,
      aux_sym_parameter_token1,
      aux_sym_parameter_token2,
  [4576] = 5,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(480), 1,
      aux_sym_if_statement_token3,
    ACTIONS(482), 1,
      aux_sym_elseif_clause_token1,
    ACTIONS(485), 1,
      aux_sym_else_clause_token1,
    STATE(125), 2,
      sym_elseif_clause,
      aux_sym_if_statement_repeat1,
  [4593] = 4,
    ACTIONS(487), 1,
      sym_comment,
    ACTIONS(489), 1,
      anon_sym_DQUOTE,
    STATE(129), 1,
      aux_sym_string_literal_repeat1,
    ACTIONS(491), 2,
      aux_sym_string_literal_token1,
      anon_sym_DQUOTE_DQUOTE,
  [4607] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(474), 1,
      sym_identifier,
    STATE(146), 1,
      sym_parameter,
    ACTIONS(478), 2,
      aux_sym_parameter_token1,
      aux_sym_parameter_token2,
  [4621] = 4,
    ACTIONS(487), 1,
      sym_comment,
    ACTIONS(493), 1,
      anon_sym_DQUOTE,
    STATE(128), 1,
      aux_sym_string_literal_repeat1,
    ACTIONS(495), 2,
      aux_sym_string_literal_token1,
      anon_sym_DQUOTE_DQUOTE,
  [4635] = 4,
    ACTIONS(487), 1,
      sym_comment,
    ACTIONS(498), 1,
      anon_sym_DQUOTE,
    STATE(128), 1,
      aux_sym_string_literal_repeat1,
    ACTIONS(500), 2,
      aux_sym_string_literal_token1,
      anon_sym_DQUOTE_DQUOTE,
  [4649] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(502), 1,
      anon_sym_COMMA,
    ACTIONS(505), 1,
      anon_sym_RPAREN,
    STATE(130), 1,
      aux_sym_parameter_list_repeat1,
  [4662] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(507), 1,
      anon_sym_COMMA,
    ACTIONS(509), 1,
      anon_sym_RPAREN,
    STATE(134), 1,
      aux_sym_parameter_list_repeat1,
  [4675] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(513), 1,
      anon_sym_EQ,
    ACTIONS(511), 2,
      anon_sym_COMMA,
      anon_sym_RPAREN,
  [4686] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(424), 1,
      anon_sym_COMMA,
    ACTIONS(515), 1,
      anon_sym_RPAREN,
    STATE(135), 1,
      aux_sym_call_expression_repeat1,
  [4699] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(507), 1,
      anon_sym_COMMA,
    ACTIONS(517), 1,
      anon_sym_RPAREN,
    STATE(130), 1,
      aux_sym_parameter_list_repeat1,
  [4712] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(432), 1,
      anon_sym_RPAREN,
    ACTIONS(519), 1,
      anon_sym_COMMA,
    STATE(135), 1,
      aux_sym_call_expression_repeat1,
  [4725] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(424), 1,
      anon_sym_COMMA,
    ACTIONS(522), 1,
      anon_sym_RPAREN,
    STATE(135), 1,
      aux_sym_call_expression_repeat1,
  [4738] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(526), 1,
      anon_sym_EQ,
    ACTIONS(524), 2,
      anon_sym_COMMA,
      anon_sym_RPAREN,
  [4749] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(528), 1,
      anon_sym_LPAREN,
    STATE(8), 1,
      sym_parameter_list,
  [4759] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(530), 1,
      sym_identifier,
    ACTIONS(532), 1,
      aux_sym_for_each_statement_token1,
  [4769] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(528), 1,
      anon_sym_LPAREN,
    STATE(6), 1,
      sym_parameter_list,
  [4779] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(528), 1,
      anon_sym_LPAREN,
    STATE(7), 1,
      sym_parameter_list,
  [4789] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(528), 1,
      anon_sym_LPAREN,
    STATE(10), 1,
      sym_parameter_list,
  [4799] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(534), 2,
      aux_sym_procedure_declaration_token1,
      aux_sym_function_declaration_token1,
  [4807] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(536), 1,
      anon_sym_LPAREN,
    ACTIONS(538), 1,
      anon_sym_EQ,
  [4817] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(540), 1,
      aux_sym_procedure_declaration_token2,
    ACTIONS(542), 1,
      anon_sym_SEMI,
  [4827] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(505), 2,
      anon_sym_COMMA,
      anon_sym_RPAREN,
  [4835] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(544), 1,
      aux_sym_procedure_declaration_token1,
    ACTIONS(546), 1,
      aux_sym_function_declaration_token1,
  [4845] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(548), 1,
      sym_identifier,
  [4852] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(550), 1,
      sym_identifier,
  [4859] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(552), 1,
      aux_sym_function_declaration_token2,
  [4866] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(554), 1,
      ts_builtin_sym_end,
  [4873] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(556), 1,
      anon_sym_SEMI,
  [4880] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(558), 1,
      aux_sym_for_each_statement_token2,
  [4887] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(560), 1,
      aux_sym_if_statement_token3,
  [4894] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(468), 1,
      aux_sym_if_statement_token3,
  [4901] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(562), 1,
      sym_identifier,
  [4908] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(564), 1,
      aux_sym_if_statement_token3,
  [4915] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(566), 1,
      aux_sym_function_declaration_token2,
  [4922] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(568), 1,
      aux_sym_procedure_declaration_token3,
  [4929] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(472), 1,
      aux_sym_if_statement_token3,
  [4936] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(570), 1,
      aux_sym_procedure_declaration_token3,
  [4943] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(572), 1,
      anon_sym_EQ,
  [4950] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(574), 1,
      aux_sym_procedure_declaration_token3,
  [4957] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(576), 1,
      sym_identifier,
  [4964] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(578), 1,
      sym_identifier,
  [4971] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(580), 1,
      aux_sym_function_declaration_token2,
  [4978] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(582), 1,
      aux_sym_procedure_declaration_token3,
  [4985] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(584), 1,
      sym_identifier,
  [4992] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(586), 1,
      anon_sym_SEMI,
  [4999] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(588), 1,
      sym_identifier,
  [5006] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(590), 1,
      sym_identifier,
  [5013] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(592), 1,
      aux_sym_function_declaration_token2,
  [5020] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(594), 1,
      anon_sym_SEMI,
};

static const uint32_t ts_small_parse_table_map[] = {
  [SMALL_STATE(2)] = 0,
  [SMALL_STATE(3)] = 67,
  [SMALL_STATE(4)] = 139,
  [SMALL_STATE(5)] = 211,
  [SMALL_STATE(6)] = 272,
  [SMALL_STATE(7)] = 337,
  [SMALL_STATE(8)] = 402,
  [SMALL_STATE(9)] = 467,
  [SMALL_STATE(10)] = 528,
  [SMALL_STATE(11)] = 593,
  [SMALL_STATE(12)] = 655,
  [SMALL_STATE(13)] = 717,
  [SMALL_STATE(14)] = 779,
  [SMALL_STATE(15)] = 841,
  [SMALL_STATE(16)] = 901,
  [SMALL_STATE(17)] = 960,
  [SMALL_STATE(18)] = 1019,
  [SMALL_STATE(19)] = 1078,
  [SMALL_STATE(20)] = 1137,
  [SMALL_STATE(21)] = 1196,
  [SMALL_STATE(22)] = 1255,
  [SMALL_STATE(23)] = 1314,
  [SMALL_STATE(24)] = 1373,
  [SMALL_STATE(25)] = 1432,
  [SMALL_STATE(26)] = 1476,
  [SMALL_STATE(27)] = 1520,
  [SMALL_STATE(28)] = 1564,
  [SMALL_STATE(29)] = 1605,
  [SMALL_STATE(30)] = 1646,
  [SMALL_STATE(31)] = 1687,
  [SMALL_STATE(32)] = 1728,
  [SMALL_STATE(33)] = 1769,
  [SMALL_STATE(34)] = 1810,
  [SMALL_STATE(35)] = 1851,
  [SMALL_STATE(36)] = 1882,
  [SMALL_STATE(37)] = 1923,
  [SMALL_STATE(38)] = 1964,
  [SMALL_STATE(39)] = 2005,
  [SMALL_STATE(40)] = 2046,
  [SMALL_STATE(41)] = 2087,
  [SMALL_STATE(42)] = 2128,
  [SMALL_STATE(43)] = 2169,
  [SMALL_STATE(44)] = 2210,
  [SMALL_STATE(45)] = 2251,
  [SMALL_STATE(46)] = 2292,
  [SMALL_STATE(47)] = 2332,
  [SMALL_STATE(48)] = 2360,
  [SMALL_STATE(49)] = 2388,
  [SMALL_STATE(50)] = 2416,
  [SMALL_STATE(51)] = 2444,
  [SMALL_STATE(52)] = 2472,
  [SMALL_STATE(53)] = 2500,
  [SMALL_STATE(54)] = 2528,
  [SMALL_STATE(55)] = 2566,
  [SMALL_STATE(56)] = 2594,
  [SMALL_STATE(57)] = 2626,
  [SMALL_STATE(58)] = 2660,
  [SMALL_STATE(59)] = 2688,
  [SMALL_STATE(60)] = 2717,
  [SMALL_STATE(61)] = 2746,
  [SMALL_STATE(62)] = 2775,
  [SMALL_STATE(63)] = 2804,
  [SMALL_STATE(64)] = 2833,
  [SMALL_STATE(65)] = 2862,
  [SMALL_STATE(66)] = 2891,
  [SMALL_STATE(67)] = 2920,
  [SMALL_STATE(68)] = 2949,
  [SMALL_STATE(69)] = 2978,
  [SMALL_STATE(70)] = 3007,
  [SMALL_STATE(71)] = 3036,
  [SMALL_STATE(72)] = 3062,
  [SMALL_STATE(73)] = 3088,
  [SMALL_STATE(74)] = 3114,
  [SMALL_STATE(75)] = 3140,
  [SMALL_STATE(76)] = 3166,
  [SMALL_STATE(77)] = 3192,
  [SMALL_STATE(78)] = 3218,
  [SMALL_STATE(79)] = 3244,
  [SMALL_STATE(80)] = 3270,
  [SMALL_STATE(81)] = 3296,
  [SMALL_STATE(82)] = 3322,
  [SMALL_STATE(83)] = 3348,
  [SMALL_STATE(84)] = 3374,
  [SMALL_STATE(85)] = 3400,
  [SMALL_STATE(86)] = 3426,
  [SMALL_STATE(87)] = 3452,
  [SMALL_STATE(88)] = 3478,
  [SMALL_STATE(89)] = 3504,
  [SMALL_STATE(90)] = 3530,
  [SMALL_STATE(91)] = 3556,
  [SMALL_STATE(92)] = 3582,
  [SMALL_STATE(93)] = 3608,
  [SMALL_STATE(94)] = 3634,
  [SMALL_STATE(95)] = 3660,
  [SMALL_STATE(96)] = 3686,
  [SMALL_STATE(97)] = 3712,
  [SMALL_STATE(98)] = 3738,
  [SMALL_STATE(99)] = 3764,
  [SMALL_STATE(100)] = 3790,
  [SMALL_STATE(101)] = 3816,
  [SMALL_STATE(102)] = 3842,
  [SMALL_STATE(103)] = 3868,
  [SMALL_STATE(104)] = 3894,
  [SMALL_STATE(105)] = 3920,
  [SMALL_STATE(106)] = 3963,
  [SMALL_STATE(107)] = 4006,
  [SMALL_STATE(108)] = 4044,
  [SMALL_STATE(109)] = 4082,
  [SMALL_STATE(110)] = 4120,
  [SMALL_STATE(111)] = 4157,
  [SMALL_STATE(112)] = 4194,
  [SMALL_STATE(113)] = 4231,
  [SMALL_STATE(114)] = 4268,
  [SMALL_STATE(115)] = 4305,
  [SMALL_STATE(116)] = 4342,
  [SMALL_STATE(117)] = 4379,
  [SMALL_STATE(118)] = 4416,
  [SMALL_STATE(119)] = 4453,
  [SMALL_STATE(120)] = 4475,
  [SMALL_STATE(121)] = 4497,
  [SMALL_STATE(122)] = 4519,
  [SMALL_STATE(123)] = 4539,
  [SMALL_STATE(124)] = 4559,
  [SMALL_STATE(125)] = 4576,
  [SMALL_STATE(126)] = 4593,
  [SMALL_STATE(127)] = 4607,
  [SMALL_STATE(128)] = 4621,
  [SMALL_STATE(129)] = 4635,
  [SMALL_STATE(130)] = 4649,
  [SMALL_STATE(131)] = 4662,
  [SMALL_STATE(132)] = 4675,
  [SMALL_STATE(133)] = 4686,
  [SMALL_STATE(134)] = 4699,
  [SMALL_STATE(135)] = 4712,
  [SMALL_STATE(136)] = 4725,
  [SMALL_STATE(137)] = 4738,
  [SMALL_STATE(138)] = 4749,
  [SMALL_STATE(139)] = 4759,
  [SMALL_STATE(140)] = 4769,
  [SMALL_STATE(141)] = 4779,
  [SMALL_STATE(142)] = 4789,
  [SMALL_STATE(143)] = 4799,
  [SMALL_STATE(144)] = 4807,
  [SMALL_STATE(145)] = 4817,
  [SMALL_STATE(146)] = 4827,
  [SMALL_STATE(147)] = 4835,
  [SMALL_STATE(148)] = 4845,
  [SMALL_STATE(149)] = 4852,
  [SMALL_STATE(150)] = 4859,
  [SMALL_STATE(151)] = 4866,
  [SMALL_STATE(152)] = 4873,
  [SMALL_STATE(153)] = 4880,
  [SMALL_STATE(154)] = 4887,
  [SMALL_STATE(155)] = 4894,
  [SMALL_STATE(156)] = 4901,
  [SMALL_STATE(157)] = 4908,
  [SMALL_STATE(158)] = 4915,
  [SMALL_STATE(159)] = 4922,
  [SMALL_STATE(160)] = 4929,
  [SMALL_STATE(161)] = 4936,
  [SMALL_STATE(162)] = 4943,
  [SMALL_STATE(163)] = 4950,
  [SMALL_STATE(164)] = 4957,
  [SMALL_STATE(165)] = 4964,
  [SMALL_STATE(166)] = 4971,
  [SMALL_STATE(167)] = 4978,
  [SMALL_STATE(168)] = 4985,
  [SMALL_STATE(169)] = 4992,
  [SMALL_STATE(170)] = 4999,
  [SMALL_STATE(171)] = 5006,
  [SMALL_STATE(172)] = 5013,
  [SMALL_STATE(173)] = 5020,
};

static const TSParseActionEntry ts_parse_actions[] = {
  [0] = {.entry = {.count = 0, .reusable = false}},
  [1] = {.entry = {.count = 1, .reusable = false}}, RECOVER(),
  [3] = {.entry = {.count = 1, .reusable = true}}, SHIFT_EXTRA(),
  [5] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_source_file, 0),
  [7] = {.entry = {.count = 1, .reusable = true}}, SHIFT(144),
  [9] = {.entry = {.count = 1, .reusable = false}}, SHIFT(171),
  [11] = {.entry = {.count = 1, .reusable = false}}, SHIFT(149),
  [13] = {.entry = {.count = 1, .reusable = false}}, SHIFT(156),
  [15] = {.entry = {.count = 1, .reusable = false}}, SHIFT(27),
  [17] = {.entry = {.count = 1, .reusable = false}}, SHIFT(31),
  [19] = {.entry = {.count = 1, .reusable = false}}, SHIFT(44),
  [21] = {.entry = {.count = 1, .reusable = false}}, SHIFT(139),
  [23] = {.entry = {.count = 1, .reusable = false}}, SHIFT(152),
  [25] = {.entry = {.count = 1, .reusable = false}}, SHIFT(169),
  [27] = {.entry = {.count = 1, .reusable = true}}, SHIFT(148),
  [29] = {.entry = {.count = 1, .reusable = true}}, REDUCE(aux_sym_source_file_repeat1, 2),
  [31] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_source_file_repeat1, 2), SHIFT_REPEAT(144),
  [34] = {.entry = {.count = 2, .reusable = false}}, REDUCE(aux_sym_source_file_repeat1, 2), SHIFT_REPEAT(171),
  [37] = {.entry = {.count = 1, .reusable = false}}, REDUCE(aux_sym_source_file_repeat1, 2),
  [39] = {.entry = {.count = 2, .reusable = false}}, REDUCE(aux_sym_source_file_repeat1, 2), SHIFT_REPEAT(149),
  [42] = {.entry = {.count = 2, .reusable = false}}, REDUCE(aux_sym_source_file_repeat1, 2), SHIFT_REPEAT(156),
  [45] = {.entry = {.count = 2, .reusable = false}}, REDUCE(aux_sym_source_file_repeat1, 2), SHIFT_REPEAT(27),
  [48] = {.entry = {.count = 2, .reusable = false}}, REDUCE(aux_sym_source_file_repeat1, 2), SHIFT_REPEAT(31),
  [51] = {.entry = {.count = 2, .reusable = false}}, REDUCE(aux_sym_source_file_repeat1, 2), SHIFT_REPEAT(44),
  [54] = {.entry = {.count = 2, .reusable = false}}, REDUCE(aux_sym_source_file_repeat1, 2), SHIFT_REPEAT(139),
  [57] = {.entry = {.count = 2, .reusable = false}}, REDUCE(aux_sym_source_file_repeat1, 2), SHIFT_REPEAT(152),
  [60] = {.entry = {.count = 2, .reusable = false}}, REDUCE(aux_sym_source_file_repeat1, 2), SHIFT_REPEAT(169),
  [63] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_source_file_repeat1, 2), SHIFT_REPEAT(148),
  [66] = {.entry = {.count = 1, .reusable = false}}, SHIFT(60),
  [68] = {.entry = {.count = 1, .reusable = false}}, SHIFT(30),
  [70] = {.entry = {.count = 1, .reusable = false}}, SHIFT(20),
  [72] = {.entry = {.count = 1, .reusable = false}}, SHIFT(68),
  [74] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_elseif_clause, 3, .production_id = 7),
  [76] = {.entry = {.count = 1, .reusable = false}}, SHIFT(13),
  [78] = {.entry = {.count = 1, .reusable = false}}, SHIFT(93),
  [80] = {.entry = {.count = 1, .reusable = false}}, SHIFT(12),
  [82] = {.entry = {.count = 1, .reusable = false}}, SHIFT(92),
  [84] = {.entry = {.count = 1, .reusable = false}}, SHIFT(14),
  [86] = {.entry = {.count = 1, .reusable = false}}, SHIFT(85),
  [88] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_elseif_clause, 4, .production_id = 7),
  [90] = {.entry = {.count = 1, .reusable = false}}, SHIFT(11),
  [92] = {.entry = {.count = 1, .reusable = false}}, SHIFT(83),
  [94] = {.entry = {.count = 1, .reusable = false}}, SHIFT(104),
  [96] = {.entry = {.count = 1, .reusable = false}}, SHIFT(73),
  [98] = {.entry = {.count = 1, .reusable = false}}, SHIFT(74),
  [100] = {.entry = {.count = 1, .reusable = false}}, SHIFT(102),
  [102] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_procedure_body, 1),
  [104] = {.entry = {.count = 1, .reusable = false}}, SHIFT(69),
  [106] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_source_file, 1),
  [108] = {.entry = {.count = 1, .reusable = false}}, SHIFT(63),
  [110] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_else_clause, 2),
  [112] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_else_clause, 1),
  [114] = {.entry = {.count = 1, .reusable = false}}, SHIFT(59),
  [116] = {.entry = {.count = 1, .reusable = false}}, SHIFT(70),
  [118] = {.entry = {.count = 1, .reusable = false}}, SHIFT(64),
  [120] = {.entry = {.count = 1, .reusable = false}}, SHIFT(61),
  [122] = {.entry = {.count = 1, .reusable = true}}, SHIFT(35),
  [124] = {.entry = {.count = 1, .reusable = true}}, SHIFT(28),
  [126] = {.entry = {.count = 1, .reusable = true}}, SHIFT(87),
  [128] = {.entry = {.count = 1, .reusable = true}}, SHIFT(32),
  [130] = {.entry = {.count = 1, .reusable = false}}, SHIFT(32),
  [132] = {.entry = {.count = 1, .reusable = true}}, SHIFT(106),
  [134] = {.entry = {.count = 1, .reusable = true}}, SHIFT(126),
  [136] = {.entry = {.count = 1, .reusable = false}}, SHIFT(52),
  [138] = {.entry = {.count = 1, .reusable = true}}, SHIFT(50),
  [140] = {.entry = {.count = 1, .reusable = true}}, SHIFT(105),
  [142] = {.entry = {.count = 1, .reusable = true}}, SHIFT(101),
  [144] = {.entry = {.count = 1, .reusable = true}}, SHIFT(110),
  [146] = {.entry = {.count = 1, .reusable = true}}, SHIFT(115),
  [148] = {.entry = {.count = 1, .reusable = true}}, SHIFT(117),
  [150] = {.entry = {.count = 1, .reusable = true}}, SHIFT(112),
  [152] = {.entry = {.count = 1, .reusable = true}}, SHIFT(116),
  [154] = {.entry = {.count = 1, .reusable = true}}, SHIFT(47),
  [156] = {.entry = {.count = 1, .reusable = true}}, SHIFT(107),
  [158] = {.entry = {.count = 1, .reusable = true}}, SHIFT(57),
  [160] = {.entry = {.count = 1, .reusable = true}}, SHIFT(26),
  [162] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym__expression, 1),
  [164] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym__expression, 1),
  [166] = {.entry = {.count = 1, .reusable = true}}, SHIFT(56),
  [168] = {.entry = {.count = 1, .reusable = true}}, SHIFT(108),
  [170] = {.entry = {.count = 1, .reusable = true}}, SHIFT(55),
  [172] = {.entry = {.count = 1, .reusable = true}}, SHIFT(54),
  [174] = {.entry = {.count = 1, .reusable = true}}, SHIFT(46),
  [176] = {.entry = {.count = 1, .reusable = true}}, SHIFT(111),
  [178] = {.entry = {.count = 1, .reusable = true}}, SHIFT(113),
  [180] = {.entry = {.count = 1, .reusable = true}}, SHIFT(109),
  [182] = {.entry = {.count = 1, .reusable = true}}, SHIFT(118),
  [184] = {.entry = {.count = 1, .reusable = true}}, SHIFT(114),
  [186] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_logical_expression, 3, .production_id = 3),
  [188] = {.entry = {.count = 1, .reusable = true}}, SHIFT(34),
  [190] = {.entry = {.count = 1, .reusable = true}}, SHIFT(36),
  [192] = {.entry = {.count = 1, .reusable = true}}, SHIFT(38),
  [194] = {.entry = {.count = 1, .reusable = false}}, SHIFT(38),
  [196] = {.entry = {.count = 1, .reusable = false}}, SHIFT(34),
  [198] = {.entry = {.count = 1, .reusable = false}}, SHIFT(39),
  [200] = {.entry = {.count = 1, .reusable = true}}, SHIFT(39),
  [202] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_unary_expression, 2),
  [204] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_unary_expression, 2),
  [206] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_call_expression, 5, .production_id = 1),
  [208] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_call_expression, 5, .production_id = 1),
  [210] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_call_expression, 4, .production_id = 1),
  [212] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_call_expression, 4, .production_id = 1),
  [214] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_call_expression, 3, .production_id = 1),
  [216] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_call_expression, 3, .production_id = 1),
  [218] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_parenthesized_expression, 3),
  [220] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_parenthesized_expression, 3),
  [222] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_boolean_literal, 1),
  [224] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_boolean_literal, 1),
  [226] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_string_literal, 3),
  [228] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_string_literal, 3),
  [230] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_logical_expression, 3, .production_id = 3),
  [232] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_binary_expression, 3),
  [234] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_binary_expression, 3),
  [236] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_comparison_expression, 3, .production_id = 6),
  [238] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_comparison_expression, 3, .production_id = 6),
  [240] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_string_literal, 2),
  [242] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_string_literal, 2),
  [244] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_for_statement, 8, .production_id = 14),
  [246] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_for_statement, 8, .production_id = 14),
  [248] = {.entry = {.count = 1, .reusable = true}}, SHIFT(86),
  [250] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_if_statement, 5, .production_id = 8),
  [252] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_if_statement, 5, .production_id = 8),
  [254] = {.entry = {.count = 1, .reusable = true}}, SHIFT(80),
  [256] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_for_statement, 9, .production_id = 16),
  [258] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_for_statement, 9, .production_id = 16),
  [260] = {.entry = {.count = 1, .reusable = true}}, SHIFT(81),
  [262] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_if_statement, 5, .production_id = 7),
  [264] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_if_statement, 5, .production_id = 7),
  [266] = {.entry = {.count = 1, .reusable = true}}, SHIFT(82),
  [268] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_while_statement, 4, .production_id = 7),
  [270] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_while_statement, 4, .production_id = 7),
  [272] = {.entry = {.count = 1, .reusable = true}}, SHIFT(95),
  [274] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_while_statement, 5, .production_id = 9),
  [276] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_while_statement, 5, .production_id = 9),
  [278] = {.entry = {.count = 1, .reusable = true}}, SHIFT(77),
  [280] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_if_statement, 6, .production_id = 8),
  [282] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_if_statement, 6, .production_id = 8),
  [284] = {.entry = {.count = 1, .reusable = true}}, SHIFT(94),
  [286] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_if_statement, 6, .production_id = 7),
  [288] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_if_statement, 6, .production_id = 7),
  [290] = {.entry = {.count = 1, .reusable = true}}, SHIFT(96),
  [292] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_if_statement, 7, .production_id = 8),
  [294] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_if_statement, 7, .production_id = 8),
  [296] = {.entry = {.count = 1, .reusable = true}}, SHIFT(91),
  [298] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_if_statement, 4, .production_id = 7),
  [300] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_if_statement, 4, .production_id = 7),
  [302] = {.entry = {.count = 1, .reusable = true}}, SHIFT(98),
  [304] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_for_each_statement, 7, .production_id = 13),
  [306] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_for_each_statement, 7, .production_id = 13),
  [308] = {.entry = {.count = 1, .reusable = true}}, SHIFT(89),
  [310] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_for_each_statement, 8, .production_id = 15),
  [312] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_for_each_statement, 8, .production_id = 15),
  [314] = {.entry = {.count = 1, .reusable = true}}, SHIFT(84),
  [316] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_variable_declaration, 4, .production_id = 2),
  [318] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_variable_declaration, 4, .production_id = 2),
  [320] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_return_statement, 3),
  [322] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_return_statement, 3),
  [324] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_function_declaration, 6, .production_id = 10),
  [326] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_function_declaration, 6, .production_id = 10),
  [328] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_procedure_declaration, 6, .production_id = 10),
  [330] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_procedure_declaration, 6, .production_id = 10),
  [332] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_continue_statement, 2),
  [334] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_continue_statement, 2),
  [336] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_while_statement, 6, .production_id = 9),
  [338] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_while_statement, 6, .production_id = 9),
  [340] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_assignment_statement, 4, .production_id = 3),
  [342] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_assignment_statement, 4, .production_id = 3),
  [344] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_variable_declaration, 3, .production_id = 2),
  [346] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_variable_declaration, 3, .production_id = 2),
  [348] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_for_statement, 10, .production_id = 16),
  [350] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_for_statement, 10, .production_id = 16),
  [352] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_procedure_declaration, 4, .production_id = 5),
  [354] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_procedure_declaration, 4, .production_id = 5),
  [356] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_for_each_statement, 9, .production_id = 15),
  [358] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_for_each_statement, 9, .production_id = 15),
  [360] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_function_declaration, 4, .production_id = 5),
  [362] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_function_declaration, 4, .production_id = 5),
  [364] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_for_statement, 9, .production_id = 14),
  [366] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_for_statement, 9, .production_id = 14),
  [368] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_function_declaration, 6, .production_id = 5),
  [370] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_function_declaration, 6, .production_id = 5),
  [372] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_for_each_statement, 8, .production_id = 13),
  [374] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_for_each_statement, 8, .production_id = 13),
  [376] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_procedure_declaration, 6, .production_id = 5),
  [378] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_procedure_declaration, 6, .production_id = 5),
  [380] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_if_statement, 8, .production_id = 8),
  [382] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_if_statement, 8, .production_id = 8),
  [384] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_function_declaration, 5, .production_id = 10),
  [386] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_function_declaration, 5, .production_id = 10),
  [388] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_procedure_declaration, 5, .production_id = 10),
  [390] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_procedure_declaration, 5, .production_id = 10),
  [392] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_while_statement, 5, .production_id = 7),
  [394] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_while_statement, 5, .production_id = 7),
  [396] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_if_statement, 7, .production_id = 7),
  [398] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_if_statement, 7, .production_id = 7),
  [400] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_break_statement, 2),
  [402] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_break_statement, 2),
  [404] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_procedure_declaration, 7, .production_id = 10),
  [406] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_procedure_declaration, 7, .production_id = 10),
  [408] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_return_statement, 2),
  [410] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_return_statement, 2),
  [412] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_function_declaration, 5, .production_id = 5),
  [414] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_function_declaration, 5, .production_id = 5),
  [416] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_function_declaration, 7, .production_id = 10),
  [418] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_function_declaration, 7, .production_id = 10),
  [420] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_procedure_declaration, 5, .production_id = 5),
  [422] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_procedure_declaration, 5, .production_id = 5),
  [424] = {.entry = {.count = 1, .reusable = true}}, SHIFT(33),
  [426] = {.entry = {.count = 1, .reusable = true}}, SHIFT(49),
  [428] = {.entry = {.count = 1, .reusable = true}}, SHIFT(40),
  [430] = {.entry = {.count = 1, .reusable = true}}, SHIFT(76),
  [432] = {.entry = {.count = 1, .reusable = true}}, REDUCE(aux_sym_call_expression_repeat1, 2),
  [434] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_parameter, 3, .production_id = 11),
  [436] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_parameter, 4, .production_id = 12),
  [438] = {.entry = {.count = 1, .reusable = true}}, SHIFT(72),
  [440] = {.entry = {.count = 1, .reusable = true}}, SHIFT(21),
  [442] = {.entry = {.count = 1, .reusable = true}}, SHIFT(5),
  [444] = {.entry = {.count = 1, .reusable = true}}, SHIFT(78),
  [446] = {.entry = {.count = 1, .reusable = true}}, SHIFT(41),
  [448] = {.entry = {.count = 1, .reusable = true}}, SHIFT(51),
  [450] = {.entry = {.count = 1, .reusable = true}}, SHIFT(4),
  [452] = {.entry = {.count = 1, .reusable = true}}, SHIFT(16),
  [454] = {.entry = {.count = 1, .reusable = true}}, SHIFT(18),
  [456] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_parameter_list, 2),
  [458] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_parameter_list, 2),
  [460] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_parameter_list, 4),
  [462] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_parameter_list, 4),
  [464] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_parameter_list, 3),
  [466] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_parameter_list, 3),
  [468] = {.entry = {.count = 1, .reusable = true}}, SHIFT(65),
  [470] = {.entry = {.count = 1, .reusable = true}}, SHIFT(30),
  [472] = {.entry = {.count = 1, .reusable = true}}, SHIFT(62),
  [474] = {.entry = {.count = 1, .reusable = true}}, SHIFT(132),
  [476] = {.entry = {.count = 1, .reusable = true}}, SHIFT(119),
  [478] = {.entry = {.count = 1, .reusable = false}}, SHIFT(170),
  [480] = {.entry = {.count = 1, .reusable = true}}, REDUCE(aux_sym_if_statement_repeat1, 2),
  [482] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_if_statement_repeat1, 2), SHIFT_REPEAT(30),
  [485] = {.entry = {.count = 1, .reusable = false}}, REDUCE(aux_sym_if_statement_repeat1, 2),
  [487] = {.entry = {.count = 1, .reusable = false}}, SHIFT_EXTRA(),
  [489] = {.entry = {.count = 1, .reusable = false}}, SHIFT(58),
  [491] = {.entry = {.count = 1, .reusable = false}}, SHIFT(129),
  [493] = {.entry = {.count = 1, .reusable = false}}, REDUCE(aux_sym_string_literal_repeat1, 2),
  [495] = {.entry = {.count = 2, .reusable = false}}, REDUCE(aux_sym_string_literal_repeat1, 2), SHIFT_REPEAT(128),
  [498] = {.entry = {.count = 1, .reusable = false}}, SHIFT(53),
  [500] = {.entry = {.count = 1, .reusable = false}}, SHIFT(128),
  [502] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_parameter_list_repeat1, 2), SHIFT_REPEAT(127),
  [505] = {.entry = {.count = 1, .reusable = true}}, REDUCE(aux_sym_parameter_list_repeat1, 2),
  [507] = {.entry = {.count = 1, .reusable = true}}, SHIFT(127),
  [509] = {.entry = {.count = 1, .reusable = true}}, SHIFT(121),
  [511] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_parameter, 1, .production_id = 4),
  [513] = {.entry = {.count = 1, .reusable = true}}, SHIFT(37),
  [515] = {.entry = {.count = 1, .reusable = true}}, SHIFT(99),
  [517] = {.entry = {.count = 1, .reusable = true}}, SHIFT(120),
  [519] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_call_expression_repeat1, 2), SHIFT_REPEAT(33),
  [522] = {.entry = {.count = 1, .reusable = true}}, SHIFT(48),
  [524] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_parameter, 2, .production_id = 2),
  [526] = {.entry = {.count = 1, .reusable = true}}, SHIFT(43),
  [528] = {.entry = {.count = 1, .reusable = true}}, SHIFT(124),
  [530] = {.entry = {.count = 1, .reusable = true}}, SHIFT(162),
  [532] = {.entry = {.count = 1, .reusable = false}}, SHIFT(164),
  [534] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_annotation, 2),
  [536] = {.entry = {.count = 1, .reusable = true}}, SHIFT(25),
  [538] = {.entry = {.count = 1, .reusable = true}}, SHIFT(42),
  [540] = {.entry = {.count = 1, .reusable = true}}, SHIFT(173),
  [542] = {.entry = {.count = 1, .reusable = true}}, SHIFT(79),
  [544] = {.entry = {.count = 1, .reusable = true}}, SHIFT(168),
  [546] = {.entry = {.count = 1, .reusable = true}}, SHIFT(165),
  [548] = {.entry = {.count = 1, .reusable = true}}, SHIFT(143),
  [550] = {.entry = {.count = 1, .reusable = true}}, SHIFT(138),
  [552] = {.entry = {.count = 1, .reusable = true}}, SHIFT(103),
  [554] = {.entry = {.count = 1, .reusable = true}},  ACCEPT_INPUT(),
  [556] = {.entry = {.count = 1, .reusable = true}}, SHIFT(97),
  [558] = {.entry = {.count = 1, .reusable = true}}, SHIFT(29),
  [560] = {.entry = {.count = 1, .reusable = true}}, SHIFT(66),
  [562] = {.entry = {.count = 1, .reusable = true}}, SHIFT(145),
  [564] = {.entry = {.count = 1, .reusable = true}}, SHIFT(67),
  [566] = {.entry = {.count = 1, .reusable = true}}, SHIFT(88),
  [568] = {.entry = {.count = 1, .reusable = true}}, SHIFT(90),
  [570] = {.entry = {.count = 1, .reusable = true}}, SHIFT(100),
  [572] = {.entry = {.count = 1, .reusable = true}}, SHIFT(45),
  [574] = {.entry = {.count = 1, .reusable = true}}, SHIFT(74),
  [576] = {.entry = {.count = 1, .reusable = true}}, SHIFT(153),
  [578] = {.entry = {.count = 1, .reusable = true}}, SHIFT(141),
  [580] = {.entry = {.count = 1, .reusable = true}}, SHIFT(102),
  [582] = {.entry = {.count = 1, .reusable = true}}, SHIFT(104),
  [584] = {.entry = {.count = 1, .reusable = true}}, SHIFT(140),
  [586] = {.entry = {.count = 1, .reusable = true}}, SHIFT(75),
  [588] = {.entry = {.count = 1, .reusable = true}}, SHIFT(137),
  [590] = {.entry = {.count = 1, .reusable = true}}, SHIFT(142),
  [592] = {.entry = {.count = 1, .reusable = true}}, SHIFT(73),
  [594] = {.entry = {.count = 1, .reusable = true}}, SHIFT(71),
};

#ifdef __cplusplus
extern "C" {
#endif
#ifdef _WIN32
#define extern __declspec(dllexport)
#endif

extern const TSLanguage *tree_sitter_onec(void) {
  static const TSLanguage language = {
    .version = LANGUAGE_VERSION,
    .symbol_count = SYMBOL_COUNT,
    .alias_count = ALIAS_COUNT,
    .token_count = TOKEN_COUNT,
    .external_token_count = EXTERNAL_TOKEN_COUNT,
    .state_count = STATE_COUNT,
    .large_state_count = LARGE_STATE_COUNT,
    .production_id_count = PRODUCTION_ID_COUNT,
    .field_count = FIELD_COUNT,
    .max_alias_sequence_length = MAX_ALIAS_SEQUENCE_LENGTH,
    .parse_table = &ts_parse_table[0][0],
    .small_parse_table = ts_small_parse_table,
    .small_parse_table_map = ts_small_parse_table_map,
    .parse_actions = ts_parse_actions,
    .symbol_names = ts_symbol_names,
    .field_names = ts_field_names,
    .field_map_slices = ts_field_map_slices,
    .field_map_entries = ts_field_map_entries,
    .symbol_metadata = ts_symbol_metadata,
    .public_symbol_map = ts_symbol_map,
    .alias_map = ts_non_terminal_alias_map,
    .alias_sequences = &ts_alias_sequences[0][0],
    .lex_modes = ts_lex_modes,
    .lex_fn = ts_lex,
    .primary_state_ids = ts_primary_state_ids,
  };
  return &language;
}
#ifdef __cplusplus
}
#endif
