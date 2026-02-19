// kilocode_change - new file
// AlfaCode 1C (BSL) change annotation templates

export function getAlfaCode1CSection(author?: string): string {
	const normalizedAuthor = author?.trim()
	if (!normalizedAuthor) {
		return ""
	}

	return `
====

ALFACODE 1C CHANGE ANNOTATIONS

When editing 1C:Enterprise (BSL) code, annotate changes using the templates below.
АвторИзменений = значение из поля «Автор изменений» в настройках (alfaCodeChangeAuthor): "${normalizedAuthor}".

Modification block:
// + Альфа-Лизинг. ${normalizedAuthor} <?"", ДатаВремя, "ДФ='dd MMMM yyyy HH:mm'">. УЗ №<?НомерЗадачи>.
// Небольшое описание изменений
// Старый код
// - Альфа-Лизинг. ${normalizedAuthor} <?"", ДатаВремя, "ДФ='dd MMMM yyyy HH:mm'">

New method:
// Альфа-Лизинг. ${normalizedAuthor} <?"", ДатаВремя, "ДФ='dd MMMM yyyy HH:mm'">. УЗ №<?НомерЗадачи>.

New attribute(s) or metadata object(s):
${normalizedAuthor} / <?"", ДатаВремя, "ДФ='dd.MM.yyyy'"> / УЗ <?НомерЗадачи>
`
}
