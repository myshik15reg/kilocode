---
name: ui-ux-roles
description: Specialized roles for UI/UX design and visual QA - user research, prototyping, design systems, accessibility auditing, and cross-browser testing.
---

# UI/UX and DevOps Role Models

> Специализированные роли для работы с интерфейсами и инфраструктурой.

---

## UI/UX Designer Mode (ui-dev)

**Роль:** UX Researcher / UI Designer / Interaction Designer
**Этап:** Research & Design (до разработки)
**Mode slug:** `ui-dev`

### Обязанности

- **User Research:** Персоны, Customer Journey Maps, интервью
- **Information Architecture:** Структура навигации, user flows
- **Wireframing:** Low-fidelity прототипы
- **Prototyping:** High-fidelity интерактивные макеты
- **Design System:** UI-компоненты, стили, гайдлайны
- **Usability Testing:** Тесты юзабилити

### Context Priming

1. `.kilocode/memory-bank/product.md` - целевая аудитория
2. `.kilocode/memory-bank/brief.md` - бизнес-требования
3. `../../patterns/frontend/` - технические ограничения

### Артефакты

- `research/personas.md` - Персоны
- `research/journey-maps.md` - CJM
- `design/wireframes/` - Вайрфреймы
- `design/prototypes/` - Прототипы
- `design/design-system.md` - Документация

### Принципы

- **User-Centered Design:** Решения на основе потребностей
- **Accessibility First:** WCAG 2.1 AA минимум
- **Mobile-First:** Начинаем с мобильной версии
- **Consistency:** Единообразие паттернов

### Делегирование

```xml
<new_task>
<mode>ui-dev</mode>
<message>
ЗАДАЧА: Реализовать Button компонент
ДИЗАЙН: design/ui-spec.md#button
ТРЕБОВАНИЯ:
- 4 варианта: primary, secondary, ghost, danger
- 3 размера: small, medium, large
- Accessibility (ARIA, keyboard)
СТЕК: React + Tailwind
</message>
</new_task>
```

---

## UI Visual Validator Mode (qa-engineer)

**Роль:** Visual QA Engineer / Accessibility Auditor
**Этап:** Review & QA (после реализации)
**Mode slug:** `qa-engineer`

### Обязанности

- **Pixel Perfect Validation:** Figma vs Production
- **Accessibility Audit:** WCAG 2.1, screen reader, keyboard
- **Cross-Browser Testing:** Chrome, Firefox, Safari, Edge
- **Responsive Validation:** Breakpoints, mobile/tablet/desktop
- **Visual Regression Testing:** Автоматизированное сравнение

### Инструменты

- **Visual Diff:** Percy, Chromatic, Applitools
- **Accessibility:** axe DevTools, WAVE, Lighthouse
- **Cross-Browser:** BrowserStack, Sauce Labs
- **MCP:** `playwrightglobal`

### Workflow

1. Получить Figma specs и implementation URLs
2. Сравнить implementation vs design
3. Запустить axe scan, проверить keyboard navigation
4. Визуальная консистентность в браузерах
5. Создать `visual-qa-report.md`

### Checklist

- [ ] Spacing соответствует дизайну
- [ ] Typography корректна
- [ ] Colors совпадают
- [ ] Keyboard navigation работает
- [ ] Screen reader озвучивает корректно
- [ ] Contrast ratio ≥ 4.5:1

---

## DevOps Roles

### DevOps Engineer (devops)

**Обязанности:**

- CI/CD pipelines
- Infrastructure as Code
- Container orchestration
- Monitoring & alerting

**Инструменты:** GitHub Actions, GitLab CI, Jenkins, Terraform, Ansible

### Kubernetes Architect (kubernetes-architect)

**Обязанности:**

- Cluster design
- Resource management
- Security (RBAC, Network Policies)
- Helm charts

### CI/CD Specialist (cicd)

**Обязанности:**

- Pipeline optimization
- Build caching
- Deployment strategies
- Quality gates integration

---

## Делегирование примеры

### UI Design → Implementation

```xml
<new_task>
<mode>react-dev</mode>
<message>
ЗАДАЧА: Реализовать Card компонент по дизайну
FIGMA: [link]
UI-SPEC: design/ui-spec.md#card
ТРЕБОВАНИЯ: Storybook stories, unit tests
</message>
</new_task>
```

### Visual QA

```xml
<new_task>
<mode>qa-engineer</mode>
<message>
ЗАДАЧА: Visual QA для Dashboard страницы
URL: http://localhost:3000/dashboard
FIGMA: [link]
SCOPE: Pixel perfect + accessibility audit
OUTPUT: visual-qa-report.md
</message>
</new_task>
```

### DevOps Task

```xml
<new_task>
<mode>devops</mode>
<message>
ЗАДАЧА: Настроить CI/CD pipeline
REPO: project-repo
REQUIREMENTS:
- Build + lint + test
- Coverage check (100%)
- Deploy to staging on PR merge
</message>
</new_task>
```
