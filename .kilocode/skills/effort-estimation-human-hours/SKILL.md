---
name: effort-estimation-human-hours
description: Оценка трудозатрат разработки (человеко‑часы) по solution + git‑прокси, с калибровкой по истории
---

# Skill: Effort estimation (human-hours) from solution text + git proxies

## Purpose

Воспроизводимо оценивать трудозатраты разработки в **человеко‑часах** по описанию решения задачи (solution) с обязательным использованием:

1. признаков из текста «описание решения»;
2. прокси‑признаков из VCS‑изменений (коммиты/диффы/статистика).

Методика интерпретируемая (лог‑линейная модель + эвристики), с **асимметричным интервалом неопределённости** в терминах:

- `Optimistic` (нижняя граница / best-case, калибруемая квантиль)
- `Pessimistic` (верхняя граница / upper bound, калибруемая квантиль с контролем вероятности превышения)

Опционально выводится `Expected` (точечная оценка / most likely).

## Triggers

Используй этот skill, когда:

- нужно оценить трудозатраты «в часах» по описанию решения (до начала работ);
- нужно сравнить прогноз с фактом по уже выполненной задаче (ретроспективно);
- требуется дать **интервал** (optimistic/pessimistic) с явной семантикой покрытия.

## Context

Перед применением:

- структура текста решения: SoT из [`task-solution/SKILL.md`](../task-solution/SKILL.md:1) (или эквивалентный шаблон решения в протоколе);
- правила качества: [`quality-gates.md`](../../rules/quality-gates.md:1) (для учёта обязательных тестов/регресса/инфры в оценке);
- если есть протокол: читать `brief.md`/`plan.md` для понимания scope.

## Scope / Assumptions

- Калибровка коэффициентов выполнена на исторических задачах 1С‑репозитория (файлы типов `.bsl`, `.mdo`, `.form`, `.dcs`).
- Для других стеков коэффициенты **нужно перекалибровать** (см. раздел «Calibration»).
- Целевая переменная «факт» = поле `actual` из истории, трактуется как **часы**.

Источники калибровки (local policy):

- текущие коэффициенты по умолчанию зафиксированы ниже прямо в этом skill;
- если вы пересчитываете модель, сохраняйте calibration report и JSON коэффициентов в стабильный bundle вида `.kilocode/evidence/YYYY-MM-DD-effort-estimation/`.

> В текущем репозитории исторический calibration bundle не приложен.
> Агент MUST NOT утверждать, что старые `.protocols/...` или `temp/...` артефакты существуют, если они явно не переданы в рамках текущей задачи.

---

## Inputs (what you must have)

### A) Solution text (required)

Текст описания решения (что менять, где менять, сценарии, DoD).

### B) Git proxies (required)

Детерминированно вычислимые прокси из изменений (любой формат, главное — получить эти числа):

- `total_commits`
- `total_files_changed`
- `total_insertions`
- `total_deletions`
- список изменённых файлов (для подсчёта типов)

Если это оценка «до начала разработки» и диффа ещё нет — обязателен **планируемый diffstat**: ожидаемое число файлов/строк/типов файлов (см. «Mandatory questions»).

---

## Output format (strict)

1. **Optimistic / Expected / Pessimistic**: минимум 2 числа в часах (`Optimistic`, `Pessimistic`), опционально `Expected`.
2. **Semantics**: явное указание, какие coverage-цели используются для `Optimistic` и `Pessimistic`.
3. **Factor breakdown**: вклад факторов (scale/type/risk/uncertainty/tests/infra/noise)
4. **Questions**: 2–6 уточняющих вопросов (только если входных данных недостаточно)

Шаблон ответа:

```text
Оценка (человеко‑часы):
- Optimistic = <hours> ч
- Expected   = <hours> ч   (optional)
- Pessimistic= <hours> ч

Семантика интервала (квантили остатка):
- Optimistic: P(actual >= Optimistic) >= <target_coverage_optimistic>
- Pessimistic: P(actual <= Pessimistic) >= <target_coverage_pessimistic>

Вклад факторов (мультипликативно к базе):
- Scale (git): x...
- Solution size (text): x...
- Work type flags: x...
- Risk/uncertainty: x...
- Tests/infra: x...
- Noise/refactor: x...

Комментарий: <1–3 предложения про ключевой драйвер>
```

### Default coverage targets (calibratable)

По умолчанию (можно менять при перекалибровке, см. раздел «Calibration»):

- `target_coverage_optimistic = 0.80` (т.е. optimistic ≈ P20 распределения факта относительно `Expected`)
- `target_coverage_pessimistic = 0.90` (верхняя граница с контролируемой вероятностью превышения ~10%)

---

## Algorithm (deterministic)

### Step 0: Define “fact hours” (target)

**Факт** = `actual` (часы).

Если у вас нет поля `actual` (в новых данных) — фиксируйте факт отдельно и обеспечьте сопоставимость единиц (часы).

### Step 1: Extract text features from solution

#### 1.1. Prepare `masked_solution`

Чтобы избежать утечки (leakage) из явных оценок в тексте:

- Найди в тексте упоминания времени (`час`, `hours`, `h`, дробные значения вроде `0,5`) и **замени все числовые значения времени на маркер `<TIME>`**, сохраняя остальной текст.

#### 1.2. Compute deterministic text features

- `len_chars` = число символов в `masked_solution`
- `len_lines` = число строк
- `bullet_count` = число строк, начинающихся с маркера списка/нумерации (`1.`/`1)`/`-`/`*`/`•`)

#### 1.3. Work type / intent flags (from text)

Вычисли бинарные флаги (0/1) по наличию ключевых слов (регистр игнорировать):

- `kw_bugfix_flag`: `исправ`, `ошибк`, `bug`, `fix`
- `kw_integration_flag`: `интеграц`, `api`, `http`, `rest`, `rabbit`, `mq`, `camunda`
- `kw_migration_flag`: `миграц`, `schema`, `ddl`, `перенести данные`, `обмен`
- `kw_tests_flag`: `тест`, `coverage`, `xunit`, `vanessa`
- `kw_docs_flag`: `док`, `описание`, `инструкц`, `readme`, `swagger`
- `kw_infra_flag`: `ci`, `pipeline`, `docker`, `k8s`, `helm`, `devcontainer`
- `kw_refactor_flag`: `рефактор`, `переимен`, `форматир`, `cleanup`
- `kw_research_analysis_flag`: `анализ`, `исслед`, `разобраться`, `спайк`, `PoC`

Также вычисли `explicit_hours_in_text` (0/1) как наличие **любого** time‑pattern (даже если числа замаскированы) — это не “часы”, а сигнал того, что автор делал разбиение.

### Step 2: Extract git proxy features

#### 2.1. Basic scale

- `total_changed_lines = total_insertions + total_deletions`

#### 2.2. Filetype counts

Посчитай по списку изменённых файлов:

- `bsl_count`, `mdo_count`, `form_count`, `dcs_count`, `other_count`

#### 2.3. Detect refactor/formatting noise

Вычисли (все компоненты детерминированы):

1. `share_xml_like = (mdo_count + form_count + dcs_count) / max(total_files_changed, 1)`
2. `ins_del_balance = 1 - |total_insertions - total_deletions| / max(total_changed_lines, 1)` (в диапазоне ~[0..1])
3. `semantic_absence = 1`, если **в тексте** нет ни одного из `kw_*_flag` (иначе `0`)

Далее:

`noise_score = clip(0.55*share_xml_like + 0.25*ins_del_balance + 0.20*semantic_absence, 0, 1)`

#### 2.4. Detect release-like commits

`release_like = 1`, если хотя бы один commit message содержит маркеры релиза (`релиз`, `release`, `версия хранилища`) **или** если изменение преимущественно xml‑like и сбалансировано по insertions/deletions.

> Рекомендация: если `release_like=1` или `noise_score` высокий, то оценка `Expected` часто хуже интерпретируется. В этом случае делай акцент на интервале и на факторе «шум», и запрашивай раздельный PR (функционал отдельно от форматирования/релиза).

---

## Complexity factors (how to explain them)

Ниже факторы нужны для **объяснения результата**. В вычислении они отражаются через фичи.

1. **Масштаб изменения (Scale):**
    - `total_changed_lines`, `total_files_changed`, `total_commits`
2. **Тип работ (Work type):**
    - `kw_*_flag` из текста
3. **Риск:**
    - прокси: `kw_integration_flag`, `kw_migration_flag`, высокая доля `other_count`
4. **Неопределённость / исследование:**
    - `kw_research_analysis_flag`, низкий `bullet_count` при большом `len_chars`
5. **Тесты / инфраструктура:**
    - `kw_tests_flag`, `kw_infra_flag`
6. **Шум (рефакторинг/форматирование/релизы):**
    - `noise_score`, `release_like` и доля xml‑like файлов

---

## Estimation formula (calibrated coefficients)

### Transform

Используется лог‑шкала:

- `z(x) = ln(1 + x)`
- `hours(z) = exp(z) - 1`

### Features used in the calibrated model

Считаются значения:

- `z(total_changed_lines)`
- `z(total_files_changed)`
- `z(total_commits)`
- `z(len_chars)`
- `z(len_lines)`
- `bullet_count`
- флаги `kw_*_flag`
- `explicit_hours_in_text`, `release_like`, `noise_score`

### Point estimate

Сначала вычисли:

`y = intercept + Σ(coef_i * feature_i)`

Затем:

`E = exp(y) - 1`

Коэффициенты (текущий локальный default profile):

| Feature                   |      Coef |
| ------------------------- | --------: |
| intercept                 |  0.151080 |
| z(total_changed_lines)    |  0.085387 |
| z(total_files_changed)    |  0.012061 |
| z(total_commits)          |  0.660779 |
| z(len_chars)              |  0.075167 |
| z(len_lines)              |  0.290162 |
| bullet_count              |  0.023315 |
| kw_bugfix_flag            | -0.165470 |
| kw_integration_flag       |  0.120501 |
| kw_migration_flag         | -0.211244 |
| kw_tests_flag             | -0.189979 |
| kw_docs_flag              |  0.414400 |
| kw_infra_flag             | -0.162179 |
| kw_refactor_flag          | -0.010778 |
| kw_research_analysis_flag |  0.274085 |
| explicit_hours_in_text    |  0.039596 |
| release_like              |  0.613095 |
| noise_score               | -0.099259 |

### Interpretable breakdown (multipliers)

Для объяснения удобно перевести вклад каждой группы признаков в множитель:

- вклад в лог‑шкале: `Δ = coef * value`
- множитель: `m = exp(Δ)`

Группируй по:

- Scale(git): `z(total_changed_lines)`, `z(total_files_changed)`, `z(total_commits)`
- Solution size(text): `z(len_chars)`, `z(len_lines)`, `bullet_count`
- Work type: `kw_*_flag`, `explicit_hours_in_text`
- Noise: `release_like`, `noise_score`

---

## Uncertainty: Optimistic / Pessimistic (asymmetric, calibrated)

### Why asymmetric

Распределение ошибок по часам обычно **асимметрично** (underestimation “дороже”, хвост справа тяжелее). Поэтому вместо симметричных интервалов вокруг `E` используется калибровка по квантилям остатка на лог‑шкале.

### Residual definition (log1p-scale)

Определи:

- `pred_log = y` (см. формулу выше)
- `actual_log = log1p(actual_hours)`
- **остаток**: `r = actual_log - pred_log`

Эквивалентно: `r = ln((1+actual)/(1+E))`.

### Quantile mapping to optimistic/pessimistic

Пусть:

- `q_low = quantile(r, 1 - target_coverage_optimistic)`
- `q_high = quantile(r, target_coverage_pessimistic)`

Тогда интервальные оценки:

- `Optimistic = exp(pred_log + q_low) - 1`
- `Pessimistic = exp(pred_log + q_high) - 1`

`Expected` по умолчанию: `Expected = E = exp(pred_log) - 1`.

Источник значений `q_low/q_high` и coverage-таргетов: локальный calibration bundle, если он передан вместе с задачей; иначе агент MUST явно отметить, что interval-параметры не подтверждены отдельным bundle и используется только встроенный default/fallback.

### Legacy (deprecated): symmetric P50/P80 multipliers

Если нужно для обратной совместимости, можно использовать прежние симметричные мультипликаторы из исходной калибровки, но **они не дают upper bound с контролируемой вероятностью превышения**.

---

## Mandatory questions (ask only if missing inputs)

Задай 2–6 вопросов **только если** нет достаточных git‑прокси/структуры решения.

1. Сколько файлов примерно будет изменено и каких типов (например: `.bsl`, `.mdo`, `.form`, `.dcs`)?
2. Оценка масштаба: ожидаемое число добавленных/удалённых строк (хотя бы порядок: ~10 / ~100 / ~1000+)?
3. Сколько коммитов ожидается (1 крупный / 3–5 / 10+)?
4. Есть ли интеграции/внешние системы/обмены/миграции данных?
5. Нужны ли новые/изменённые тесты или изменения инфраструктуры (CI/скрипты/деплой)?
6. Будет ли PR содержать рефакторинг/форматирование помимо функциональной правки (если да — отдельно оценить/разделить PR)?

---

## Calibration (how to re-fit on new history)

### Data cleaning (required)

При калибровке на истории:

1. Оставлять задачи только с конечным `actual > 0`.
2. Вычислять `task_date = max(commit.date)` и удалять задачи без даты.
3. Удалять точные дубликаты задач (как минимум по `(num, task_date, actual)`).
4. Явно фиксировать предположение о единицах `actual` (часы) и признаки смешения единиц.

### Leakage prevention

Если в `solution` встречаются явные оценки времени, **нельзя** обучать модель на этих числах:

- маскировать числовые значения времени маркером `<TIME>`;
- оставлять только бинарный флаг `explicit_hours_in_text`.

### Validation (anti-leak)

Разбиение должно быть по времени:

- train: первые 80% задач по `task_date`
- holdout: последние 20%

Метрики на holdout (минимум): MAE, MdAE, MAPE, MdAPE + разрез small/medium/large.

### Interval calibration (required for optimistic/pessimistic)

На holdout дополнительно посчитай остатки `r = log1p(actual) - pred_log` и выбери квантили:

- `target_coverage_optimistic` (например 0.80) → `q_low = quantile(r, 0.20)`
- `target_coverage_pessimistic` (например 0.90) → `q_high = quantile(r, 0.90)`

Сохрани параметры интервала в стабильный calibration bundle, например `.kilocode/evidence/YYYY-MM-DD-effort-estimation/coefficients.json` (пример структуры):

```json
{
	"target_coverage_optimistic": 0.8,
	"target_coverage_pessimistic": 0.9,
	"residual_quantiles_log1p": {
		"q_low": -0.123,
		"q_high": 0.456
	}
}
```

> Примечание: числа `q_low/q_high` — пример формата. Реальные значения должны быть пересчитаны на holdout.

### Quality verification (interval metrics)

На holdout посчитай и зафиксируй результаты в calibration report (например, `.kilocode/evidence/YYYY-MM-DD-effort-estimation/calibration-report.md`):

- `coverage_pessimistic = mean(actual <= Pessimistic)` (должно быть ≥ `target_coverage_pessimistic`)
- `coverage_optimistic = mean(actual >= Optimistic)` (должно быть ≥ `target_coverage_optimistic`)
- `underestimation_rate_expected = mean(actual > Expected)`
- `mean_interval_width_hours = mean(Pessimistic - Optimistic)`
- `median_interval_width_hours = median(Pessimistic - Optimistic)`
- (опционально) `mean_interval_width_ratio = mean((1+Pessimistic)/(1+Optimistic))`

Если в истории есть ручные оценки `opt/pess` в переданном датасете, добавь сравнение:

- `coverage_pessimistic_manual` vs `coverage_pessimistic_model`
- частота превышения ручного pessimistic vs модельного
- средняя ширина интервала manual vs model

---

## Examples (from real history)

Числа фичей ниже уже приведены в форме `z(x)=ln(1+x)` для удобства расчёта.

### Example 1 (large / release-like)

Источник: historical calibration example; raw artifact is not bundled in the current repo.

- `num`: `000015229`
- `actual`: 489.100 ч
- Фичи:
    - `z(total_changed_lines)=10.1715`
    - `z(total_files_changed)=3.1781`
    - `z(total_commits)=1.0986`
    - `z(len_chars)=6.0845`
    - `z(len_lines)=4.1431`
    - `bullet_count=0`
    - `release_like=1`
    - `noise_score=0.6418`
    - остальные флаги = 0

Расчёт (лог‑шкала, укрупнённо):

- `y ≈ 0.1511
+0.085387*10.1715
+0.012061*3.1781
+0.660779*1.0986
+0.075167*6.0845
+0.290162*4.1431
+0.613095*1
-0.099259*0.6418`

- `E = exp(y) - 1 ≈ 53.206 ч` (как в отчёте)

Интервал Optimistic/Pessimistic:

- `Expected = E ≈ 53.206 ч`
- `Optimistic = exp(y + q_low) - 1`
- `Pessimistic = exp(y + q_high) - 1`

где `q_low/q_high` берутся из локального calibration bundle, если он передан для текущего пересчёта; иначе агент должен пометить интервал как опирающийся на встроенные/default параметры.

> Если квантили ещё не добавлены в `coefficients.json`, см. fallback «Legacy P50/P80» ниже.

Сравнение: факт 489.1 ч → сильное недоценивание (типичный сигнал: задача агрегирует много работ / релиз‑шум).

### Example 2 (tiny / high-noise)

Источник: historical calibration example; raw artifact is not bundled in the current repo.

- `num`: `000015366`
- `actual`: 0.300 ч
- Фичи:
    - `z(total_changed_lines)=2.0794`
    - `z(total_files_changed)=0.6931`
    - `z(total_commits)=0.6931`
    - `z(len_chars)=5.6384`
    - `z(len_lines)=0.6931`
    - `release_like=1`
    - `noise_score=1.0`
    - остальные флаги = 0

Результат:

- `E ≈ 5.916 ч` (как в отчёте)

Интервал Optimistic/Pessimistic:

- `Expected = E ≈ 5.916 ч`
- `Optimistic = exp(y + q_low) - 1`
- `Pessimistic = exp(y + q_high) - 1`

где `q_low/q_high` берутся из локального calibration bundle, если он передан для текущего пересчёта; иначе агент должен пометить интервал как опирающийся на встроенные/default параметры.

Сравнение: факт 0.3 ч → переоценка; типичный кейс, когда diffstat/релиз‑метки выглядят «тяжелее», чем реальная ручная работа.

---

## Legacy (fallback): symmetric P50/P80

Если калиброванные `q_low/q_high` недоступны (например, до пересчёта коэффициентов), допускается временно выводить симметричные интервалы вокруг `E`:

- `P50 multiplier = 2.423` → интервал `[E/2.423, E*2.423]`
- `P80 multiplier = 4.235` → интервал `[E/4.235, E*4.235]`

Источник: historical calibration example; raw artifact is not bundled in the current repo.

Ограничение: это **не** upper bound с контролируемой вероятностью превышения.
