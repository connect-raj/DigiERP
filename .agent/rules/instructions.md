---
trigger: always_on
---

# GitHub Copilot Instructions

## General Principles

* Generate production-ready code only.
* Follow existing project architecture and coding conventions.
* Prefer readability, maintainability, and simplicity over clever implementations.
* Follow SOLID, DRY, and KISS principles.
* Keep functions small and focused on a single responsibility.
* Avoid code duplication.
* Never introduce breaking changes unless explicitly requested.
* Never modify unrelated files.

---

# TypeScript

* Use strict TypeScript.
* Never use `any`.
* Never use `@ts-ignore`.
* Avoid unnecessary type assertions.
* Explicitly define return types for all exported functions.
* Explicitly type function parameters.
* Infer types from Zod schemas whenever possible.
* Prefer `interface` for object contracts.
* Prefer `type` for unions and utility types.
* Use `readonly` where applicable.

---

# Error Handling

* Never use `try/catch` inside route handlers unless absolutely necessary.
* Wrap every async handler using the global `asyncHandler`.
* Throw domain-specific errors extending the shared `AppError`.
* Let the centralized error middleware handle unexpected exceptions.
* Never expose stack traces or internal implementation details.
* Return consistent API responses.

Example:

```ts
return successResponse(data);

throw new NotFoundError("User not found");
```

---

# Validation

* Validate every external input using Zod.
* Validate:

  * request body
  * params
  * query/search params
  * cookies
  * headers
  * environment variables
* Never trust client input.
* Infer TypeScript types from Zod schemas using `z.infer`.

---

# Logging

* Use the project's centralized logger.
* Prefer Winston or Pino for application logs.
* Use Morgan for HTTP request logging if configured.
* Log:

  * application startup
  * request failures
  * authentication failures
  * database errors
  * external API failures
  * background jobs
  * unexpected exceptions
* Never log passwords, secrets, JWTs, API keys, or sensitive user information.
* Use structured logs instead of `console.log`.

---

# Async Code

* Wrap all asynchronous route handlers using the shared `asyncHandler`.
* Do not duplicate error handling.
* Allow unexpected exceptions to propagate to the global error middleware.

---

# API Development

* Keep route handlers thin.
* Business logic belongs in Services.
* Database access belongs in Repositories.
* Controllers should only:

  * validate input
  * authorize
  * call services
  * return responses
* Never access the database directly from route handlers.

---

# Architecture

Follow this flow whenever applicable:

```
Route
    ↓
Controller
    ↓
Service
    ↓
Repository
    ↓
Database
```

Business logic must never exist inside React components or route handlers.

---

# Next.js

* Use the App Router.
* Prefer Server Components.
* Use Client Components only when browser APIs, local state, or event handlers are required.
* Minimize the use of `"use client"`.
* Prefer Server Actions over API routes where appropriate.
* Use `loading.tsx`, `error.tsx`, and `not-found.tsx` where applicable.
* Use the Metadata API.
* Use `next/image` for images.
* Use `next/font` for fonts.
* Use Suspense where appropriate.
* Keep layouts reusable.
* Avoid unnecessary middleware logic.

---

# React

* Keep components focused on a single responsibility.
* Prefer composition over large monolithic components.
* Extract reusable logic into custom hooks.
* Avoid deeply nested JSX.
* Prefer early returns.
* Memoize only when it provides measurable value.

---

# Forms

* Use React Hook Form.
* Validate using Zod Resolver.
* Never manually validate form data.

---

# Data Fetching

Prefer:

1. Server Components
2. Server Actions
3. API Routes
4. Client-side fetching only when necessary

Centralize API requests.

---

# State Management

Prefer:

* Server State
* URL State
* Local State

Only introduce global state when required.

Use TanStack Query or SWR for remote data when appropriate.

---

# Security

* Validate every input.
* Sanitize user input when necessary.
* Prevent XSS, CSRF, SSRF, SQL Injection, and command injection.
* Never expose secrets to the client.
* Store sensitive configuration on the server only.
* Validate uploaded files before processing.

---

# Environment Variables

* Never access `process.env` directly throughout the application.
* Read environment variables through the centralized configuration module.
* Validate all environment variables using Zod during application startup.

---

# Performance

* Avoid unnecessary re-renders.
* Avoid unnecessary `useEffect`.
* Avoid premature optimization.
* Lazy load expensive components.
* Use dynamic imports when appropriate.
* Select only required database fields.
* Paginate large datasets.

---

# Accessibility

Always:

* use semantic HTML
* provide aria labels where needed
* provide alt text for images
* ensure keyboard accessibility
* use proper button types

---

# Imports

Group imports in this order:

1. React / Next.js
2. Third-party packages
3. Internal modules
4. Types
5. Styles

Use project import aliases (`@/`) instead of long relative paths.

---

# Folder Structure

Follow the existing project structure.

Typical layout:

```
src/
├── app/
├── components/
├── features/
├── services/
├── repositories/
├── lib/
├── hooks/
├── middleware/
├── validations/
├── config/
├── utils/
├── constants/
├── types/
```

---

# Code Style

* Prefer early returns.
* Avoid nested conditionals.
* Keep functions under ~50 lines where practical.
* Extract reusable utilities.
* Remove dead code.
* Remove unused imports.
* Keep naming descriptive and consistent.

Examples:

```ts
getUserProfile()
createInvoice()
hasPermission
isAdmin
canDelete
```

## Testing

* Every new feature, module, service, utility, hook, and API route must include corresponding unit tests.
* Generate tests alongside the implementation unless explicitly instructed otherwise.
* Aim for a minimum of **80% overall test coverage**, with higher coverage for critical business logic.
* Test both success and failure scenarios, including edge cases and input validation.
* Mock external dependencies such as databases, third-party APIs, file systems, and network requests.
* Keep tests deterministic, isolated, and independent of external services.
* Prefer testing business logic over implementation details.
* Write descriptive test names that clearly state the expected behavior.
* Ensure all generated code passes the project's test suite before considering the task complete.

### Before Completing Any Task

Verify the following:

* All relevant unit tests have been added or updated.
* Existing tests continue to pass.
* New functionality is adequately covered by tests.
* Overall project test coverage remains at or above **80%**.